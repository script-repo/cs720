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
        const messages = await DatabaseService.getChatHistory(accountId);
        set({ messages, loading: false });

      } catch (error) {
        console.error('Error loading chat history:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to load chat history',
          loading: false
        });
      }
    },

    sendMessage: async (accountId: string, query: string) => {
      if (!query.trim()) return;

      set({ isTyping: true, error: null });

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

      try {
        const response = await fetch('/api/ai/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            query
          }),
        });

        if (!response.ok) {
          throw new Error(`AI query failed: ${response.statusText}`);
        }

        const result = await response.json();

        // Create AI response message
        const aiMessage: ChatMessage = {
          id: result.id,
          accountId,
          query,
          response: result.content,
          sources: result.sources || [],
          timestamp: new Date().toISOString(),
          model: result.metadata.model,
          metadata: {
            responseTime: result.metadata.responseTime,
            confidence: result.metadata.confidence
          }
        };

        // Update messages - replace user message with AI response
        set((state) => ({
          messages: [...state.messages.slice(0, -1), aiMessage],
          isTyping: false
        }));

        // Save to database
        await DatabaseService.saveChatMessage(aiMessage);

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
          messages: [...state.messages.slice(0, -1), errorResponse],
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