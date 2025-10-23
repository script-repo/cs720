export class OpenAIEngine {
  constructor() {
    this.isInitialized = false;
    this.isGenerating = false;
    this.endpoint = null;
    this.apiKey = null;
    this.modelId = 'gpt-4';
    this.useProxy = true; // Use proxy by default to avoid CORS issues
    this.proxyUrl = 'http://localhost:3001/proxy';
  }

  async initialize(onProgress, endpoint, apiKey, modelId) {
    try {
      if (onProgress) {
        onProgress({ progress: 0, text: 'Connecting to OpenAI-compatible API...' });
      }

      if (!endpoint || !apiKey) {
        throw new Error('OpenAI endpoint and API key are required');
      }

      this.endpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
      this.apiKey = apiKey;

      if (modelId && modelId.trim().length > 0) {
        this.modelId = modelId.trim();
      }

      // Skip connection test - we'll test on first actual chat request
      // Many endpoints don't support /models and testing adds latency
      console.log(`OpenAI endpoint configured: ${this.endpoint}`);
      console.log(`Model: ${this.modelId}`);

      if (onProgress) {
        onProgress({ progress: 1, text: 'OpenAI-compatible API configured' });
      }

      this.isInitialized = true;
      return { success: true, backend: 'openai' };
    } catch (error) {
      console.error('OpenAI initialization failed:', error);
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

      const requestBody = {
        model: this.modelId,
        messages: augmentedMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      };

      let requestUrl;
      let fetchOptions;

      if (this.useProxy) {
        // Use proxy server to avoid CORS issues
        requestUrl = this.proxyUrl;
        fetchOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: this.endpoint,
            apiKey: this.apiKey,
            body: requestBody
          }),
        };

        console.log('OpenAI API Request (via proxy):', {
          proxyUrl: requestUrl,
          targetEndpoint: this.endpoint,
          model: this.modelId,
          messageCount: augmentedMessages.length
        });
      } else {
        // Direct connection (may fail due to CORS)
        requestUrl = `${this.endpoint}/chat/completions`;
        fetchOptions = {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        };

        console.log('OpenAI API Request (direct):', {
          url: requestUrl,
          model: this.modelId,
          messageCount: augmentedMessages.length
        });
      }

      const response = await fetch(requestUrl, fetchOptions).catch(error => {
        console.error('Fetch failed:', error);
        if (this.useProxy) {
          throw new Error(
            `Cannot connect to proxy server at ${this.proxyUrl}.\n\n` +
            `Make sure the proxy server is running:\n` +
            `Run "npm run proxy" in a separate terminal.\n\n` +
            `Original error: ${error.message}`
          );
        } else {
          throw new Error(
            `Cannot connect to ${requestUrl}. This may be due to:\n` +
            `1. CORS restrictions (the API doesn't allow browser requests)\n` +
            `2. Network connectivity issues\n` +
            `3. Invalid endpoint URL\n\n` +
            `Original error: ${error.message}\n\n` +
            `Tip: Enable the proxy server to bypass CORS restrictions.`
          );
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API returned status ${response.status}: ${errorText}`);
      }

      // Read the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });

        // Split by newlines as OpenAI sends one JSON object per line with "data: " prefix
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            // Remove "data: " prefix if present
            const jsonStr = line.replace(/^data: /, '').trim();

            // Check for end of stream
            if (jsonStr === '[DONE]') {
              break;
            }

            if (!jsonStr) continue;

            const json = JSON.parse(jsonStr);

            // Extract the message content (OpenAI format)
            if (json.choices && json.choices[0]?.delta?.content) {
              fullResponse += json.choices[0].delta.content;

              if (onUpdate) {
                onUpdate(fullResponse);
              }
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
    this.isGenerating = false;
  }

  isReady() {
    return this.isInitialized && !this.isGenerating;
  }

  isBusy() {
    return this.isGenerating;
  }

  async resetChat() {
    // OpenAI is stateless, no need to reset
  }

  getModelId() {
    return this.modelId;
  }

  setModelId(modelId) {
    this.modelId = modelId;
  }

  getBackend() {
    return 'OpenAI-Compatible API';
  }

  getEndpoint() {
    return this.endpoint;
  }

  setEndpoint(endpoint) {
    this.endpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }
}
