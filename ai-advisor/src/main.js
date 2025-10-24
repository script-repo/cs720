import { ChatUI } from './chat-ui.js';
import { OllamaEngine } from './ollama-integration.js';
import { OpenAIEngine } from './openai-integration.js';
import { WebSearch } from './web-search.js';

class CS720AIAdvisorApp {
  constructor() {
    this.ui = new ChatUI();
    this.engine = null;
    this.webSearch = new WebSearch();
    this.conversationHistory = [];
    this.webSearchEnabled = true; // Enable web search by default
    this.systemPrompt = this.loadSystemPrompt();
    this.inferenceBackend = this.loadInferenceBackend();

    // Auto-failover state
    this.preferredBackend = this.loadInferenceBackend(); // User's preferred backend
    this.currentBackend = null; // Currently active backend
    this.serviceHealth = {
      ollama: false,
      proxy: false,
      nai: false
    };

    this.init();
  }

  loadInferenceBackend() {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('inference_backend') || 'ollama';
    }
    return 'ollama';
  }

  saveInferenceBackend(backend) {
    this.inferenceBackend = backend;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('inference_backend', backend);
    }
  }

  loadInferenceConfig() {
    const config = {
      ollama: {
        url: 'http://localhost:11434'
      },
      openai: {
        endpoint: '',
        apiKey: '',
        model: 'gpt-4'
      }
    };

    if (typeof localStorage !== 'undefined') {
      config.ollama.url = localStorage.getItem('ollama_url') || 'http://localhost:11434';
      config.openai.endpoint = localStorage.getItem('openai_endpoint') || '';
      config.openai.apiKey = localStorage.getItem('openai_api_key') || '';
      config.openai.model = localStorage.getItem('openai_model') || 'gpt-4';
    }

    return config;
  }

  saveInferenceConfig(backend, config) {
    if (typeof localStorage !== 'undefined') {
      if (backend === 'ollama') {
        localStorage.setItem('ollama_url', config.url);
      } else if (backend === 'openai') {
        localStorage.setItem('openai_endpoint', config.endpoint);
        localStorage.setItem('openai_api_key', config.apiKey);
        localStorage.setItem('openai_model', config.model);
      }
    }
  }

  loadSystemPrompt() {
    const defaultPrompt = 'You are a helpful, knowledgeable AI assistant. Provide clear, accurate, and concise responses.';
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('system_prompt') || defaultPrompt;
    }
    return defaultPrompt;
  }

  saveSystemPrompt(prompt) {
    this.systemPrompt = prompt;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('system_prompt', prompt);
    }
  }

  getDefaultSystemPrompt() {
    return 'You are a helpful, knowledgeable AI assistant. Provide clear, accurate, and concise responses.';
  }

  async init() {
    // Set up UI callback
    this.ui.onSend = (message) => this.handleUserMessage(message);

    // Set up settings modal
    this.setupSettingsModal();

    // Set up service status indicators
    this.setupServiceStatusIndicators();

    // Initialize the Ollama engine
    await this.initializeEngine();

    // Start periodic health checks
    this.startHealthChecks();
  }

  setupServiceStatusIndicators() {
    this.ollamaStatusElement = document.getElementById('ollama-status');
    this.proxyStatusElement = document.getElementById('proxy-status');
    this.openaiStatusElement = document.getElementById('openai-status');
  }

  updateServiceStatus(service, status) {
    let element;
    let serviceName;

    if (service === 'ollama') {
      element = this.ollamaStatusElement;
      serviceName = 'Ollama';
    } else if (service === 'proxy') {
      element = this.proxyStatusElement;
      serviceName = 'Proxy Server';
    } else {
      element = this.openaiStatusElement;
      serviceName = 'NAI Endpoint';
    }

    // Remove all status classes
    element.classList.remove('available', 'unavailable', 'checking');

    // Add new status class
    element.classList.add(status);

    // Update tooltip
    if (status === 'available') {
      element.title = `${serviceName}: Available`;
    } else if (status === 'unavailable') {
      element.title = `${serviceName}: Unavailable`;
    } else {
      element.title = `${serviceName}: Checking...`;
    }
  }

  async checkOllamaHealth() {
    try {
      const config = this.loadInferenceConfig();
      const response = await fetch(`${config.ollama.url}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });

      if (response.ok) {
        this.updateServiceStatus('ollama', 'available');
        this.serviceHealth.ollama = true;
        return true;
      } else {
        this.updateServiceStatus('ollama', 'unavailable');
        this.serviceHealth.ollama = false;
        return false;
      }
    } catch (error) {
      this.updateServiceStatus('ollama', 'unavailable');
      this.serviceHealth.ollama = false;
      return false;
    }
  }

  async checkOpenAIHealth() {
    try {
      const config = this.loadInferenceConfig();

      // If no endpoint configured, mark as unavailable
      if (!config.openai.endpoint || !config.openai.apiKey) {
        this.updateServiceStatus('openai', 'unavailable');
        this.serviceHealth.nai = false;
        return false;
      }

      // Check the actual remote endpoint via proxy health check
      const response = await fetch('http://localhost:3002/health/remote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: config.openai.endpoint,
          apiKey: config.openai.apiKey,
          model: config.openai.model
        }),
        signal: AbortSignal.timeout(8000) // 8 second timeout for remote check (includes fallback)
      });

      if (response.ok) {
        const data = await response.json();

        if (data.status === 'available') {
          this.updateServiceStatus('openai', 'available');
          this.serviceHealth.nai = true;
          return true;
        } else {
          console.error('OpenAI endpoint unavailable:', data.message);
          this.updateServiceStatus('openai', 'unavailable');
          this.serviceHealth.nai = false;
          return false;
        }
      } else {
        this.updateServiceStatus('openai', 'unavailable');
        this.serviceHealth.nai = false;
        return false;
      }
    } catch (error) {
      console.error('OpenAI health check failed:', error);
      this.updateServiceStatus('openai', 'unavailable');
      this.serviceHealth.nai = false;
      return false;
    }
  }

  async checkProxyHealth() {
    try {
      const response = await fetch('http://localhost:3002/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });

      if (response.ok) {
        this.updateServiceStatus('proxy', 'available');
        this.serviceHealth.proxy = true;
        return true;
      } else {
        this.updateServiceStatus('proxy', 'unavailable');
        this.serviceHealth.proxy = false;
        return false;
      }
    } catch (error) {
      this.updateServiceStatus('proxy', 'unavailable');
      this.serviceHealth.proxy = false;
      return false;
    }
  }

  async performHealthChecks() {
    // Check all services in parallel
    await Promise.all([
      this.checkOllamaHealth(),
      this.checkProxyHealth(),
      this.checkOpenAIHealth()
    ]);

    // Check if failover/failback is needed
    this.checkFailoverStatus();
  }

  checkFailoverStatus() {
    const naiAvailable = this.serviceHealth.nai && this.serviceHealth.proxy;
    const ollamaAvailable = this.serviceHealth.ollama;

    // Determine the best backend to use
    let targetBackend = null;

    if (this.preferredBackend === 'openai' && naiAvailable) {
      // Preferred backend is NAI and it's available - use it
      targetBackend = 'openai';
    } else if (this.preferredBackend === 'openai' && !naiAvailable && ollamaAvailable) {
      // Preferred backend is NAI but it's unavailable - failover to Ollama
      targetBackend = 'ollama';
    } else if (this.preferredBackend === 'ollama' && ollamaAvailable) {
      // Preferred backend is Ollama and it's available - use it
      targetBackend = 'ollama';
    } else if (this.preferredBackend === 'ollama' && !ollamaAvailable && naiAvailable) {
      // Preferred backend is Ollama but it's unavailable - failover to NAI
      targetBackend = 'openai';
    }

    // If we have a target backend and it's different from current, switch
    if (targetBackend && targetBackend !== this.currentBackend) {
      this.performFailover(targetBackend);
    }
  }

  async performFailover(newBackend) {
    const oldBackend = this.currentBackend;
    console.log(`Performing ${oldBackend ? 'failover' : 'initialization'} from ${oldBackend || 'none'} to ${newBackend}`);

    // Update current backend
    this.currentBackend = newBackend;
    this.inferenceBackend = newBackend;

    // Reinitialize the engine with the new backend
    await this.initializeEngine();

    // Show notification to user
    if (oldBackend && oldBackend !== newBackend) {
      const backendName = newBackend === 'openai' ? 'NAI' : 'Ollama';
      const action = this.preferredBackend === newBackend ? 'Failback' : 'Failover';
      this.addSystemMessage(
        `⚠️ **${action} to ${backendName}**: Automatically switched inference backend.`
      );
    }
  }

  startHealthChecks() {
    // Initial check
    this.performHealthChecks();

    // Check every 10 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 10000);
  }

  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  setupSettingsModal() {
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');

    // Inference backend settings
    const inferenceBackendSelect = document.getElementById('inference-backend');
    const ollamaSettings = document.getElementById('ollama-settings');
    const openaiSettings = document.getElementById('openai-settings');
    const ollamaUrlInput = document.getElementById('ollama-url');
    const openaiEndpointInput = document.getElementById('openai-endpoint');
    const openaiApiKeyInput = document.getElementById('openai-api-key');
    const openaiModelInput = document.getElementById('openai-model');
    const saveInferenceSettings = document.getElementById('save-inference-settings');
    const inferenceSettingsStatus = document.getElementById('inference-settings-status');

    // Web search settings
    const saveApiKey = document.getElementById('save-api-key');
    const clearApiKey = document.getElementById('clear-api-key');
    const apiKeyInput = document.getElementById('perplexity-api-key');
    const apiKeyStatus = document.getElementById('api-key-status');

    // System prompt settings
    const systemPromptInput = document.getElementById('system-prompt');
    const saveSystemPrompt = document.getElementById('save-system-prompt');
    const resetSystemPrompt = document.getElementById('reset-system-prompt');
    const systemPromptStatus = document.getElementById('system-prompt-status');

    // Load current inference config
    const config = this.loadInferenceConfig();
    inferenceBackendSelect.value = this.inferenceBackend;
    ollamaUrlInput.value = config.ollama.url;
    openaiEndpointInput.value = config.openai.endpoint;
    openaiApiKeyInput.value = config.openai.apiKey;
    openaiModelInput.value = config.openai.model;

    // Show/hide settings based on backend
    const updateBackendSettings = () => {
      if (inferenceBackendSelect.value === 'ollama') {
        ollamaSettings.classList.remove('hidden');
        openaiSettings.classList.add('hidden');
      } else {
        ollamaSettings.classList.add('hidden');
        openaiSettings.classList.remove('hidden');
      }
    };
    updateBackendSettings();

    inferenceBackendSelect.addEventListener('change', updateBackendSettings);

    // Load existing API key
    if (this.webSearch.hasApiKey()) {
      apiKeyInput.value = this.webSearch.perplexityApiKey;
      apiKeyStatus.textContent = '✅ Web search enabled - Perplexity API connected';
      apiKeyStatus.style.color = '#10b981';
      console.log('Settings: API key loaded from localStorage');
    } else {
      apiKeyStatus.textContent = '⚠️ Web search disabled - API key required';
      apiKeyStatus.style.color = '#f59e0b';
      console.log('Settings: No API key found');
    }

    // Load existing system prompt
    systemPromptInput.value = this.systemPrompt;
    systemPromptStatus.textContent = `Current: ${this.systemPrompt.substring(0, 50)}...`;
    systemPromptStatus.style.color = '#9ca3af';

    // Open settings
    settingsButton.addEventListener('click', () => {
      settingsModal.classList.remove('hidden');
    });

    // Close settings
    closeSettings.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });

    // Close on backdrop click
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
      }
    });

    // Save inference settings
    saveInferenceSettings.addEventListener('click', async () => {
      const backend = inferenceBackendSelect.value;

      let config = {};
      if (backend === 'ollama') {
        config.url = ollamaUrlInput.value.trim() || 'http://localhost:11434';
      } else {
        config.endpoint = openaiEndpointInput.value.trim();
        config.apiKey = openaiApiKeyInput.value.trim();
        config.model = openaiModelInput.value.trim() || 'gpt-4';

        if (!config.endpoint || !config.apiKey) {
          inferenceSettingsStatus.textContent = '⚠ Endpoint and API key are required';
          inferenceSettingsStatus.style.color = '#f59e0b';
          return;
        }
      }

      this.saveInferenceBackend(backend);
      this.saveInferenceConfig(backend, config);

      inferenceSettingsStatus.textContent = '✓ Settings saved. Reconnecting...';
      inferenceSettingsStatus.style.color = '#10b981';

      // Reinitialize the engine
      await this.initializeEngine();
    });

    // Save API key
    saveApiKey.addEventListener('click', () => {
      const apiKey = apiKeyInput.value.trim();

      if (!apiKey) {
        apiKeyStatus.textContent = '⚠ Please enter an API key';
        apiKeyStatus.style.color = '#f59e0b';
        return;
      }

      this.webSearch.setApiKey(apiKey);
      apiKeyStatus.textContent = '✓ API key saved successfully';
      apiKeyStatus.style.color = '#10b981';
    });

    // Clear API key
    clearApiKey.addEventListener('click', () => {
      this.webSearch.setApiKey('');
      apiKeyInput.value = '';
      apiKeyStatus.textContent = '✓ API key cleared';
      apiKeyStatus.style.color = '#10b981';
    });

    // Save system prompt
    saveSystemPrompt.addEventListener('click', () => {
      const prompt = systemPromptInput.value.trim();

      if (!prompt) {
        systemPromptStatus.textContent = '⚠ System prompt cannot be empty';
        systemPromptStatus.style.color = '#f59e0b';
        return;
      }

      this.saveSystemPrompt(prompt);
      systemPromptStatus.textContent = '✓ System prompt saved successfully';
      systemPromptStatus.style.color = '#10b981';

      // Clear conversation history when system prompt changes
      this.conversationHistory = [];
      this.ui.clearMessages();
      this.addSystemMessage('System prompt updated. Conversation history cleared.');
    });

    // Reset system prompt
    resetSystemPrompt.addEventListener('click', () => {
      const defaultPrompt = this.getDefaultSystemPrompt();
      systemPromptInput.value = defaultPrompt;
      this.saveSystemPrompt(defaultPrompt);
      systemPromptStatus.textContent = '✓ Reset to default system prompt';
      systemPromptStatus.style.color = '#10b981';

      // Clear conversation history
      this.conversationHistory = [];
      this.ui.clearMessages();
      this.addSystemMessage('System prompt reset to default. Conversation history cleared.');
    });
  }

  async initializeEngine() {
    try {
      const config = this.loadInferenceConfig();

      if (this.inferenceBackend === 'ollama') {
        this.ui.setStatus('Connecting to Ollama...', true);
        this.engine = new OllamaEngine();
        this.engine.setOllamaUrl(config.ollama.url);

        await this.engine.initialize((progress) => {
          const percent = Math.round(progress.progress * 100);
          this.ui.setStatus(
            `${progress.text || 'Initializing...'} (${percent}%)`,
            true
          );
        });
      } else {
        this.ui.setStatus('Connecting to OpenAI-compatible API...', true);
        this.engine = new OpenAIEngine();

        await this.engine.initialize(
          (progress) => {
            const percent = Math.round(progress.progress * 100);
            this.ui.setStatus(
              `${progress.text || 'Initializing...'} (${percent}%)`,
              true
            );
          },
          config.openai.endpoint,
          config.openai.apiKey,
          config.openai.model
        );
      }

      const backend = this.engine.getBackend();
      const modelId = this.engine.getModelId();

      this.ui.setStatus(`Ready - ${modelId} [${backend}]`, false);
      this.ui.enableInput();

      const searchStatus = this.webSearch.hasApiKey()
        ? '✅ **Enabled** (Perplexity AI)'
        : '❌ **Disabled** - API key required';

      const privacyNote = this.inferenceBackend === 'ollama'
        ? 'Your conversations are private and stay on your machine.'
        : 'Your conversations are sent to the configured API endpoint.';

      this.addSystemMessage(
        `Welcome to CS720 AI Advisor! I'm running **${modelId}** using **${backend}**.\n\n🔍 **Web Search**: ${searchStatus}\n\n${!this.webSearch.hasApiKey() ? '💡 **To enable web search**: Click Settings (⚙️) and add your Perplexity API key.\nGet one free at https://www.perplexity.ai/settings/api\n\n' : ''}${privacyNote}`
      );
    } catch (error) {
      console.error('Engine initialization failed:', error);
      this.ui.setStatus(`Failed to connect to ${this.inferenceBackend}`, false);

      let errorHelp = '';
      if (this.inferenceBackend === 'ollama') {
        errorHelp = 'Please make sure:\n1. Ollama is installed (visit https://ollama.com)\n2. Ollama is running (check if http://localhost:11434 is accessible)\n3. You have at least one model installed (run "ollama pull llama3.2")';
      } else {
        errorHelp = 'Please make sure:\n1. The endpoint URL is correct\n2. Your API key is valid\n3. The endpoint is accessible from your browser';
      }

      this.addSystemMessage(
        `Failed to connect to ${this.inferenceBackend}.\n\n**Error:** ${error.message}\n\n${errorHelp}`
      );
    }
  }

  addSystemMessage(content) {
    const messageElement = this.ui.createMessageElement({
      role: 'assistant',
      content: content,
    });
    messageElement.style.opacity = '0.8';
    this.ui.messagesContainer.appendChild(messageElement);
    this.ui.scrollToBottom();
  }

  async handleUserMessage(message) {
    // Add user message to UI
    this.ui.addUserMessage(message);

    // Disable input while generating
    this.ui.disableInput();

    try {
      let searchResults = null;
      let userMessageContent = message;

      // Check if we should perform a web search
      if (this.webSearchEnabled && this.webSearch.shouldSearch(message)) {
        this.ui.setStatus('Searching the web...', true);

        try {
          const results = await this.webSearch.search(message, 5);

          // Show search indicator to user
          this.ui.addSearchIndicator(results.length, results);

          // Format results for the AI
          searchResults = this.webSearch.formatResultsForLLM(results);

          // Augment user message with search context - make it clear this is answering the question
          if (searchResults && searchResults.trim().length > 0) {
            userMessageContent = `Answer this question: ${message}${searchResults}`;
          }

          console.log('Search results found:', results);
          console.log('Formatted for AI:', searchResults);
        } catch (searchError) {
          console.error('Search error:', searchError);
          // Continue without search results
        }
      }

      // Add to conversation history AFTER search (with augmented content)
      this.conversationHistory.push({
        role: 'user',
        content: userMessageContent,
      });

      this.ui.setStatus('Generating...', true);

      // Start assistant message
      this.ui.startAssistantMessage();

      // Generate response with streaming
      await this.engine.chat(
        this.conversationHistory,
        (partialResponse) => {
          // Update UI with streaming response
          this.ui.updateAssistantMessage(partialResponse);
        },
        (fullResponse) => {
          // Add complete response to conversation history
          this.conversationHistory.push({
            role: 'assistant',
            content: fullResponse,
          });

          // Finish streaming
          this.ui.finishAssistantMessage();
          const backend = this.engine.getBackend();
          this.ui.setStatus(`Ready - ${this.engine.getModelId()} [${backend}]`, false);
          this.ui.enableInput();
        },
        null, // Don't pass search results separately anymore
        this.systemPrompt // Pass system prompt to the engine
      );
    } catch (error) {
      console.error('Chat error:', error);
      this.ui.finishAssistantMessage();
      this.ui.setStatus('Error occurred', false);
      this.ui.enableInput();

      this.addSystemMessage(
        `An error occurred: ${error.message}. Please try again.`
      );
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CS720AIAdvisorApp();
  });
} else {
  new CS720AIAdvisorApp();
}
