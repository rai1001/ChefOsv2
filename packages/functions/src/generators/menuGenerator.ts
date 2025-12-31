import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { VertexAI } from '@google-cloud/vertexai';
import { logError } from '../utils/logger';
import { checkRateLimit } from '../utils/rateLimiter';

interface MenuGeneratorData {
  eventType: string;
  pax: number;
  season?: string;
  restrictions?: string[];
}

export const generateMenu = onCall(async (request: CallableRequest<MenuGeneratorData>) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Must be authenticated.');
  }

  await checkRateLimit(uid, 'generate_menu');

  const data = request.data;
  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) {
    logError('GCLOUD_PROJECT not set.');
    throw new HttpsError('internal', 'Server configuration error.');
  }

  const vertexAI = new VertexAI({ project: projectId, location: 'europe-southwest1' });
  const model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
    Create a professional menu for a catering event.
    
    Event Details:
    - Type: ${data.eventType}
    - Guests: ${data.pax}
    - Season: ${data.season || 'Current'}
    - Dietary Restrictions: ${data.restrictions?.join(', ') || 'None'}
    
    Structure the response as a JSON object representing a Menu.
    Format:
    {
      "name": "Creative Menu Name",
      "description": "Short description of the theme",
      "dishes": [
        { "name": "Dish Name", "description": "Appealing description", "category": "Starter/Main/Dessert", "allergens": ["Gluten", "Dairy"] }
      ]
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error('No response from AI');

    text = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(text);
  } catch (error: any) {
    logError('Menu Gen Error:', error, { uid, eventType: data.eventType });
    throw new HttpsError('internal', 'Menu generation failed');
  }
});
