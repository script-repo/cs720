import { useState } from 'react';
import { usePreferencesStore } from '@/store/preferencesStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Cog6ToothIcon } from '@/components/icons';
import { toast } from '@/store/appStore';

export default function Settings() {
  const { preferences, updatePreferences, resetPreferences, loading } = usePreferencesStore();
  const [localPreferences, setLocalPreferences] = useState(preferences);

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
                    frequency: e.target.value as any
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
                    accountScope: e.target.value as any
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
          subtitle="Configure AI assistant preferences"
          icon={<Cog6ToothIcon className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Preferred Model
              </label>
              <select
                value={localPreferences.ai.preferredModel}
                onChange={(e) => setLocalPreferences({
                  ...localPreferences,
                  ai: {
                    ...localPreferences.ai,
                    preferredModel: e.target.value as any
                  }
                })}
                className="input w-full"
              >
                <option value="external">External (OpenAI)</option>
                <option value="local">Local (Ollama)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Max Tokens
              </label>
              <input
                type="number"
                min="100"
                max="4000"
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
                    theme: e.target.value as any
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