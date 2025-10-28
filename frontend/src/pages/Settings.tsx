import { useState, useEffect } from 'react';
import { usePreferencesStore } from '@/store/preferencesStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Cog6ToothIcon } from '@/components/icons';
import { toast } from '@/store/appStore';

export default function Settings() {
  const { preferences, updatePreferences, resetPreferences, loading } = usePreferencesStore();
  const [localPreferences, setLocalPreferences] = useState(preferences);

  // Sync local state when store preferences change
  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  const handleSave = async () => {
    try {
      await updatePreferences(localPreferences);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      try {
        await resetPreferences();
        setLocalPreferences(preferences);
        toast.success('Settings reset to defaults');
      } catch (error) {
        toast.error('Failed to reset settings');
      }
    }
  };

  const hasChanges = JSON.stringify(localPreferences) !== JSON.stringify(preferences);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Configure your CS720 preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sync Settings */}
        <Card
          title="Sync Settings"
          subtitle="Configure data synchronization"
          icon={<Cog6ToothIcon className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Sync Frequency
              </label>
              <select
                value={localPreferences.sync.frequency}
                onChange={(e) => setLocalPreferences({
                  ...localPreferences,
                  sync: {
                    ...localPreferences.sync,
                    frequency: e.target.value as 'manual' | 'daily' | 'hourly'
                  }
                })}
                className="input w-full"
              >
                <option value="manual">Manual Only</option>
                <option value="daily">Daily</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Account Scope
              </label>
              <select
                value={localPreferences.sync.accountScope}
                onChange={(e) => setLocalPreferences({
                  ...localPreferences,
                  sync: {
                    ...localPreferences.sync,
                    accountScope: e.target.value as 'all' | 'selected'
                  }
                })}
                className="input w-full"
              >
                <option value="all">All Accounts</option>
                <option value="selected">Selected Accounts Only</option>
              </select>
            </div>
          </div>
        </Card>

        {/* AI Settings */}
        <Card
          title="AI Settings"
          subtitle="Configure AI advisor preferences"
          icon={<Cog6ToothIcon className="w-5 h-5" />}
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Preferred Backend
                </label>
                <select
                  value={localPreferences.ai.preferredModel}
                  onChange={(e) => setLocalPreferences({
                    ...localPreferences,
                    ai: {
                      ...localPreferences.ai,
                      preferredModel: e.target.value as 'ollama' | 'openai'
                    }
                  })}
                  className="input w-full"
                >
                  <option value="ollama">Local (Ollama)</option>
                  <option value="openai">Remote (NAI)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose between local Ollama or remote NAI inference
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  NAI Base URL
                </label>
                <input
                  type="url"
                  value={localPreferences.ai.naiBaseUrl || ''}
                  onChange={(e) => setLocalPreferences({
                    ...localPreferences,
                    ai: {
                      ...localPreferences.ai,
                      naiBaseUrl: e.target.value
                    }
                  })}
                  placeholder="https://api.novelai.net/v1"
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  OpenAI-compatible endpoint URL
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  NAI API Key
                </label>
                <input
                  type="password"
                  value={localPreferences.ai.naiApiKey || ''}
                  onChange={(e) => setLocalPreferences({
                    ...localPreferences,
                    ai: {
                      ...localPreferences.ai,
                      naiApiKey: e.target.value
                    }
                  })}
                  placeholder="sk-..."
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your NAI API key (stored locally)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  NAI Model
                </label>
                <input
                  type="text"
                  value={localPreferences.ai.naiModel || ''}
                  onChange={(e) => setLocalPreferences({
                    ...localPreferences,
                    ai: {
                      ...localPreferences.ai,
                      naiModel: e.target.value
                    }
                  })}
                  placeholder="kayra-v1"
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Model name for NAI inference
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Perplexity API Key
                </label>
                <input
                  type="password"
                  value={localPreferences.ai.perplexityApiKey || ''}
                  onChange={(e) => setLocalPreferences({
                    ...localPreferences,
                    ai: {
                      ...localPreferences.ai,
                      perplexityApiKey: e.target.value
                    }
                  })}
                  placeholder="pplx-..."
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For web search integration (optional)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Perplexity Model
                </label>
                <select
                  value={localPreferences.ai.perplexityModel || 'sonar'}
                  onChange={(e) => setLocalPreferences({
                    ...localPreferences,
                    ai: {
                      ...localPreferences.ai,
                      perplexityModel: e.target.value
                    }
                  })}
                  className="input w-full"
                >
                  <option value="sonar">Sonar (Lightweight, cost-effective)</option>
                  <option value="sonar-pro">Sonar Pro (Advanced search)</option>
                  <option value="sonar-reasoning">Sonar Reasoning (Fast reasoning)</option>
                  <option value="sonar-reasoning-pro">Sonar Reasoning Pro (DeepSeek-R1)</option>
                  <option value="sonar-deep-research">Sonar Deep Research (Comprehensive)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select Perplexity model for web search queries
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  System Prompt
                </label>
                <textarea
                  value={localPreferences.ai.systemPrompt || ''}
                  onChange={(e) => setLocalPreferences({
                    ...localPreferences,
                    ai: {
                      ...localPreferences.ai,
                      systemPrompt: e.target.value
                    }
                  })}
                  placeholder="You are an AI advisor for CS720..."
                  rows={6}
                  className="input w-full resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Custom system prompt for AI advisor
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="100"
                  max="8000"
                  value={localPreferences.ai.maxTokens}
                  onChange={(e) => setLocalPreferences({
                    ...localPreferences,
                    ai: {
                      ...localPreferences.ai,
                      maxTokens: parseInt(e.target.value)
                    }
                  })}
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum response length (100-8000 tokens)
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* UI Settings */}
        <Card
          title="UI Settings"
          subtitle="Customize the user interface"
          icon={<Cog6ToothIcon className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Theme
              </label>
              <select
                value={localPreferences.ui.theme}
                onChange={(e) => setLocalPreferences({
                  ...localPreferences,
                  ui: {
                    ...localPreferences.ui,
                    theme: e.target.value as 'dark' | 'light'
                  }
                })}
                className="input w-full"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="sidebarCollapsed"
                checked={localPreferences.ui.sidebarCollapsed}
                onChange={(e) => setLocalPreferences({
                  ...localPreferences,
                  ui: {
                    ...localPreferences.ui,
                    sidebarCollapsed: e.target.checked
                  }
                })}
                className="mr-3"
              />
              <label htmlFor="sidebarCollapsed" className="text-sm text-white">
                Collapse sidebar by default
              </label>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <Card title="Actions" subtitle="Manage your settings">
          <div className="space-y-4">
            <div className="flex space-x-3">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!hasChanges || loading}
                loading={loading}
              >
                Save Changes
              </Button>
              <Button
                variant="secondary"
                onClick={() => setLocalPreferences(preferences)}
                disabled={!hasChanges}
              >
                Reset Changes
              </Button>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <Button
                variant="danger"
                onClick={handleReset}
                disabled={loading}
              >
                Reset All to Defaults
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                This will reset all settings to their default values.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}