import * as functions from 'firebase-functions/v1';
import { VertexAI } from '@google-cloud/vertexai';
import { generateSocialManagerPrompt } from './prompts';

interface SocialManagerRequest {
  imageUrl: string;
  contentType: 'EVENTO' | 'INSTALACIONES' | 'PROMOCION' | 'GENERAL';
  businessType: 'HOTEL' | 'RESTAURANT';
  additionalContext?: string;
}

export const generateSocialContent = functions
  .region('europe-west1')
  .runWith({
    timeoutSeconds: 30,
    memory: '1GB',
    secrets: ['GCLOUD_PROJECT'],
  })
  .https.onCall(async (data: SocialManagerRequest, context: functions.https.CallableContext) => {
    // 1. Authentication Check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be logged in to use Social Manager Pro.'
      );
    }

    const { imageUrl, contentType, businessType, additionalContext } = data;

    // 2. Validation
    if (!imageUrl || !contentType || !businessType) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields (imageUrl, contentType, businessType).'
      );
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
      const prompt = generateSocialManagerPrompt(contentType, businessType, additionalContext);

      // 5. Generate Content with Image
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
        // Assuming base64 passed directly if not http
        // This assumes the client might pass base64 directly which is heavy,
        // but for now we stick to the plan of handling URLs.
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

      const parsedData = JSON.parse(jsonMatch[0]);

      return parsedData;
    } catch (error) {
      console.error('Social Manager Error:', error);
      throw new functions.https.HttpsError('internal', 'Failed to generate social content.', error);
    }
  });
