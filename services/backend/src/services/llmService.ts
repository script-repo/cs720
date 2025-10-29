import '../polyfills/fetch';

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
    degraded?: boolean;
    model: string;
    responseTime?: number;
    errorMessage?: string;
    errorCode?: string;
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

function createTimeoutSignal(timeoutMs: number) {
  if (typeof AbortController === 'function') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    return {
      signal: controller.signal,
      cancel: () => clearTimeout(timeout),
    };
  }

  return {
    signal: undefined,
    cancel: () => {},
  };
}

class LLMService {
  private ollamaBaseUrl: string;
  private ollamaModel: string;
  private proxyUrl: string;
  private perplexityApiKey: string | null = null;
  private lastStreamingMetadata: { model: string; endpoint: string } | null = null;
  private activeBackend: 'ollama' | 'openai' = 'ollama'; // Track which backend is currently active

  constructor() {
    // Ollama configuration
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'gemma3:4b-it-qat';

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
      console.log('[LLM] Adding web search results to context');
      console.log('[LLM] Web search answer length:', webSearchResults.answer?.length || 0);
      console.log('[LLM] Web search citations:', webSearchResults.citations?.length || 0);
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
        this.activeBackend = 'openai'; // Mark NAI as active
        console.log('[LLM] Active backend: NAI/OpenAI');
        return response;
      } catch (error) {
        console.warn('NAI/OpenAI-compatible API failed, falling back to Ollama:', error);
      }
    }

    // Try Ollama (either as preferred or fallback)
    try {
      const response = await this.queryOllama(query, context, systemPrompt);
      response.webSearchUsed = !!webSearchResults;
      this.activeBackend = 'ollama'; // Mark Ollama as active
      console.log('[LLM] Active backend: Ollama');
      return response;
    } catch (error) {
      console.warn('Ollama failed:', error);

      // If Ollama was preferred, try NAI as fallback
      if (preferredBackend === 'ollama' && naiBaseUrl && naiApiKey) {
        try {
          const response = await this.queryOpenAICompatible(query, context, naiBaseUrl, naiApiKey, naiModel, systemPrompt);
          response.webSearchUsed = !!webSearchResults;
          this.activeBackend = 'openai'; // Mark NAI as active (fallback)
          console.log('[LLM] Active backend: NAI/OpenAI (fallback)');
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

  async queryLLMStreaming(query: string, context: any, onChunk: (chunk: string) => void): Promise<void> {
    console.log('\n[LLM] ========== Starting Streaming Query ==========');
    console.log('[LLM] Query:', query);

    // Load user preferences
    const preferences = await this.loadPreferences();
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

    if (perplexityApiKey && shouldSearch) {
      try {
        console.log('[LLM] Triggering web search...');
        webSearchResults = await this.performWebSearch(query, perplexityApiKey, perplexityModel);
        console.log('[LLM] Web search completed successfully');
      } catch (error) {
        console.warn('[LLM] Web search failed:', error);
      }
    }

    // Augment context with web search results if available
    if (webSearchResults) {
      console.log('[LLM] Adding web search results to context');
      context = {
        ...context,
        webSearch: webSearchResults
      };
    }

    // Use the preferred backend for streaming
    if (preferredBackend === 'openai' && naiBaseUrl && naiApiKey) {
      // NAI/OpenAI-compatible streaming
      try {
        await this.queryOpenAICompatibleStreaming(query, context, naiBaseUrl, naiApiKey, naiModel, systemPrompt, onChunk);
        this.activeBackend = 'openai'; // Mark NAI as active
        console.log('[LLM] Active backend: NAI/OpenAI (streaming)');
      } catch (error) {
        console.error('Error during NAI streaming:', error);
        // Fallback to Ollama if NAI fails
        console.log('[LLM] Falling back to Ollama streaming');
        await this.queryOllamaStreaming(query, context, systemPrompt, onChunk);
        this.activeBackend = 'ollama'; // Mark Ollama as active (fallback)
        console.log('[LLM] Active backend: Ollama (fallback from NAI)');
      }
    } else {
      // Try Ollama with streaming
      try {
        await this.queryOllamaStreaming(query, context, systemPrompt, onChunk);
        this.activeBackend = 'ollama'; // Mark Ollama as active
        console.log('[LLM] Active backend: Ollama (streaming)');
      } catch (error) {
        console.error('Error during streaming:', error);
        throw error;
      }
    }
  }

  private async queryOllamaStreaming(
    query: string,
    context: any,
    customSystemPrompt?: string,
    onChunk?: (chunk: string) => void
  ): Promise<void> {
    try {
      // Build prompts (same as non-streaming)
      let systemPrompt = this.buildSystemPrompt(context);
      if (customSystemPrompt && !context?.webSearch) {
        systemPrompt = customSystemPrompt;
      }
      const userPrompt = this.buildUserPrompt(query, context);

      console.log('[Ollama] Starting streaming response');

      // Set metadata for this streaming session
      this.lastStreamingMetadata = { model: this.ollamaModel, endpoint: 'local' };

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
          stream: true,  // Enable streaming
          options: {
            temperature: 0.7,
            num_predict: 512
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      // Process streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (data.message?.content) {
              const content = data.message.content;
              if (onChunk) {
                onChunk(content);
              }
            }

            if (data.done) {
              console.log('[Ollama] Streaming complete');
            }
          } catch (e) {
            // Ignore JSON parse errors for incomplete chunks
          }
        }
      }

    } catch (error) {
      console.error('Error in Ollama streaming:', error);
      throw error;
    }
  }

  private async queryOpenAICompatibleStreaming(
    query: string,
    context: any,
    endpoint: string,
    apiKey: string,
    model: string,
    customSystemPrompt?: string,
    onChunk?: (chunk: string) => void
  ): Promise<void> {
    try {
      // Build prompts
      let systemPrompt = this.buildSystemPrompt(context);
      if (customSystemPrompt && !context?.webSearch) {
        systemPrompt = customSystemPrompt;
      }
      const userPrompt = this.buildUserPrompt(query, context);

      console.log('[NAI] Starting streaming response');

      // Set metadata for this streaming session
      this.lastStreamingMetadata = { model, endpoint: 'external' };

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
            stream: true,
            temperature: 0.7,
            max_tokens: 2048
          }
        })
      });

      if (!response.ok) {
        throw new Error(`NAI API error: ${response.statusText}`);
      }

      // Process streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() && line.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.substring(6)); // Remove 'data: ' prefix

            // Handle different SSE event types
            if (data.choices && data.choices[0]?.delta?.content) {
              const content = data.choices[0].delta.content;
              if (onChunk) {
                onChunk(content);
              }
            } else if (data.choices && data.choices[0]?.finish_reason) {
              // Stream completed
              console.log('[NAI] Stream completed');
              break;
            }
          } catch (e) {
            // Skip malformed JSON
            console.warn('[NAI] Failed to parse SSE message:', e);
          }
        }
      }

      console.log('[NAI] Streaming response completed');

    } catch (error) {
      console.error('Error in NAI streaming:', error);
      throw error;
    }
  }

  private getModelName(): string {
    return this.ollamaModel;
  }

  getLastStreamingMetadata(): { model: string; endpoint: string } {
    return this.lastStreamingMetadata || { model: this.ollamaModel, endpoint: 'local' };
  }

  getActiveBackend(): 'ollama' | 'openai' {
    return this.activeBackend;
  }

  private shouldUseWebSearch(query: string): boolean {
    // Detect if query would benefit from web search
    const webSearchKeywords = [
      // Time-sensitive
      'latest', 'recent', 'news', 'current', 'today', 'now', 'update',
      'yesterday', 'last week', 'this month', 'this year',
      // Market/Business
      'industry', 'trend', 'market', 'competitor', 'competitor',
      'company', 'business', 'enterprise', 'startup', 'vendor',
      // Information seeking
      'what is', 'who is', 'how to', 'explain', 'tell me about',
      'what are', 'where is', 'when did', 'why is', 'how does',
      'search', 'find', 'look up', 'research',
      // Technology
      'technology', 'product', 'solution', 'platform', 'software',
      'hardware', 'cloud', 'saas', 'ai', 'ml', 'data',
      // Strategy
      'strategy', 'plan', 'approach', 'initiative', 'roadmap',
      'compare', 'versus', 'vs', 'alternative', 'option',
      // Financial
      'revenue', 'funding', 'valuation', 'ipo', 'acquisition',
      'investment', 'financial', 'earnings', 'profit'
    ];

    const lowerQuery = query.toLowerCase();

    // Check for keywords
    if (webSearchKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return true;
    }

    // Check if query is a question (starts with question words or ends with ?)
    if (lowerQuery.match(/^(what|who|where|when|why|how|is|are|can|could|would|should|do|does)/)) {
      return true;
    }

    if (lowerQuery.includes('?')) {
      return true;
    }

    // Default: use web search for queries longer than 5 words (likely needs context)
    const wordCount = query.trim().split(/\s+/).length;
    if (wordCount >= 5) {
      return true;
    }

    return false;
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
      console.log('[Perplexity] === FULL ANSWER ===');
      console.log(answer);
      console.log('[Perplexity] === CITATIONS ===');
      console.log(JSON.stringify(citations, null, 2));
      console.log('[Perplexity] === END WEB SEARCH RESULTS ===');

      if (!answer || answer.length === 0) {
        console.error('[Perplexity] WARNING: Empty answer received from Perplexity!');
      }

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
      // IMPORTANT: Always build the dynamic system prompt to include web search instructions
      // Even if customSystemPrompt is provided, we need to augment it with web search context
      let systemPrompt = this.buildSystemPrompt(context);

      // If a custom prompt was provided, use it as the base but keep the dynamic parts
      if (customSystemPrompt && !context?.webSearch) {
        // Only use custom prompt if there's NO web search (web search needs dynamic prompt)
        systemPrompt = customSystemPrompt;
      }

      const userPrompt = this.buildUserPrompt(query, context);

      console.log('[Ollama] System prompt length:', systemPrompt.length);
      console.log('[Ollama] User prompt length:', userPrompt.length);
      console.log('[Ollama] Has web search in context:', !!context?.webSearch);
      if (context?.webSearch) {
        console.log('[Ollama] Web search answer preview:', context.webSearch.answer?.substring(0, 100) + '...');
        console.log('[Ollama] Full web search answer:', context.webSearch.answer);
        console.log('[Ollama] Web search citations:', context.webSearch.citations);
      }
      console.log('[Ollama] === FULL SYSTEM PROMPT ===');
      console.log(systemPrompt);
      console.log('[Ollama] === FULL USER PROMPT ===');
      console.log(userPrompt);
      console.log('[Ollama] === END PROMPTS ===');

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
      // IMPORTANT: Always build the dynamic system prompt to include web search instructions
      // Even if customSystemPrompt is provided, we need to augment it with web search context
      let systemPrompt = this.buildSystemPrompt(context);

      // If a custom prompt was provided, use it as the base but keep the dynamic parts
      if (customSystemPrompt && !context?.webSearch) {
        // Only use custom prompt if there's NO web search (web search needs dynamic prompt)
        systemPrompt = customSystemPrompt;
      }

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
    const hasWebSearch = context?.webSearch;

    return `You are CS720, an AI assistant helping Sales Engineers understand customer context quickly.

Your role:
- Provide accurate, concise answers about customer accounts
- Use the provided context data${hasWebSearch ? ' and web search results' : ''}
- Always cite your sources
- Focus on helping SEs prepare for customer interactions
- If you don't have enough information, say so clearly

${hasWebSearch ? `IMPORTANT: When web search results are provided, prioritize them for current/latest information.
Use web search data to supplement or update the customer context data.
` : ''}Guidelines:
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
      console.log('[buildUserPrompt] Web search detected in context');
      console.log('[buildUserPrompt] context.webSearch.answer:', context.webSearch.answer);
      console.log('[buildUserPrompt] Answer exists:', !!context.webSearch.answer);
      console.log('[buildUserPrompt] Answer length:', context.webSearch.answer?.length || 0);

      if (context.webSearch.answer && context.webSearch.answer.length > 0) {
        prompt += `\n=== Web Search Results ===\n`;
        prompt += `${context.webSearch.answer}\n`;
        if (context.webSearch.citations && context.webSearch.citations.length > 0) {
          prompt += `\nSources:\n`;
          context.webSearch.citations.forEach((citation: string, index: number) => {
            prompt += `${index + 1}. ${citation}\n`;
          });
        }
        prompt += `\n`;
        console.log('[buildUserPrompt] Web search section added to prompt');
      } else {
        console.error('[buildUserPrompt] ERROR: Web search answer is empty or undefined!');
        console.error('[buildUserPrompt] Full webSearch object:', JSON.stringify(context.webSearch, null, 2));
      }
    } else {
      console.log('[buildUserPrompt] No web search in context');
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

    // Add instruction based on whether web search was used
    if (context?.webSearch) {
      prompt += `\nIMPORTANT: Prioritize the Web Search Results above for answering this query, as they contain the most current information. Use the customer context data as supplementary information if relevant. Always cite your sources.`;
    } else {
      prompt += `\nPlease answer the query using this context. If you reference specific information, mention the source document or data type.`;
    }

    return prompt;
  }

  private extractSources(content: string, context: any): string[] {
    const sources: string[] = [];

    // Add web search citations if available
    if (context?.webSearch?.citations && context.webSearch.citations.length > 0) {
      sources.push(...context.webSearch.citations);
    }

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
      const timeout = createTimeoutSignal(3000);
      try {
        const response = await fetch(`${this.ollamaBaseUrl}/api/tags`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: timeout.signal
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
      } finally {
        timeout.cancel();
      }
    } catch (error) {
      console.error('Ollama health check failed:', error);
    }

    // Check proxy
    try {
      const startTime = Date.now();
      const proxyHealthUrl = this.proxyUrl.replace('/proxy', '/health');
      const timeout = createTimeoutSignal(3000);
      try {
        const response = await fetch(proxyHealthUrl, {
          method: 'GET',
          signal: timeout.signal
        });

        if (response.ok) {
          health.proxy.available = true;
          health.proxy.responseTime = Date.now() - startTime;
        }
      } finally {
        timeout.cancel();
      }
    } catch (error) {
      console.error('Proxy health check failed:', error);
    }

    // Check NAI/OpenAI-compatible API (only if configured in preferences)
    if (naiBaseUrl && naiApiKey && health.proxy.available) {
      try {
        const startTime = Date.now();
        console.log('[Health] Checking NAI endpoint:', naiBaseUrl);

        const timeout = createTimeoutSignal(8000);
        try {
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
            signal: timeout.signal
          });

          if (response.ok) {
            const result: any = await response.json();
            console.log('[Health] NAI health check response:', result);

            // Proxy returns { success: true, data: { status: 'available'|'degraded'|'unavailable', latency: 123 } }
            if (result.success && result.data) {
              if (result.data.status === 'available') {
                health.external.available = true;
                health.external.degraded = false;
                health.external.responseTime = result.data.latency || (Date.now() - startTime);
                console.log('[Health] NAI endpoint is available');
              } else if (result.data.status === 'degraded') {
                // Endpoint is reachable but returning errors (e.g., NAI-10021)
                health.external.available = true;
                health.external.degraded = true;
                health.external.responseTime = result.data.latency || (Date.now() - startTime);
                health.external.errorMessage = result.data.message || 'Endpoint degraded';
                health.external.errorCode = result.data.errorCode;
                console.log('[Health] NAI endpoint is degraded:', result.data.message);
              } else {
                console.log('[Health] NAI endpoint is unavailable:', result.data?.message);
              }
            } else {
              console.log('[Health] NAI endpoint is unavailable:', result.data?.message);
            }
          } else {
            console.error('[Health] NAI health check HTTP error:', response.status, response.statusText);
          }
        } finally {
          timeout.cancel();
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

    // Determine which backend should be active based on preferences and availability
    const preferredBackend = preferences.ai?.preferredModel || 'ollama';

    // Update activeBackend based on preference and availability
    if (preferredBackend === 'openai') {
      // Prefer NAI/OpenAI
      if (health.external.available && !health.external.degraded) {
        // NAI is available and healthy, use it
        this.activeBackend = 'openai';
        console.log('[Health] Active backend set to: NAI/OpenAI (preferred, available)');
      } else if (health.local.available) {
        // NAI is unavailable or degraded, failover to Ollama
        this.activeBackend = 'ollama';
        console.log('[Health] Active backend set to: Ollama (failover from NAI)');
      } else {
        // Both unavailable, keep preference
        this.activeBackend = 'openai';
        console.log('[Health] Active backend set to: NAI/OpenAI (preferred, but unavailable)');
      }
    } else {
      // Prefer Ollama
      if (health.local.available) {
        // Ollama is available, use it
        this.activeBackend = 'ollama';
        console.log('[Health] Active backend set to: Ollama (preferred, available)');
      } else if (health.external.available) {
        // Ollama is unavailable, failover to NAI
        this.activeBackend = 'openai';
        console.log('[Health] Active backend set to: NAI/OpenAI (failover from Ollama)');
      } else {
        // Both unavailable, keep preference
        this.activeBackend = 'ollama';
        console.log('[Health] Active backend set to: Ollama (preferred, but unavailable)');
      }
    }

    return health;
  }
}

export const llmService = new LLMService();
