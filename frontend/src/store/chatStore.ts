import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ChatMessage } from '@/types';
import { DatabaseService } from '@/db/schema';
import { toast } from './appStore';

interface ChatStore {
  // State
  messages: ChatMessage[];
  isTyping: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  loadChatHistory: (accountId: string) => Promise<void>;
  sendMessage: (accountId: string, query: string) => Promise<void>;
  clearChatHistory: (accountId: string) => Promise<void>;
  clearError: () => void;
}

export const useChatStore = create<ChatStore>()(
  subscribeWithSelector((set) => ({
    // Initial state
    messages: [],
    isTyping: false,
    loading: false,
    error: null,

    // Actions
    loadChatHistory: async (accountId: string) => {
      set({ loading: true, error: null });

      try {
        // Load chat history from local database
        const messages = await DatabaseService.getChatHistory(accountId);
        set({ messages, loading: false });

      } catch (error) {
        console.error('Error loading chat history:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to load chat history',
          loading: false,
          messages: [] // Clear messages on error
        });
      }
    },

    sendMessage: async (accountId: string, query: string) => {
      if (!query.trim()) return;

      set({ isTyping: true, error: null });
      const startTime = Date.now();

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        accountId,
        query,
        response: '', // Will be filled by AI
        sources: [],
        timestamp: new Date().toISOString(),
        model: 'user',
        metadata: {
          responseTime: 0
        }
      };

      set((state) => ({
        messages: [...state.messages, userMessage]
      }));

      // Create placeholder AI message for streaming
      let aiMessageId = '';
      let fullResponse = '';

      try {
        const response = await fetch('/api/ai/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            query,
            stream: true  // Request streaming
          }),
        });

        if (!response.ok) {
          throw new Error(`AI query failed: ${response.statusText}`);
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let placeholderAdded = false;

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() && line.startsWith('data: '));

          for (const line of lines) {
            try {
              const data = JSON.parse(line.substring(6)); // Remove 'data: ' prefix

              if (data.type === 'start') {
                // Initialize AI message placeholder
                aiMessageId = data.id;
                const placeholderMessage: ChatMessage = {
                  id: aiMessageId,
                  accountId,
                  query,
                  response: '',
                  sources: [],
                  timestamp: new Date().toISOString(),
                  model: 'streaming...',
                  metadata: {
                    responseTime: 0
                  }
                };

                set((state) => ({
                  messages: [...state.messages, placeholderMessage]
                }));
                placeholderAdded = true;

              } else if (data.type === 'content') {
                // Append content chunk
                fullResponse += data.content;

                if (placeholderAdded) {
                  set((state) => {
                    const messages = [...state.messages];
                    const lastIndex = messages.length - 1;
                    if (messages[lastIndex]?.id === aiMessageId) {
                      messages[lastIndex] = {
                        ...messages[lastIndex],
                        response: fullResponse
                      };
                    }
                    return { messages };
                  });
                }

              } else if (data.type === 'done') {
                // Finalize message with metadata
                const responseTime = Date.now() - startTime;

                const finalMessage: ChatMessage = {
                  id: aiMessageId,
                  accountId,
                  query,
                  response: fullResponse,
                  sources: data.sources || [],
                  timestamp: new Date().toISOString(),
                  model: data.metadata.model,
                  metadata: {
                    responseTime,
                    confidence: data.metadata.confidence
                  }
                };

                set((state) => {
                  const messages = [...state.messages];
                  const lastIndex = messages.length - 1;
                  if (messages[lastIndex]?.id === aiMessageId) {
                    messages[lastIndex] = finalMessage;
                  }
                  return { messages, isTyping: false };
                });

                // Save to database
                await DatabaseService.saveChatMessage(finalMessage);

              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error('Error parsing SSE message:', e);
            }
          }
        }

      } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to send message';

        // Create error response
        const errorResponse: ChatMessage = {
          id: crypto.randomUUID(),
          accountId,
          query,
          response: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
          sources: [],
          timestamp: new Date().toISOString(),
          model: 'error',
          metadata: {
            responseTime: 0
          }
        };

        set((state) => ({
          messages: [...state.messages, errorResponse],
          isTyping: false,
          error: errorMessage
        }));

        toast.error('Failed to get AI response');
      }
    },

    clearChatHistory: async (accountId: string) => {
      try {
        // Clear from local database
        await DatabaseService.clearChatHistory(accountId);

        // Clear from API
        const response = await fetch(`/api/ai/chat/${accountId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          console.warn('Failed to clear chat history on server');
        }

        // Clear from store
        set({ messages: [] });

        toast.success('Chat history cleared');

      } catch (error) {
        console.error('Error clearing chat history:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to clear chat history';

        set({ error: errorMessage });
        toast.error(errorMessage);
      }
    },

    clearError: () => set({ error: null })
  }))
);

// Helper function to get chat statistics
export const getChatStats = (messages: ChatMessage[]) => {
  const totalMessages = messages.length;
  const averageResponseTime = messages.reduce((sum, msg) => sum + msg.metadata.responseTime, 0) / totalMessages;
  const modelBreakdown = messages.reduce((acc, msg) => {
    acc[msg.model] = (acc[msg.model] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalMessages,
    averageResponseTime,
    modelBreakdown
  };
};