import * as functions from 'firebase-functions/v1';
import { VertexAI } from '@google-cloud/vertexai';
import { generateSocialChefPrompt } from './prompts';

interface SocialChefRequest {
  recipeName: string;
  imageUrl: string;
  businessType: 'HOTEL' | 'RESTAURANT';
}

interface SocialChefResponse {
  copy: string;
  hashtags: string[];
  suggestedTime: string;
}

export const generateMarketingContent = functions
  .region('europe-west1')
  .runWith({
    timeoutSeconds: 60,
    memory: '1GB',
  })
  .https.onCall(async (data: SocialChefRequest, context: functions.https.CallableContext) => {
    // 1. Authentication Check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be logged in to use Social Chef.'
      );
    }

    const { recipeName, imageUrl, businessType } = data;

    // 2. Validation
    if (!recipeName || !imageUrl) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing recipe name or image URL.');
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
      // 4. Construct Prompt
      const prompt = generateSocialChefPrompt(recipeName, businessType);

      // NOTE: Vertex AI needs GCS URI or base64.
      // If imageUrl is a public URL, we might need to fetch it and convert to base64 or pass as is if supported.
      // However, for typical firebase storage URLs (gs://), fileUri works?
      // If it's an HTTP URL, we need to download and base64 encode it.
      // Let's assume for now we handle http urls by downloading.

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
        // Fallback for gs:// or other formats if needed, or error
        // But the prompt said "Validar que la imagen URL sea accesible"
        throw new functions.https.HttpsError('invalid-argument', 'Image URL must be HTTP/HTTPS.');
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
    } catch (error) {
      console.error('Social Chef Error:', error);
      throw new functions.https.HttpsError('internal', 'Failed to generate content.', error);
    }
  });
