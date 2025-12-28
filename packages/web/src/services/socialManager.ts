import { functions } from '@/config/firebase';
import { httpsCallable } from 'firebase/functions';
import type { SocialContentType, GeneratedSocialContent } from '@/types/socialManager';

interface GenerateSocialContentRequest {
  imageUrl: string; // HTTP URL
  contentType: SocialContentType;
  businessType: 'HOTEL' | 'RESTAURANT';
  additionalContext?: string;
}

export const generateSocialContent = async (
  imageUrl: string,
  contentType: SocialContentType,
  businessType: 'HOTEL' | 'RESTAURANT',
  additionalContext?: string
): Promise<GeneratedSocialContent> => {
  try {
    const generateFn = httpsCallable<GenerateSocialContentRequest, GeneratedSocialContent>(
      functions,
      'generateSocialContent'
    );

    const result = await generateFn({
      imageUrl,
      contentType,
      businessType,
      additionalContext,
    });

    return result.data;
  } catch (error) {
    console.error('Error generating social content:', error);
    throw error;
  }
};
