/**
 * Proxy Client
 * Integration with OpenAI-compatible APIs via CORS proxy
 */

import fetch from 'node-fetch';
import { ChatMessage, LLMConfig, LLMHealthStatus } from '@cs720/shared';

export class ProxyClient {
  private proxyUrl: string;
  private endpoint: string;
  private apiKey: string;

  constructor(
    proxyUrl: string = 'http://localhost:3002',
    endpoint?: string,
    apiKey?: string
  ) {
    this.proxyUrl = proxyUrl;
    this.endpoint = endpoint || process.env.OPENAI_ENDPOINT || '';
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
  }

  /**
   * Set OpenAI-compatible endpoint configuration
   */
  setConfig(endpoint: string, apiKey: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  /**
   * Check proxy service health
   */
  async checkHealth(): Promise<LLMHealthStatus> {
    const startTime = Date.now();

    try {
      // First check if proxy server is running
      const proxyResponse = await fetch(`${this.proxyUrl}/health`);

      if (!proxyResponse.ok) {
        return {
          backend: 'proxy',
          available: false,
          error: 'Proxy server is not available',
        };
      }

      // If endpoint is configured, check remote endpoint health
      if (this.endpoint && this.apiKey) {
        const remoteResponse = await fetch(`${this.proxyUrl}/health/remote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: this.endpoint,
            apiKey: this.apiKey,
          }),
        });

        if (!remoteResponse.ok) {
          return {
            backend: 'proxy',
            available: false,
            error: 'Remote endpoint health check failed',
          };
        }

        const data = await remoteResponse.json();
        const latency = Date.now() - startTime;

        return {
          backend: 'proxy',
          available: data.data?.status === 'available',
          latency,
          error: data.data?.status === 'available' ? undefined : data.data?.message,
        };
      }

      // Proxy is available but no remote endpoint configured
      const latency = Date.now() - startTime;
      return {
        backend: 'proxy',
        available: false,
        latency,
        error: 'No remote endpoint configured',
      };
    } catch (error: any) {
      return {
        backend: 'proxy',
        available: false,
        error: error.message || 'Failed to connect to proxy',
      };
    }
  }

  /**
   * Chat via proxy
   */
  async chat(
    messages: ChatMessage[],
    config: LLMConfig,
    stream: boolean = false
  ): Promise<string> {
    if (!this.endpoint || !this.apiKey) {
      throw new Error('OpenAI endpoint and API key must be configured');
    }

    try {
      const openaiMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add system message if provided
      if (config.systemPrompt) {
        openaiMessages.unshift({
          role: 'system',
          content: config.systemPrompt,
        });
      }

      const requestBody = {
        endpoint: this.endpoint,
        apiKey: this.apiKey,
        body: {
          model: config.model || 'gpt-4',
          messages: openaiMessages,
          stream,
          temperature: config.temperature || 0.7,
          max_tokens: config.maxTokens || 2048,
        },
      };

      const response = await fetch(`${this.proxyUrl}/proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Proxy request failed: ${response.status} - ${errorText}`);
      }

      if (stream) {
        // For streaming, return the raw response body
        return response.body as any;
      } else {
        // For non-streaming, parse JSON response
        const data: any = await response.json();

        // OpenAI-compatible response format
        if (data.choices && data.choices.length > 0) {
          return data.choices[0].message.content || '';
        }

        throw new Error('Unexpected response format from OpenAI-compatible API');
      }
    } catch (error: any) {
      console.error('Proxy chat error:', error);
      throw new Error(`Proxy chat failed: ${error.message}`);
    }
  }

  /**
   * Stream chat via proxy (for future streaming implementation)
   */
  async *chatStream(
    messages: ChatMessage[],
    config: LLMConfig
  ): AsyncGenerator<string, void, unknown> {
    if (!this.endpoint || !this.apiKey) {
      throw new Error('OpenAI endpoint and API key must be configured');
    }

    const openaiMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    if (config.systemPrompt) {
      openaiMessages.unshift({
        role: 'system',
        content: config.systemPrompt,
      });
    }

    const requestBody = {
      endpoint: this.endpoint,
      apiKey: this.apiKey,
      body: {
        model: config.model || 'gpt-4',
        messages: openaiMessages,
        stream: true,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 2048,
      },
    };

    const response = await fetch(`${this.proxyUrl}/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Proxy request failed: ${response.status}`);
    }

    const decoder = new TextDecoder();

    const bodyStream = response.body;
    if (!bodyStream) {
      throw new Error('No response body received from proxy');
    }

    const getReader = (bodyStream as any)?.getReader?.bind(bodyStream);

    if (typeof getReader === 'function') {
      const reader = getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((line) => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  yield content;
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      return;
    }

    const nodeStream = bodyStream as unknown as AsyncIterable<Buffer>;
    for await (const chunk of nodeStream) {
      const text = decoder.decode(chunk, { stream: true });
      const lines = text.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        if (!line.startsWith('data: ')) {
          continue;
        }

        const data = line.slice(6);
        if (data === '[DONE]') {
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // Ignore invalid chunks
        }
      }
    }
  }
}
