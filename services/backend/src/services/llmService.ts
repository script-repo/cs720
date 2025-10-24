interface LLMResponse {
  content: string;
  sources: string[];
  model: string;
  endpoint: 'external' | 'local';
  confidence?: number;
  webSearchUsed?: boolean;
}

interface LLMHealth {
  external: {
    available: boolean;
    model: string;
    responseTime?: number;
  };
  local: {
    available: boolean;
    model: string;
    responseTime?: number;
  };
  proxy: {
    available: boolean;
    responseTime?: number;
  };
}

class LLMService {
  private ollamaBaseUrl: string;
  private ollamaModel: string;
  private proxyUrl: string;
  private perplexityApiKey: string | null = null;

  constructor() {
    // Ollama configuration
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'gemma3:270m';

    // Proxy configuration
    this.proxyUrl = process.env.PROXY_URL || 'http://localhost:3002/proxy';
  }

  private async loadPreferences(): Promise<any> {
    try {
      const { readDataFile } = await import('../utils/storage');
      const preferences = await readDataFile('preferences.json');
      return preferences || {};
    } catch (error) {
      console.error('Error loading preferences:', error);
      return {};
    }
  }

  async queryLLM(query: string, context: any): Promise<LLMResponse> {
    console.log('\n[LLM] ========== Starting Query ==========');
    console.log('[LLM] Query:', query);

    // Load user preferences
    const preferences = await this.loadPreferences();
    console.log('[LLM] Preferences loaded:', {
      preferredModel: preferences.ai?.preferredModel,
      hasNaiUrl: !!preferences.ai?.naiBaseUrl,
      hasNaiKey: !!preferences.ai?.naiApiKey,
      hasPerplexityKey: !!preferences.ai?.perplexityApiKey,
      naiModel: preferences.ai?.naiModel
    });

    const preferredBackend = preferences.ai?.preferredModel || 'ollama';
    const naiBaseUrl = preferences.ai?.naiBaseUrl;
    const naiApiKey = preferences.ai?.naiApiKey;
    const naiModel = preferences.ai?.naiModel || 'gpt-4';
    const systemPrompt = preferences.ai?.systemPrompt;
    const perplexityApiKey = preferences.ai?.perplexityApiKey;
    const perplexityModel = preferences.ai?.perplexityModel || 'sonar';

    // Check if query needs web search
    let webSearchResults = null;
    const shouldSearch = this.shouldUseWebSearch(query);
    console.log('[LLM] Web search check:');
    console.log('  - Perplexity API key configured:', !!perplexityApiKey);
    console.log('  - Should use web search:', shouldSearch);

    if (perplexityApiKey && shouldSearch) {
      try {
        console.log('[LLM] Triggering web search...');
        webSearchResults = await this.performWebSearch(query, perplexityApiKey, perplexityModel);
        console.log('[LLM] Web search completed successfully');
        console.log('[LLM] Web search results:', webSearchResults);
      } catch (error) {
        console.warn('[LLM] Web search failed:', error);
        if (error instanceof Error) {
          console.warn('[LLM] Web search error message:', error.message);
        }
      }
    } else {
      if (!perplexityApiKey) {
        console.log('[LLM] Skipping web search: No Perplexity API key configured');
      } else if (!shouldSearch) {
        console.log('[LLM] Skipping web search: Query does not match web search keywords');
      }
    }

    // Augment context with web search results if available
    if (webSearchResults) {
      context = {
        ...context,
        webSearch: webSearchResults
      };
    }

    // Try preferred backend first (NAI or Ollama)
    if (preferredBackend === 'openai' && naiBaseUrl && naiApiKey) {
      try {
        const response = await this.queryOpenAICompatible(query, context, naiBaseUrl, naiApiKey, naiModel, systemPrompt);
        response.webSearchUsed = !!webSearchResults;
        return response;
      } catch (error) {
        console.warn('NAI/OpenAI-compatible API failed, falling back to Ollama:', error);
      }
    }

    // Try Ollama (either as preferred or fallback)
    try {
      const response = await this.queryOllama(query, context, systemPrompt);
      response.webSearchUsed = !!webSearchResults;
      return response;
    } catch (error) {
      console.warn('Ollama failed:', error);

      // If Ollama was preferred, try NAI as fallback
      if (preferredBackend === 'ollama' && naiBaseUrl && naiApiKey) {
        try {
          const response = await this.queryOpenAICompatible(query, context, naiBaseUrl, naiApiKey, naiModel, systemPrompt);
          response.webSearchUsed = !!webSearchResults;
          return response;
        } catch (fallbackError) {
          console.error('All LLM backends failed:', fallbackError);
        }
      }

      // Last resort: return error message
      return {
        content: 'I apologize, but I\'m unable to process your query at the moment. All AI services are unavailable. Please try again later or contact support.',
        sources: [],
        model: 'fallback',
        endpoint: 'local',
        confidence: 0,
        webSearchUsed: false
      };
    }
  }

  private shouldUseWebSearch(query: string): boolean {
    // Detect if query would benefit from web search
    const webSearchKeywords = [
      'latest', 'recent', 'news', 'current', 'today',
      'industry', 'trend', 'market', 'competitor',
      'what is', 'who is', 'how to', 'explain'
    ];

    const lowerQuery = query.toLowerCase();
    return webSearchKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  private async performWebSearch(query: string, apiKey: string, model: string = 'sonar'): Promise<any> {
    try {
      console.log('[Perplexity] Performing web search for query:', query);
      console.log('[Perplexity] API key length:', apiKey?.length || 0);
      console.log('[Perplexity] Using model:', model);

      // Use Perplexity's Chat Completions API with selected Sonar model (supports web search)
      const requestBody = {
        model: model,  // Use selected Perplexity model from preferences
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that provides concise, factual information from web search.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: 500,
        temperature: 0.2,
        stream: false
      };

      console.log('[Perplexity] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('[Perplexity] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Perplexity] API error response:', errorText);
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: any = await response.json();
      console.log('[Perplexity] Response data:', JSON.stringify(data, null, 2));
      console.log('[Perplexity] Web search successful, got', data.choices?.length || 0, 'results');

      const answer = data.choices?.[0]?.message?.content || '';

      // Extract citations from the response
      // Perplexity includes citations in the message content as [1], [2], etc.
      // and provides the actual URLs in data.citations array or in the message metadata
      const citations = data.citations || [];

      console.log('[Perplexity] Extracted answer length:', answer.length);
      console.log('[Perplexity] Citations count:', citations.length);

      return {
        answer,
        citations
      };
    } catch (error) {
      console.error('[Perplexity] Error performing web search:', error);
      if (error instanceof Error) {
        console.error('[Perplexity] Error message:', error.message);
        console.error('[Perplexity] Error stack:', error.stack);
      }
      throw error;
    }
  }

  private async queryOllama(query: string, context: any, customSystemPrompt?: string): Promise<LLMResponse> {
    try {
      const systemPrompt = customSystemPrompt || this.buildSystemPrompt(context);
      const userPrompt = this.buildUserPrompt(query, context);

      const response = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.ollamaModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 512
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      const content = data.message?.content || 'No response generated';
      const sources = this.extractSources(content, context);

      return {
        content,
        sources,
        model: this.ollamaModel,
        endpoint: 'local',
        confidence: 0.75
      };

    } catch (error) {
      console.error('Error querying Ollama:', error);
      throw error;
    }
  }

  private async queryOpenAICompatible(
    query: string,
    context: any,
    endpoint: string,
    apiKey: string,
    model: string,
    customSystemPrompt?: string
  ): Promise<LLMResponse> {
    if (!endpoint || !apiKey) {
      throw new Error('NAI/OpenAI-compatible API not configured');
    }

    try {
      const systemPrompt = customSystemPrompt || this.buildSystemPrompt(context);
      const userPrompt = this.buildUserPrompt(query, context);

      // Use proxy to avoid CORS issues
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: endpoint,
          apiKey: apiKey,
          body: {
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            stream: false,
            temperature: 0.7,
            max_tokens: 2048
          }
        })
      });

      if (!response.ok) {
        throw new Error(`NAI/OpenAI-compatible API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content || 'No response generated';
      const sources = this.extractSources(content, context);

      return {
        content,
        sources,
        model: model,
        endpoint: 'external',
        confidence: 0.85
      };

    } catch (error) {
      console.error('Error querying NAI/OpenAI-compatible API:', error);
      throw error;
    }
  }

  private buildSystemPrompt(context: any): string {
    return `You are CS720, an AI assistant helping Sales Engineers understand customer context quickly.

Your role:
- Provide accurate, concise answers about customer accounts
- Use only the provided context data
- Always cite your sources
- Focus on helping SEs prepare for customer interactions
- If you don't have enough information, say so clearly

Guidelines:
- Keep responses under 500 words
- Use bullet points for multiple items
- Include relevant details like dates, amounts, status
- Mention if information might be outdated
- Be professional but conversational`;
  }

  private buildUserPrompt(query: string, context: any): string {
    let prompt = `Customer Query: ${query}\n\nAvailable Context:\n`;

    // Add web search results if available
    if (context?.webSearch) {
      prompt += `\n=== Web Search Results ===\n`;
      prompt += `${context.webSearch.answer}\n`;
      if (context.webSearch.citations && context.webSearch.citations.length > 0) {
        prompt += `\nSources:\n`;
        context.webSearch.citations.forEach((citation: string, index: number) => {
          prompt += `${index + 1}. ${citation}\n`;
        });
      }
      prompt += `\n`;
    }

    if (context?.account) {
      prompt += `\nAccount Information:\n`;
      prompt += `- Name: ${context.account.name}\n`;
      prompt += `- Industry: ${context.account.industry}\n`;
      prompt += `- Status: ${context.account.status}\n`;
      prompt += `- Site Count: ${context.account.siteCount}\n`;
    }

    if (context?.documents && context.documents.length > 0) {
      prompt += `\nRelevant Documents (${context.documents.length} total):\n`;
      context.documents.slice(0, 5).forEach((doc: any, index: number) => {
        prompt += `${index + 1}. ${doc.title} (${doc.type})\n`;
        prompt += `   ${doc.content?.substring(0, 200)}...\n`;
      });
    }

    if (context?.account?.priorities && context.account.priorities.length > 0) {
      prompt += `\nCurrent Priorities:\n`;
      context.account.priorities.forEach((priority: any, index: number) => {
        prompt += `${index + 1}. ${priority.title} (${priority.priority} priority)\n`;
      });
    }

    if (context?.account?.upcomingDates && context.account.upcomingDates.length > 0) {
      prompt += `\nUpcoming Dates:\n`;
      context.account.upcomingDates.forEach((date: any, index: number) => {
        prompt += `${index + 1}. ${date.title} - ${date.date}\n`;
      });
    }

    prompt += `\nPlease answer the query using this context. If you reference specific information, mention the source document or data type.`;

    return prompt;
  }

  private extractSources(content: string, context: any): string[] {
    const sources: string[] = [];

    // Look for document references in the response
    if (context?.documents) {
      context.documents.forEach((doc: any) => {
        if (content.toLowerCase().includes(doc.title.toLowerCase().substring(0, 20))) {
          sources.push(doc.id);
        }
      });
    }

    // If no specific documents were referenced, include general account data
    if (sources.length === 0 && context?.account) {
      sources.push('account-data');
    }

    return sources;
  }

  async checkHealth(): Promise<LLMHealth> {
    // Load user preferences to get NAI credentials
    const preferences = await this.loadPreferences();
    const naiBaseUrl = preferences.ai?.naiBaseUrl;
    const naiApiKey = preferences.ai?.naiApiKey;
    const naiModel = preferences.ai?.naiModel || 'gpt-4';

    const health: LLMHealth = {
      external: {
        available: false,
        model: naiModel
      },
      local: {
        available: false,
        model: this.ollamaModel
      },
      proxy: {
        available: false
      }
    };

    // Check Ollama
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        health.local.available = true;
        health.local.responseTime = Date.now() - startTime;

        // Check if configured model is available
        const data: any = await response.json();
        const models = data.models || [];
        const hasModel = models.some((model: any) => model.name.includes(this.ollamaModel));

        if (!hasModel && models.length > 0) {
          health.local.model = models[0]?.name || 'none';
        }
      }
    } catch (error) {
      console.error('Ollama health check failed:', error);
    }

    // Check proxy
    try {
      const startTime = Date.now();
      const proxyHealthUrl = this.proxyUrl.replace('/proxy', '/health');
      const response = await fetch(proxyHealthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        health.proxy.available = true;
        health.proxy.responseTime = Date.now() - startTime;
      }
    } catch (error) {
      console.error('Proxy health check failed:', error);
    }

    // Check NAI/OpenAI-compatible API (only if configured in preferences)
    if (naiBaseUrl && naiApiKey && health.proxy.available) {
      try {
        const startTime = Date.now();
        console.log('[Health] Checking NAI endpoint:', naiBaseUrl);

        const response = await fetch(`${this.proxyUrl.replace('/proxy', '/health/remote')}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            endpoint: naiBaseUrl,
            apiKey: naiApiKey,
            model: naiModel
          }),
          signal: AbortSignal.timeout(8000)
        });

        if (response.ok) {
          const result: any = await response.json();
          console.log('[Health] NAI health check response:', result);

          // Proxy returns { success: true, data: { status: 'available', latency: 123 } }
          if (result.success && result.data && result.data.status === 'available') {
            health.external.available = true;
            health.external.responseTime = result.data.latency || (Date.now() - startTime);
            console.log('[Health] NAI endpoint is available');
          } else {
            console.log('[Health] NAI endpoint is unavailable:', result.data?.message);
          }
        } else {
          console.error('[Health] NAI health check HTTP error:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('[Health] NAI/OpenAI-compatible API health check failed:', error);
      }
    } else {
      if (!naiBaseUrl || !naiApiKey) {
        console.log('[Health] NAI not configured, skipping health check');
      } else if (!health.proxy.available) {
        console.log('[Health] Proxy unavailable, skipping NAI health check');
      }
    }

    return health;
  }
}

export const llmService = new LLMService();