interface NewsContext {
  title: string;
  summary: string;
  source: string;
}

interface GroqMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GroqResponse {
  success: boolean;
  data?: string;
  error?: string;
}

class GroqService {
  sendMessage(
    messages: GroqMessage[],
    newsContext?: NewsContext | null,
    onStreamUpdate?: (text: string) => void
  ): Promise<GroqResponse>;
  
  getAvailableModels(): string[];
  setModel(modelId: string): void;
  cleanResponse(text: string): string;
  simulateTypewriter(text: string, onUpdate: (text: string) => void): Promise<void>;
}

declare const groqService: GroqService;
export default groqService;