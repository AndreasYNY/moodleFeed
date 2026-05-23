export type AiProviderId = 'claude' | 'gemini' | 'chatgpt' | 'kimi' | 'deepseek' | 'perplexity';

export interface AiProvider {
  id: AiProviderId;
  name: string;
  url: string;
}

export const aiProviders: AiProvider[] = [
  { id: 'claude', name: 'Claude', url: 'https://claude.ai/new' },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app' },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/' },
  { id: 'kimi', name: 'Kimi', url: 'https://www.kimi.com/' },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com/' },
  { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai/' },
];

export function getAiProvider(id: AiProviderId | string | undefined) {
  return aiProviders.find((provider) => provider.id === id) ?? aiProviders[0];
}
