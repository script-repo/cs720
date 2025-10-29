import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { PromptTemplate } from '@/types';
import { DatabaseService } from '@/db/schema';

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

interface PromptStore {
  // State
  templates: PromptTemplate[];
  loading: boolean;
  error: string | null;

  // Actions
  loadTemplates: () => Promise<void>;
  addTemplate: (name: string, command: string, prompt: string, description?: string) => Promise<void>;
  updateTemplate: (id: string, updates: Partial<Omit<PromptTemplate, 'id' | 'createdAt'>>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  getTemplateByCommand: (command: string) => PromptTemplate | undefined;
  searchTemplates: (query: string) => PromptTemplate[];
  clearError: () => void;
}

export const usePromptStore = create<PromptStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    templates: [],
    loading: false,
    error: null,

    // Actions
    loadTemplates: async () => {
      set({ loading: true, error: null });

      try {
        const templates = await DatabaseService.getPromptTemplates();
        set({ templates, loading: false });
      } catch (error) {
        console.error('Error loading prompt templates:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to load prompt templates',
          loading: false,
          templates: []
        });
      }
    },

    addTemplate: async (name: string, command: string, prompt: string, description?: string) => {
      set({ loading: true, error: null });

      try {
        // Validate command format (must start with /)
        if (!command.startsWith('/')) {
          throw new Error('Command must start with /');
        }

        // Check if command already exists
        const existing = await DatabaseService.getPromptTemplateByCommand(command);
        if (existing) {
          throw new Error(`Command ${command} already exists`);
        }

        const now = new Date().toISOString();
        const template: PromptTemplate = {
          id: generateUUID(),
          name,
          command,
          prompt,
          description,
          createdAt: now,
          updatedAt: now
        };

        await DatabaseService.savePromptTemplate(template);

        // Reload templates
        const templates = await DatabaseService.getPromptTemplates();
        set({ templates, loading: false });
      } catch (error) {
        console.error('Error adding prompt template:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to add prompt template',
          loading: false
        });
        throw error; // Re-throw to allow UI to handle
      }
    },

    updateTemplate: async (id: string, updates: Partial<Omit<PromptTemplate, 'id' | 'createdAt'>>) => {
      set({ loading: true, error: null });

      try {
        const existing = await DatabaseService.getPromptTemplate(id);
        if (!existing) {
          throw new Error('Template not found');
        }

        // If command is being updated, validate it
        if (updates.command) {
          if (!updates.command.startsWith('/')) {
            throw new Error('Command must start with /');
          }

          // Check if new command conflicts with another template
          const conflicting = await DatabaseService.getPromptTemplateByCommand(updates.command);
          if (conflicting && conflicting.id !== id) {
            throw new Error(`Command ${updates.command} already exists`);
          }
        }

        const updated: PromptTemplate = {
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString()
        };

        await DatabaseService.savePromptTemplate(updated);

        // Reload templates
        const templates = await DatabaseService.getPromptTemplates();
        set({ templates, loading: false });
      } catch (error) {
        console.error('Error updating prompt template:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to update prompt template',
          loading: false
        });
        throw error; // Re-throw to allow UI to handle
      }
    },

    deleteTemplate: async (id: string) => {
      set({ loading: true, error: null });

      try {
        await DatabaseService.deletePromptTemplate(id);

        // Reload templates
        const templates = await DatabaseService.getPromptTemplates();
        set({ templates, loading: false });
      } catch (error) {
        console.error('Error deleting prompt template:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to delete prompt template',
          loading: false
        });
        throw error; // Re-throw to allow UI to handle
      }
    },

    getTemplateByCommand: (command: string) => {
      const { templates } = get();
      return templates.find(t => t.command === command);
    },

    searchTemplates: (query: string) => {
      const { templates } = get();
      const lowercaseQuery = query.toLowerCase();

      return templates.filter(template =>
        template.name.toLowerCase().includes(lowercaseQuery) ||
        template.command.toLowerCase().includes(lowercaseQuery) ||
        template.description?.toLowerCase().includes(lowercaseQuery)
      );
    },

    clearError: () => {
      set({ error: null });
    }
  }))
);

// Auto-load templates when store is created
usePromptStore.getState().loadTemplates();
