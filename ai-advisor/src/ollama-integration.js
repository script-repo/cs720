export class OllamaEngine {
  constructor() {
    this.isInitialized = false;
    this.isGenerating = false;
    this.ollamaUrl = 'http://localhost:11434';
    this.modelId = 'gemma3:270m'; // Ultra-fast 270M parameter model
    this.webSearchEnabled = false;
    this.onSearchCallback = null;
  }

  enableWebSearch(enabled = true, onSearchCallback = null) {
    this.webSearchEnabled = enabled;
    this.onSearchCallback = onSearchCallback;
  }

  async initialize(onProgress) {
    try {
      if (onProgress) {
        onProgress({ progress: 0, text: 'Connecting to Ollama...' });
      }

      // Check if Ollama is running and accessible
      const response = await fetch(`${this.ollamaUrl}/api/tags`);

      if (!response.ok) {
        throw new Error(`Ollama server returned status ${response.status}`);
      }

      const data = await response.json();

      if (onProgress) {
        onProgress({ progress: 0.5, text: 'Checking available models...' });
      }

      // Check if our model is available
      const models = data.models || [];
      const modelExists = models.some(m => m.name === this.modelId);

      if (!modelExists && models.length > 0) {
        // Use the first available model if our default doesn't exist
        this.modelId = models[0].name;
        console.log(`Model not found, using ${this.modelId} instead`);
      } else if (!modelExists && models.length === 0) {
        throw new Error(
          `No models found in Ollama. Please run "ollama pull ${this.modelId}" first.`
        );
      }

      if (onProgress) {
        onProgress({ progress: 1, text: 'Connected to Ollama' });
      }

      this.isInitialized = true;
      return { success: true, backend: 'ollama' };
    } catch (error) {
      console.error('Ollama initialization failed:', error);

      if (error.message.includes('fetch')) {
        throw new Error(
          'Cannot connect to Ollama. Make sure Ollama is running on http://localhost:11434'
        );
      }

      throw error;
    }
  }

  async chat(messages, onUpdate, onFinish, _searchResults = null, systemPrompt = null) {
    if (!this.isInitialized) {
      throw new Error('Engine not initialized');
    }

    if (this.isGenerating) {
      throw new Error('Already generating');
    }

    this.isGenerating = true;
    let fullResponse = '';

    try {
      // Prepare messages with system prompt
      let augmentedMessages = [];

      // Add system prompt at the beginning if provided
      if (systemPrompt) {
        augmentedMessages.push({
          role: 'system',
          content: systemPrompt
        });
      }

      // Add existing conversation history (search results are now embedded in user messages)
      augmentedMessages.push(...messages);

      const response = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelId,
          messages: augmentedMessages,
          stream: true,
          options: {
            temperature: 0.7,
            num_predict: 512,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API returned status ${response.status}`);
      }

      // Read the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });

        // Split by newlines as Ollama sends one JSON object per line
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const json = JSON.parse(line);

            // Extract the message content
            if (json.message && json.message.content) {
              fullResponse += json.message.content;

              if (onUpdate) {
                onUpdate(fullResponse);
              }
            }

            // Check if we're done
            if (json.done) {
              break;
            }
          } catch (parseError) {
            console.warn('Failed to parse chunk:', line, parseError);
          }
        }
      }

      if (onFinish) {
        onFinish(fullResponse);
      }

      return fullResponse;
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    } finally {
      this.isGenerating = false;
    }
  }

  async interruptGeneration() {
    // Ollama doesn't have a built-in interrupt mechanism
    // Setting the flag will prevent further updates
    this.isGenerating = false;
  }

  isReady() {
    return this.isInitialized && !this.isGenerating;
  }

  isBusy() {
    return this.isGenerating;
  }

  async resetChat() {
    // Ollama is stateless, no need to reset
  }

  getModelId() {
    return this.modelId;
  }

  setModelId(modelId) {
    this.modelId = modelId;
  }

  getBackend() {
    return 'Ollama (Local)';
  }

  getOllamaUrl() {
    return this.ollamaUrl;
  }

  setOllamaUrl(url) {
    this.ollamaUrl = url;
  }
}
