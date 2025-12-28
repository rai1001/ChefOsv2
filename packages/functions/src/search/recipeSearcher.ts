import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { generateEmbedding } from '../utils/ai';
import { logError } from '../utils/logger';
import { checkRateLimit } from '../utils/rateLimiter';

interface SearchData {
  query: string;
}

export const searchRecipes = onCall(async (request: CallableRequest<SearchData>) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const query = request.data.query;
  if (!query) {
    throw new HttpsError('invalid-argument', "The function must be called with a 'query' string.");
  }

  await checkRateLimit(uid, 'search_recipes');

  const embedding = await generateEmbedding(query);
  if (!embedding) {
    throw new HttpsError('internal', 'Failed to generate embedding.');
  }

  try {
    const collection = admin.firestore().collection('recipes');

    const vectorQuery = collection.findNearest({
      vectorField: '_embedding',
      queryVector: embedding,
      limit: 10,
      distanceMeasure: 'COSINE',
    });

    const snapshot = await vectorQuery.get();

    const recipes = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { recipes };
  } catch (error: any) {
    logError('Vector Search Error:', error, { uid, query });
    throw new HttpsError('internal', 'Search failed.', error.message);
  }
});
