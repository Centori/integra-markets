import { useState, useCallback } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

type AIResponse = {
  message: string;
  error?: string;
};

export const useAIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data: AIResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const editMessage = useCallback((index: number, newContent: string) => {
    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[index] = {
        ...newMessages[index],
        content: newContent,
      };
      return newMessages;
    });
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    editMessage,
  };
};