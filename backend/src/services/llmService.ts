import OpenAI from 'openai';

interface LLMResponse {
  content: string;
  sources: string[];
  model: string;
  endpoint: 'external' | 'local';
  confidence?: number;
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
}

class LLMService {
  private openai: OpenAI | null = null;
  private ollamaBaseUrl: string;

  constructor() {
    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }

    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  async queryLLM(query: string, context: any): Promise<LLMResponse> {
    // Try external LLM first, fallback to local
    try {
      if (this.openai) {
        return await this.queryExternalLLM(query, context);
      }
    } catch (error) {
      console.warn('External LLM failed, falling back to local:', error);
    }

    // Fallback to local LLM
    return await this.queryLocalLLM(query, context);
  }

  private async queryExternalLLM(query: string, context: any): Promise<LLMResponse> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const userPrompt = this.buildUserPrompt(query, context);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      const content = completion.choices[0]?.message?.content || 'No response generated';
      const sources = this.extractSources(content, context);

      return {
        content,
        sources,
        model: 'gpt-3.5-turbo',
        endpoint: 'external',
        confidence: 0.85 // Placeholder confidence score
      };

    } catch (error) {
      console.error('Error querying external LLM:', error);
      throw error;
    }
  }

  private async queryLocalLLM(query: string, context: any): Promise<LLMResponse> {
    try {
      const prompt = this.buildLocalPrompt(query, context);

      const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama2',
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 1000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      const content = data.response || 'No response generated';
      const sources = this.extractSources(content, context);

      return {
        content,
        sources,
        model: 'llama2',
        endpoint: 'local',
        confidence: 0.75 // Local models typically have lower confidence
      };

    } catch (error) {
      console.error('Error querying local LLM:', error);

      // Last resort: return a helpful error message
      return {
        content: 'I apologize, but I\'m unable to process your query at the moment. Both external and local AI services are unavailable. Please try again later or contact support.',
        sources: [],
        model: 'fallback',
        endpoint: 'local',
        confidence: 0
      };
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

  private buildLocalPrompt(query: string, context: any): string {
    // Simpler prompt format for local LLM
    let prompt = `Context: You are helping a Sales Engineer understand customer information.\n\n`;

    if (context?.account) {
      prompt += `Customer: ${context.account.name} (${context.account.industry})\n`;
      prompt += `Status: ${context.account.status}\n\n`;
    }

    prompt += `Question: ${query}\n\n`;
    prompt += `Based on the customer information provided, please give a helpful answer:\n`;

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
    const health: LLMHealth = {
      external: {
        available: false,
        model: 'gpt-3.5-turbo'
      },
      local: {
        available: false,
        model: 'llama2'
      }
    };

    // Check external LLM
    if (this.openai) {
      try {
        const startTime = Date.now();
        await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 1
        });
        health.external.available = true;
        health.external.responseTime = Date.now() - startTime;
      } catch (error) {
        console.error('External LLM health check failed:', error);
      }
    }

    // Check local LLM
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        health.local.available = true;
        health.local.responseTime = Date.now() - startTime;

        // Check if llama2 model is available
        const data: any = await response.json();
        const models = data.models || [];
        const hasLlama2 = models.some((model: any) => model.name.includes('llama2'));

        if (!hasLlama2) {
          health.local.model = models[0]?.name || 'none';
        }
      }
    } catch (error) {
      console.error('Local LLM health check failed:', error);
    }

    return health;
  }
}

export const llmService = new LLMService();