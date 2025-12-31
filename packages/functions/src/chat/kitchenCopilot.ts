import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';
import { generateEmbedding } from '../utils/ai';
import { allTools } from '../tools';
import { logInfo, logError, logWarn } from '../utils/logger';
import { checkRateLimit } from '../utils/rateLimiter';

interface ChatData {
  message: string;
  history?: any[];
}

export const chatWithCopilot = onCall(async (request: CallableRequest<ChatData>) => {
  const { message, history } = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  // 1. Rate Limiting
  await checkRateLimit(uid, 'chat_with_copilot');

  // 2. Input Validation
  if (!message || typeof message !== 'string') {
    throw new HttpsError('invalid-argument', 'Message is required and must be a string.');
  }

  if (message.length > 2000) {
    throw new HttpsError('invalid-argument', 'Message is too long (max 2000 characters).');
  }

  if (history && !Array.isArray(history)) {
    throw new HttpsError('invalid-argument', 'History must be an array.');
  }

  if (history && history.length > 50) {
    throw new HttpsError('invalid-argument', 'History is too long.');
  }

  // Basic sanitization
  const sanitizedMessage = message.trim().replace(/[<>]/g, '');

  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) {
    logError('GCLOUD_PROJECT not set.');
    throw new HttpsError('internal', 'Server configuration error.');
  }

  const vertexAI = new VertexAI({ project: projectId, location: 'europe-southwest1' });
  const model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // 3. Generate embedding & RAG Context
  const embedding = await generateEmbedding(sanitizedMessage);
  let contextData = '';

  if (embedding) {
    try {
      const db = admin.firestore();
      const collection = db.collection('recipes');
      const vectorQuery = collection.findNearest({
        vectorField: '_embedding',
        queryVector: embedding,
        limit: 3,
        distanceMeasure: 'COSINE',
      });
      const snapshot = await vectorQuery.get();
      const recipes = snapshot.docs.map((doc) => {
        const data = doc.data();
        return `Recipe: ${data.name}. Station: ${data.station}. Ingredients: ${data.ingredients?.length || 0}.`;
      });
      if (recipes.length > 0) {
        contextData = `\nContext from database:\n${recipes.join('\n')}\n`;
      }
    } catch (error) {
      logWarn('RAG Search failed.', { error });
    }
  }

  // 2. Prepare Tools definitions for Gemini
  const tools = [
    {
      function_declarations: allTools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    },
  ];

  const systemPrompt = `You are Kitchen Copilot. You can use tools to perform actions.
    If the user asks to create an issue, payment link, send message or email, USE THE TOOLS.
    Context: ${contextData}`;

  const chatHistory =
    history?.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })) || [];

  const chat = model.startChat({
    history: chatHistory,
    tools: tools as any, // Type cast if necessary depending on SDK version
  });

  try {
    const result = await chat.sendMessage(`${systemPrompt}\nUser: ${sanitizedMessage}`);
    const candidates = result.response.candidates;

    if (
      !candidates ||
      candidates.length === 0 ||
      !candidates[0]?.content?.parts ||
      candidates[0].content.parts.length === 0
    )
      return { response: 'No response from AI.' };

    const firstPart = candidates[0].content.parts[0];
    if (!firstPart) return { response: 'No response content.' }; // Redundant but satisfying TS

    // 3. Handle Function Call
    if (firstPart.functionCall) {
      const fnCall = firstPart.functionCall;
      const tool = allTools.find((t) => t.name === fnCall.name);

      if (tool) {
        try {
          logInfo(`Executing tool: ${tool.name}`, { uid });
          const toolResult = await tool.execute(fnCall.args);

          // Send result back to Gemini to get final natural language response
          const toolResponse = [
            {
              functionResponse: {
                name: tool.name,
                response: { result: toolResult },
              },
            },
          ];

          const finalResult = await chat.sendMessage(toolResponse as any);
          const finalResponseText = finalResult.response.candidates?.[0]?.content?.parts?.[0]?.text;
          return { response: finalResponseText || 'Action completed.' };
        } catch (err: any) {
          logError('Tool execution failed', err, { tool: tool.name, uid });
          return { response: `Error executing tool: ${err.message}` };
        }
      }
    }

    // Return text if no tool called
    return { response: firstPart.text || 'I processed your request.' };
  } catch (error: any) {
    logError('Chat Error:', error, { uid });
    throw new HttpsError('internal', 'Chat failed');
  }
});
