import * as functions from "firebase-functions";
import { VertexAI } from "@google-cloud/vertexai";

interface MenuGeneratorData {
  eventType: string;
  pax: number;
  season?: string;
  restrictions?: string[];
}

export const generateMenu = functions.https.onCall(async (data: MenuGeneratorData, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated.");
  }

  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) {
    throw new functions.https.HttpsError("failed-precondition", "Missing PROJECT_ID.");
  }

  const vertexAI = new VertexAI({ project: projectId, location: "europe-west1" });
  const model = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    Create a professional menu for a catering event.
    
    Event Details:
    - Type: ${data.eventType}
    - Guests: ${data.pax}
    - Season: ${data.season || "Current"}
    - Dietary Restrictions: ${data.restrictions?.join(", ") || "None"}
    
    Structure the response as a JSON object representing a Menu.
    Format:
    {
      "name": "Creative Menu Name",
      "description": "Short description of the theme",
      "dishes": [
        { "name": "Dish Name", "description": "Appealing description", "category": "Starter/Main/Dessert", "allergens": ["Gluten", "Dairy"] }
      ]
    }
    Ensure the dishes are sophisticated and suitable for the event type.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.candidates?.[0].content.parts[0].text;

    if (!text) throw new Error("No response from AI");

    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Menu Gen Error:", error);
    throw new functions.https.HttpsError("internal", "Menu generation failed", error);
  }
});
