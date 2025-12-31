import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { VertexAI } from '@google-cloud/vertexai';
import { generateSocialManagerPrompt } from './prompts';
import { logError } from './utils/logger';
import { checkRateLimit } from './utils/rateLimiter';

interface SocialManagerData {
  imageUrl: string;
  contentType: 'EVENTO' | 'INSTALACIONES' | 'PROMOCION' | 'GENERAL';
  businessType: 'HOTEL' | 'RESTAURANT';
  additionalContext?: string;
}

export const generateSocialContent = onCall<SocialManagerData>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in to use Social Manager Pro.');
  }

  try {
    await checkRateLimit(uid, 'generate_social_content');

    const { imageUrl, contentType, businessType, additionalContext } = request.data;

    // 2. Validation
    if (!imageUrl || !contentType || !businessType) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required fields (imageUrl, contentType, businessType).'
      );
    }

    const projectId = process.env.GCLOUD_PROJECT;
    if (!projectId) {
      logError('GCLOUD_PROJECT missing');
      throw new HttpsError('internal', 'Configuration error: GCLOUD_PROJECT missing');
    }

    // 3. Initialize Vertex AI
    const vertexAI = new VertexAI({ project: projectId, location: 'europe-southwest1' });
    const model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // 4. Construct Prompt
    const prompt = generateSocialManagerPrompt(contentType, businessType, additionalContext);

    // 5. Generate Content with Image
    let contentParts: any[] = [{ text: prompt }];

    if (imageUrl.startsWith('http')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        logError('Image Fetch Failed:', fetchError, { uid, imageUrl });
        throw new HttpsError('aborted', `Failed to download image: ${fetchError.message}`);
      }
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

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from AI response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error: any) {
    logError('Social Manager Error:', error, { uid });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Unexpected Error: ${error.message}`);
  }
});
