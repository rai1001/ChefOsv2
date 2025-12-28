import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { SocialChefResult } from '@/presentation/components/social-chef/SocialChefModal';

export const generateMarketingContent = async (
  recipeName: string,
  imageUrl: string,
  businessType: 'HOTEL' | 'RESTAURANT' = 'RESTAURANT'
): Promise<SocialChefResult> => {
  try {
    const generateFn = httpsCallable<any, SocialChefResult>(functions, 'generateMarketingContent');
    const result = await generateFn({ recipeName, imageUrl, businessType });
    return result.data;
  } catch (error) {
    console.error('Error generating marketing content:', error);
    throw error;
  }
};
