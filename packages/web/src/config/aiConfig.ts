export type AIProvider = 'gemini' | 'openai';

interface AIConfig {
  provider: AIProvider;
  openAIApiKey?: string;
  geminiModel: string;
  openAIModel: string;
}

const getProvider = (): AIProvider => {
  const envProvider = import.meta.env.VITE_AI_PROVIDER?.toLowerCase();
  if (envProvider === 'openai') return 'openai';
  return 'gemini'; // Default to gemini
};

export const aiConfig: AIConfig = {
  provider: getProvider(),
  openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY,
  geminiModel: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash',
  openAIModel: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o',
};

if (typeof window !== 'undefined') {
  console.log('[AI Config] Initialized:', {
    provider: aiConfig.provider,
    hasOpenAIApiKey: !!aiConfig.openAIApiKey,
    geminiModel: aiConfig.geminiModel,
    openAIModel: aiConfig.openAIModel,
  });
}
