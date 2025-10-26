import { create } from 'zustand';

export type ServiceStatus = 'available' | 'unavailable' | 'degraded' | 'checking';

interface ServiceHealth {
  status: ServiceStatus;
  latency?: number;
  lastCheck?: string;
  errorMessage?: string;
  errorCode?: string;
}

interface AIHealthStore {
  // State
  ollama: ServiceHealth;
  proxy: ServiceHealth;
  openai: ServiceHealth;
  web: ServiceHealth;
  isChecking: boolean;
  activeBackend: 'ollama' | 'openai'; // Which backend is currently active (handles failover/failback)

  // Actions
  checkHealth: () => Promise<void>;
  startHealthMonitoring: () => void;
  stopHealthMonitoring: () => void;
}

let healthCheckInterval: NodeJS.Timeout | null = null;

export const useAIHealthStore = create<AIHealthStore>((set, get) => ({
  // Initial state
  ollama: { status: 'checking' },
  proxy: { status: 'checking' },
  openai: { status: 'checking' },
  web: { status: 'checking' },
  isChecking: false,
  activeBackend: 'ollama', // Default to ollama

  // Check health of all AI services
  checkHealth: async () => {
    set({ isChecking: true });

    const results: {
      ollama: ServiceHealth;
      proxy: ServiceHealth;
      openai: ServiceHealth;
      web: ServiceHealth;
    } = {
      ollama: { status: 'unavailable' as ServiceStatus, lastCheck: new Date().toISOString() },
      proxy: { status: 'unavailable' as ServiceStatus, lastCheck: new Date().toISOString() },
      openai: { status: 'unavailable' as ServiceStatus, lastCheck: new Date().toISOString() },
      web: { status: 'unavailable' as ServiceStatus, lastCheck: new Date().toISOString() },
    };

    let activeBackend: 'ollama' | 'openai' = 'ollama';

    try {
      // 1. Check AI Service health (which checks Ollama)
      try {
        const aiResponse = await fetch('http://localhost:3003/health');
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const backends = aiData.data?.backends;

          if (backends?.ollama) {
            results.ollama = {
              status: backends.ollama.available ? 'available' : 'unavailable',
              latency: backends.ollama.latency,
              lastCheck: new Date().toISOString(),
            };
          }
        }
      } catch (error) {
        console.error('AI Service health check failed:', error);
      }

      // 2. Check Proxy Service directly
      try {
        const proxyStart = Date.now();
        const proxyResponse = await fetch('http://localhost:3002/health');
        if (proxyResponse.ok) {
          const proxyLatency = Date.now() - proxyStart;
          results.proxy = {
            status: 'available',
            latency: proxyLatency,
            lastCheck: new Date().toISOString(),
          };
        }
      } catch (error) {
        console.error('Proxy health check failed:', error);
      }

      // 3. Check NAI endpoint availability (requires configuration)
      // We check this through the backend API which has the NAI config
      try {
        const naiResponse = await fetch('/api/ai/health');
        if (naiResponse.ok) {
          const naiData = await naiResponse.json();

          // Get the active backend (which one is actually being used, accounting for failover)
          if (naiData.activeBackend) {
            activeBackend = naiData.activeBackend;
          }

          // Backend should return NAI endpoint status
          if (naiData.nai || naiData.openai || naiData.remote) {
            const naiStatus = naiData.nai || naiData.openai || naiData.remote;

            // Determine status: available, degraded, or unavailable
            let status: ServiceStatus = 'unavailable';
            if (naiStatus.available) {
              status = naiStatus.degraded ? 'degraded' : 'available';
            }

            results.openai = {
              status,
              latency: naiStatus.latency,
              lastCheck: new Date().toISOString(),
              errorMessage: naiStatus.errorMessage,
              errorCode: naiStatus.errorCode,
            };
          }
        }
      } catch (error) {
        console.error('NAI health check failed:', error);
      }

      // 4. Check Web (Perplexity API) - verify if API key is configured
      try {
        const preferencesResponse = await fetch('/api/config/preferences');
        if (preferencesResponse.ok) {
          const preferencesData = await preferencesResponse.json();
          const perplexityApiKey = preferencesData.preferences?.ai?.perplexityApiKey;

          // Web is "available" if Perplexity API key is configured
          results.web = {
            status: perplexityApiKey && perplexityApiKey.trim() !== '' ? 'available' : 'unavailable',
            lastCheck: new Date().toISOString(),
          };
        }
      } catch (error) {
        console.error('Web health check failed:', error);
      }

      set({
        ...results,
        activeBackend, // Update which backend is currently active
        isChecking: false,
      });
    } catch (error) {
      console.error('Health check error:', error);
      set({
        ...results,
        activeBackend, // Keep previous activeBackend on error
        isChecking: false,
      });
    }
  },

  // Start monitoring (check every 3 seconds)
  startHealthMonitoring: () => {
    const { checkHealth } = get();

    // Initial check
    checkHealth();

    // Stop any existing interval
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }

    // Check every 3 seconds for faster active backend updates
    healthCheckInterval = setInterval(() => {
      checkHealth();
    }, 3000);
  },

  // Stop monitoring
  stopHealthMonitoring: () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }
  },
}));
