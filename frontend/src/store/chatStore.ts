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
        console.log('[ChatStore] Calling API endpoint: /api/ai/query');
        // Use simple non-streaming API call
        const response = await fetch('/api/ai/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            query,
            stream: false
          }),
        });

        console.log('[ChatStore] Response status:', response.status);

        if (!response.ok) {
          throw new Error(`AI query failed: ${response.statusText}`);
        }

        const result = await response.json();
        const responseTime = Date.now() - startTime;

        console.log('[ChatStore] API result:', result);

        // Create AI response message
        const aiMessage: ChatMessage = {
          id: result.id || generateUUID(),
          accountId,
          query,
          response: result.content,
          sources: result.sources || [],
          timestamp: new Date().toISOString(),
          model: result.metadata?.model || 'unknown',
          metadata: {
            responseTime: result.metadata?.responseTime || responseTime
          }
        };

        console.log('[ChatStore] Adding AI message to state');
        set((state) => ({
          messages: [...state.messages, aiMessage],
          isTyping: false
        }));

        // Save to database
        console.log('[ChatStore] Saving to database');
        await DatabaseService.saveChatMessage(aiMessage);
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