import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import type { UserPreferences } from '@/types';
import { DatabaseService } from '@/db/schema';
import { toast } from './appStore';

const DEFAULT_PREFERENCES: UserPreferences = {
  sync: {
    frequency: 'daily',
    accountScope: 'all'
  },
  ai: {
    preferredModel: 'ollama',
    maxTokens: 2048,
    naiBaseUrl: '',
    naiApiKey: '',
    naiModel: '',
    perplexityApiKey: '',
    perplexityModel: 'sonar',
    systemPrompt: 'You are an AI advisor for CS720, a customer intelligence platform for Sales Engineers. Help answer questions about customer accounts, priorities, and documentation.'
  },
  ui: {
    theme: 'dark',
    sidebarCollapsed: false
  }
};

interface PreferencesStore {
  // State
  preferences: UserPreferences;
  loading: boolean;
  error: string | null;

  // Actions
  loadPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  clearError: () => void;

  // Getters
  getTheme: () => 'dark' | 'light';
  getSyncFrequency: () => 'manual' | 'daily' | 'hourly';
  getAIModel: () => 'external' | 'local';
}

export const usePreferencesStore = create<PreferencesStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        preferences: DEFAULT_PREFERENCES,
        loading: false,
        error: null,

        // Actions
        loadPreferences: async () => {
          set({ loading: true, error: null });

          try {
            // Try to load from IndexedDB first
            const dbPreferences = await DatabaseService.getPreferences();

            if (dbPreferences) {
              // Merge with defaults to ensure all new fields are present
              const mergedPreferences: UserPreferences = {
                sync: { ...DEFAULT_PREFERENCES.sync, ...dbPreferences.sync },
                ai: { ...DEFAULT_PREFERENCES.ai, ...dbPreferences.ai },
                ui: { ...DEFAULT_PREFERENCES.ui, ...dbPreferences.ui }
              };
              set({ preferences: mergedPreferences, loading: false });
              return;
            }

            // Fallback to API
            const response = await fetch('/api/config/preferences');

            if (response.ok) {
              const data = await response.json();
              const loadedPreferences = data.preferences || DEFAULT_PREFERENCES;

              // Merge with defaults to ensure all new fields are present
              const mergedPreferences: UserPreferences = {
                sync: { ...DEFAULT_PREFERENCES.sync, ...loadedPreferences.sync },
                ai: { ...DEFAULT_PREFERENCES.ai, ...loadedPreferences.ai },
                ui: { ...DEFAULT_PREFERENCES.ui, ...loadedPreferences.ui }
              };

              set({ preferences: mergedPreferences, loading: false });

              // Save to IndexedDB for offline access
              await DatabaseService.savePreferences(mergedPreferences);
            } else {
              // Use defaults if API fails
              set({ preferences: DEFAULT_PREFERENCES, loading: false });
            }

          } catch (error) {
            console.error('Error loading preferences:', error);
            set({
              preferences: DEFAULT_PREFERENCES,
              loading: false,
              error: error instanceof Error ? error.message : 'Failed to load preferences'
            });
          }
        },

        updatePreferences: async (updates) => {
          const currentPreferences = get().preferences;

          // Merge updates with current preferences
          const updatedPreferences: UserPreferences = {
            sync: { ...currentPreferences.sync, ...updates.sync },
            ai: { ...currentPreferences.ai, ...updates.ai },
            ui: { ...currentPreferences.ui, ...updates.ui }
          };

          // Optimistically update local state
          set({ preferences: updatedPreferences, error: null });

          try {
            // Save to IndexedDB
            await DatabaseService.savePreferences(updatedPreferences);

            // Update API
            const response = await fetch('/api/config/preferences', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updatedPreferences),
            });

            if (!response.ok) {
              throw new Error(`Failed to update preferences: ${response.statusText}`);
            }

            // Apply theme changes immediately
            if (updates.ui?.theme) {
              applyTheme(updates.ui.theme);
            }

            toast.success('Preferences updated');

          } catch (error) {
            console.error('Error updating preferences:', error);

            // Revert optimistic update
            set({ preferences: currentPreferences });

            const errorMessage = error instanceof Error ? error.message : 'Failed to update preferences';
            set({ error: errorMessage });
            toast.error(errorMessage);
          }
        },

        resetPreferences: async () => {
          set({ loading: true, error: null });

          try {
            // Reset to defaults
            set({ preferences: DEFAULT_PREFERENCES });

            // Save to IndexedDB
            await DatabaseService.savePreferences(DEFAULT_PREFERENCES);

            // Reset on API
            const response = await fetch('/api/config/preferences/reset', {
              method: 'POST',
            });

            if (!response.ok) {
              console.warn('Failed to reset preferences on server');
            }

            // Apply default theme
            applyTheme(DEFAULT_PREFERENCES.ui.theme);

            set({ loading: false });
            toast.success('Preferences reset to defaults');

          } catch (error) {
            console.error('Error resetting preferences:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to reset preferences';

            set({
              loading: false,
              error: errorMessage
            });

            toast.error(errorMessage);
          }
        },

        clearError: () => set({ error: null }),

        // Getters
        getTheme: () => get().preferences.ui.theme,
        getSyncFrequency: () => get().preferences.sync.frequency,
        getAIModel: () => get().preferences.ai.preferredModel
      }),
      {
        name: 'cs720-preferences',
        partialize: (state) => ({ preferences: state.preferences })
      }
    )
  )
);

// Helper function to apply theme
function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Update meta theme color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#1F2937' : '#FFFFFF');
  }
}

// Subscribe to theme changes and apply them
usePreferencesStore.subscribe(
  (state) => state.preferences.ui.theme,
  (theme) => {
    applyTheme(theme);
  }
);

// Auto-load preferences when store is created
usePreferencesStore.getState().loadPreferences();

// Apply initial theme
applyTheme(usePreferencesStore.getState().preferences.ui.theme);