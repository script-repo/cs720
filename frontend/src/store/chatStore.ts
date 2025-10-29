import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ChatMessage } from '@/types';
import { DatabaseService } from '@/db/schema';
import { toast } from './appStore';

// Fallback UUID generator for browsers that don't support crypto.randomUUID
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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

      console.log('[ChatStore] Starting sendMessage:', { accountId, query });

      set({ isTyping: true, error: null });
      const startTime = Date.now();

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: generateUUID(),
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

      console.log('[ChatStore] Adding user message to state');
      set((state) => ({
        messages: [...state.messages, userMessage]
      }));

      try {
        console.log('[ChatStore] Calling API endpoint: /api/ai/query with streaming');

        // Create AI message placeholder that we'll update as stream arrives
        const aiMessageId = generateUUID();
        const aiMessage: ChatMessage = {
          id: aiMessageId,
          accountId,
          query,
          response: '',  // Will be filled by stream
          sources: [],
          timestamp: new Date().toISOString(),
          model: 'streaming...',
          metadata: {
            responseTime: 0
          }
        };

        // Add AI message placeholder to state
        console.log('[ChatStore] Adding AI message placeholder');
        set((state) => ({
          messages: [...state.messages, aiMessage]
        }));

        // Use streaming API call
        const response = await fetch('/api/ai/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            query,
            stream: true
          }),
        });

        console.log('[ChatStore] Response status:', response.status);

        if (!response.ok) {
          throw new Error(`AI query failed: ${response.statusText}`);
        }

        // Handle SSE streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let buffer = '';
        let sources: any[] = [];
        let metadata: any = {};

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE messages from buffer
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || ''; // Keep incomplete message in buffer

            for (const message of lines) {
              if (!message.trim()) continue;

              // Parse SSE format: "data: {...}"
              const dataMatch = message.match(/^data: (.+)$/m);
              if (!dataMatch) continue;

              try {
                const data = JSON.parse(dataMatch[1]);

                if (data.type === 'start') {
                  console.log('[ChatStore] Stream started:', data.id);
                } else if (data.type === 'content') {
                  fullResponse += data.content;

                  // Update message in state with accumulated response
                  set((state) => ({
                    messages: state.messages.map(msg =>
                      msg.id === aiMessageId
                        ? { ...msg, response: fullResponse }
                        : msg
                    )
                  }));
                } else if (data.type === 'done') {
                  console.log('[ChatStore] Stream completed');
                  sources = data.sources || [];
                  metadata = data.metadata || {};
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (e) {
                console.warn('[ChatStore] Failed to parse SSE message:', message, e);
              }
            }
          }
        }

        console.log('[ChatStore] Streaming completed');

        // Update final message with complete response and metadata from stream
        const finalMessage: ChatMessage = {
          ...aiMessage,
          response: fullResponse,
          sources: sources,
          model: metadata.model || 'ollama',
          metadata: {
            responseTime: metadata.responseTime || (Date.now() - startTime),
            confidence: metadata.confidence
          }
        };

        set((state) => ({
          messages: state.messages.map(msg =>
            msg.id === aiMessageId ? finalMessage : msg
          ),
          isTyping: false
        }));

        // Save to database
        console.log('[ChatStore] Saving to database');
        await DatabaseService.saveChatMessage(finalMessage);
        console.log('[ChatStore] Message saved successfully');

      } catch (error) {
        console.error('[ChatStore] Error sending message:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to send message';

        // Create error response
        const errorResponse: ChatMessage = {
          id: generateUUID(),
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