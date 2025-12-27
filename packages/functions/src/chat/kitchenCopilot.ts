import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { VertexAI } from "@google-cloud/vertexai";
import { generateEmbedding } from "../utils/ai";
import { allTools } from "../tools";

export const chatWithCopilot = functions.https.onCall(async (data) => {
    const { message, history } = data;

    if (!message) {
        throw new functions.https.HttpsError("invalid-argument", "Message is required.");
    }

    const projectId = process.env.GCLOUD_PROJECT;
    if (!projectId) {
        throw new functions.https.HttpsError("internal", "GCLOUD_PROJECT not set.");
    }

    const vertexAI = new VertexAI({ project: projectId, location: "europe-west1" });
    const model = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // 1. Generate embedding & RAG Context
    const embedding = await generateEmbedding(message);
    let contextData = "";

    if (embedding) {
        try {
            const db = admin.firestore();
            const collection = db.collection("recipes");
            const vectorQuery = collection.findNearest({
                vectorField: "_embedding",
                queryVector: embedding,
                limit: 3,
                distanceMeasure: "COSINE"
            });
            const snapshot = await vectorQuery.get();
            const recipes = snapshot.docs.map(doc => {
                const data = doc.data();
                return `Recipe: ${data.name}. Station: ${data.station}. Ingredients: ${data.ingredients?.length || 0}.`;
            });
            if (recipes.length > 0) {
                contextData = `\nContext from database:\n${recipes.join('\n')}\n`;
            }
        } catch (error) {
            console.warn("RAG Search failed.", error);
        }
    }

    // 2. Prepare Tools definitions for Gemini
    const tools = [{
        function_declarations: allTools.map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters
        }))
    }];

    const systemPrompt = `You are Kitchen Copilot. You can use tools to perform actions.
    If the user asks to create an issue, payment link, send message or email, USE THE TOOLS.
    Context: ${contextData}`;

    const chatHistory = history.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
        history: chatHistory,
        tools: tools as any // Type cast if necessary depending on SDK version
    });

    try {
        const result = await chat.sendMessage(`${systemPrompt}\nUser: ${message}`);
        const candidates = result.response.candidates;

        if (!candidates || candidates.length === 0) return { response: "No response from AI." };

        const firstPart = candidates[0].content.parts[0];

        // 3. Handle Function Call
        if (firstPart.functionCall) {
            const fnCall = firstPart.functionCall;
            const tool = allTools.find(t => t.name === fnCall.name);

            if (tool) {
                try {
                    console.log(`Executing tool: ${tool.name}`);
                    const toolResult = await tool.execute(fnCall.args);

                    // Send result back to Gemini to get final natural language response
                    const toolResponse = [{
                        functionResponse: {
                            name: tool.name,
                            response: { result: toolResult }
                        }
                    }];

                    const finalResult = await chat.sendMessage(toolResponse as any);
                    const finalResponseText = finalResult.response.candidates?.[0].content.parts[0].text;
                    return { response: finalResponseText };

                } catch (err: any) {
                    return { response: `Tool execution failed: ${err.message}` };
                }
            }
        }

        // Return text if no tool called
        return { response: firstPart.text };

    } catch (error: any) {
        console.error("Chat Error:", error);
        throw new functions.https.HttpsError("internal", `Failed: ${error.message}`, error);
    }
});
