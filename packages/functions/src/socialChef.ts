import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { VertexAI } from '@google-cloud/vertexai';
import { generateSocialChefPrompt } from './prompts';
import { logError } from './utils/logger';
import { checkRateLimit } from './utils/rateLimiter';

interface SocialChefData {
  recipeName: string;
  imageUrl: string;
  businessType: 'HOTEL' | 'RESTAURANT';
}

interface SocialChefResponse {
  copy: string;
  hashtags: string[];
  suggestedTime: string;
}

export const generateMarketingContent = onCall<SocialChefData>(async (request) => {
  // 1. Auth Check & Rate Limiting
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in to use Social Chef.');
  }
  await checkRateLimit(uid, 'generate_marketing_content');

  const { recipeName, imageUrl, businessType } = request.data;

  // 2. Validation
  if (!recipeName || !imageUrl) {
    throw new HttpsError('invalid-argument', 'Missing recipe name or image URL.');
  }

  try {
    const projectId = process.env.GCLOUD_PROJECT;
    if (!projectId) {
      throw new Error('GCLOUD_PROJECT not set');
    }

    // 3. Initialize Vertex AI
    const vertexAI = new VertexAI({ project: projectId, location: 'europe-west1' });
    const model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // 4. Construct Prompt
    const prompt = generateSocialChefPrompt(recipeName, businessType);

    let contentParts: any[] = [{ text: prompt }];

    if (imageUrl.startsWith('http')) {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      contentParts.push({
        inlineData: {
          data: base64,
          mimeType: 'image/jpeg',
        },
      });
    } else {
      throw new HttpsError('invalid-argument', 'Image URL must be HTTP/HTTPS.');
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: contentParts }],
    });

    const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('Empty response from AI');
    }

    // 6. Parse JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from AI response');
    }

    const parsedData = JSON.parse(jsonMatch[0]) as SocialChefResponse;

    return parsedData;
  } catch (error: any) {
    logError('Social Chef Error:', error, { uid, recipeName });
    throw new HttpsError('internal', 'Failed to generate content.', error.message);
  }
});
