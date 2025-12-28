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
    timeoutSeconds: 120, // Increased to prevent timeout on image analysis
    memory: '1GB',
  })
  .https.onCall(async (data: SocialManagerRequest, context: functions.https.CallableContext) => {
    // Global Try/Catch to ensure we never return a raw 500
    try {
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

      const projectId = process.env.GCLOUD_PROJECT;
      if (!projectId) {
        console.error('GCLOUD_PROJECT missing');
        throw new functions.https.HttpsError(
          'internal',
          'Configuration error: GCLOUD_PROJECT missing'
        );
      }

      // 3. Initialize Vertex AI
      let vertexAI;
      let model;
      try {
        vertexAI = new VertexAI({ project: projectId, location: 'europe-west1' });
        model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      } catch (initError: any) {
        console.error('Vertex AI Initialization Failed:', initError);
        throw new functions.https.HttpsError(
          'internal',
          `Vertex AI Init Failed: ${initError.message}`
        );
      }

      // 4. Construct Prompt
      let prompt;
      try {
        prompt = generateSocialManagerPrompt(contentType, businessType, additionalContext);
      } catch (promptError: any) {
        console.error('Prompt Generation Failed:', promptError);
        throw new functions.https.HttpsError(
          'internal',
          `Prompt Generation Failed: ${promptError.message}`
        );
      }

      // 5. Generate Content with Image
      let contentParts: any[] = [{ text: prompt }];

      if (imageUrl.startsWith('http')) {
        try {
          // Fetch with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s download timeout

          const response = await fetch(imageUrl, { signal: controller.signal as any });
          clearTimeout(timeoutId);

          if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          contentParts.push({
            inlineData: {
              data: base64,
              mimeType: 'image/jpeg',
            },
          });
        } catch (fetchError: any) {
          console.error('Image Fetch Failed:', fetchError);
          throw new functions.https.HttpsError(
            'aborted',
            `Failed to download image: ${fetchError.message}`
          );
        }
      } else {
        throw new functions.https.HttpsError('invalid-argument', 'Image URL must be HTTP/HTTPS.');
      }

      try {
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
      } catch (aiError: any) {
        console.error('AI Generation Failed:', aiError);
        throw new functions.https.HttpsError(
          'internal',
          `AI Generation Failed: ${aiError.message}`
        );
      }
    } catch (globalError: any) {
      console.error('Unhandled Social Manager Error:', globalError);
      // Ensure we always return an HttpsError
      if (globalError instanceof functions.https.HttpsError) {
        throw globalError;
      }
      throw new functions.https.HttpsError('internal', `Unexpected Error: ${globalError.message}`);
    }
  });
