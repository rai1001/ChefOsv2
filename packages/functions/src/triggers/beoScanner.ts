import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { VertexAI } from "@google-cloud/vertexai";

export const scanBEO = functions.storage.object().onFinalize(async (object) => {
    // 1. Validation
    const filePath = object.name; // e.g., "uploads/beo/file.pdf"
    const contentType = object.contentType; // e.g., "application/pdf"

    if (!filePath || !filePath.startsWith("uploads/beo/")) {
        console.log("File is not in uploads/beo/. Ignoring.");
        return null;
    }

    if (contentType !== "application/pdf") {
        console.log("File is not a PDF. Ignoring.");
        return null;
    }

    const bucketName = object.bucket;
    const gcsUri = `gs://${bucketName}/${filePath}`;

    console.log(`Processing BEO: ${gcsUri}`);

    try {
        const db = admin.firestore();
        const projectId = process.env.GCLOUD_PROJECT || "culinaryos-6794e";
        const location = "us-central1"; // Consistent location

        // 2. Initialize Vertex AI
        const vertexAI = new VertexAI({ project: projectId, location });
        const model = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // 3. Construct Prompt
        const prompt = `
            You are an Event Planner Assistant for a Hotel/Restaurant.
            Analyze this BEO (Banquet Event Order) PDF document.
            Extract the following details as strictly valid JSON:
            
            - title: The name of the event (e.g., "Wedding Garcia-Smith", "Corporate Lunch IBM").
            - date: The date of the event in ISO format YYYY-MM-DD.
            - pax: The number of people/guests (integer).
            - type: The type of event (guess from: 'Comida', 'Cena', 'Empresa', 'Coctel', 'Boda', 'Otros').
            - notes: Any special notes, allergies, or timing details found.
            - menuName: The name of the menu if found.
            - dishes: An array of strings describing the courses/dishes.

            Important:
            - If date is ambiguous, try to infer current year/next year or leave null.
            - Provide dates in YYYY-MM-DD.
            
            JSON Output Format:
            {
                "title": "string",
                "date": "YYYY-MM-DD",
                "pax": number,
                "type": "string",
                "notes": "string",
                "menuName": "string",
                "dishes": ["string", "string"]
            }
        `;

        // 4. Send to Gemini (Multimodal)
        const part = {
            fileData: {
                mimeType: "application/pdf",
                fileUri: gcsUri
            }
        };

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [part as any, { text: prompt }] }]
        });

        const responseText = result.response.candidates?.[0].content.parts[0].text;

        if (!responseText) {
            throw new Error("Empty response from AI");
        }

        // Clean JSON
        const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const eventData = JSON.parse(jsonString);

        // 5. Save to Firestore as Draft
        // We need a userId ideally, but this is a background trigger. 
        // We'll create it as a system draft or try to extract metadata if we set custom metadata on upload.
        // For now, we'll mark it as source: 'BEO_SCANNER'.

        const newEvent = {
            name: eventData.title || "Unofficial Event",
            date: eventData.date || new Date().toISOString().split('T')[0],
            pax: eventData.pax || 0,
            type: eventData.type || 'Otros',
            notes: `[AI Extracted]\n${eventData.notes || ''}\nMenu: ${eventData.menuName || 'N/A'}`,
            status: 'draft',
            ai_detected_ingredients: eventData.dishes || [], // Storing dishes here as requested in prompt "ai_detected_ingredients" although they are dishes
            source: 'BEO_SCANNER',
            createdAt: new Date().toISOString(),
            originalFile: gcsUri
        };

        await db.collection("events").add(newEvent);

        console.log("Event created successfully:", newEvent);
        return { success: true };

    } catch (error) {
        console.error("Error processing BEO:", error);
        return { error: error };
    }
});
