export type SocialContentType = 'EVENTO' | 'INSTALACIONES' | 'PROMOCION' | 'GENERAL';

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'twitter';

export interface SocialAnalysis {
  visualElements: string[];
  detectedMoment: string;
  suggestedObjective: string;
}

export interface InstagramContent {
  copy: string;
  hashtags: string[];
  callToAction: string;
  suggestedTime: string;
}

export interface FacebookContent {
  copy: string;
  postType: 'POST' | 'EVENT' | 'OFFER';
  engagementQuestion: string;
  suggestedLink?: string;
}

export interface LinkedInContent {
  copy: string;
  hashtags: string[];
  corporateFocus: string;
}

export interface TwitterContent {
  copy: string;
  hashtags: string[];
}

export interface SocialContentMetadata {
  estimatedEngagement: 'HIGH' | 'MEDIUM' | 'LOW';
  bestPlatforms: SocialPlatform[];
  tipsForPosting: string[];
}

export interface GeneratedSocialContent {
  analysis: SocialAnalysis;
  instagram: InstagramContent;
  facebook: FacebookContent;
  linkedin?: LinkedInContent; // Optional, only for hotels
  twitter: TwitterContent;
  metadata: SocialContentMetadata;
}

export interface SocialManagerPost {
  id: string;
  userId: string;
  businessId: string;
  businessType: 'HOTEL' | 'RESTAURANT';
  contentType: SocialContentType;
  imageUrl: string;
  additionalContext?: string;
  generatedAt: any; // Firestore Timestamp
  data: GeneratedSocialContent;
  isPublished?: boolean;
}
