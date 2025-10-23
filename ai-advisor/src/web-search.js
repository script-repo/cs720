/**
 * Web Search Integration
 * Uses Perplexity API for real-time search results
 */

export class WebSearch {
  constructor() {
    // Perplexity API configuration
    this.perplexityApiUrl = 'https://api.perplexity.ai/chat/completions';
    this.perplexityApiKey = null;

    // Load API key from localStorage if available
    this.loadApiKey();
  }

  /**
   * Load API key from localStorage
   */
  loadApiKey() {
    if (typeof localStorage !== 'undefined') {
      this.perplexityApiKey = localStorage.getItem('perplexity_api_key');
    }
  }

  /**
   * Save API key to localStorage
   */
  setApiKey(apiKey) {
    this.perplexityApiKey = apiKey;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('perplexity_api_key', apiKey);
    }
  }

  /**
   * Check if Perplexity API key is configured
   */
  hasApiKey() {
    return this.perplexityApiKey && this.perplexityApiKey.length > 0;
  }

  /**
   * Perform a web search and return results
   * @param {string} query - The search query
   * @param {number} maxResults - Maximum number of results to return
   * @returns {Promise<Array>} - Array of search results
   */
  async search(query, maxResults = 5) {
    // Check if API key is configured
    if (!this.hasApiKey()) {
      console.error('❌ Perplexity API key not configured');
      return this.createNoKeyError();
    }

    console.log('✓ Using Perplexity API for search...');
    const perplexityResults = await this.searchPerplexity(query);

    if (perplexityResults.length > 0) {
      console.log('✓ Perplexity search successful:', perplexityResults);
      return perplexityResults;
    } else {
      console.warn('⚠ Perplexity returned no results');
      return this.createNoResultsError(query);
    }
  }

  /**
   * Search using Perplexity API
   * @param {string} query
   * @returns {Promise<Array>}
   */
  async searchPerplexity(query) {
    try {
      console.log('🔍 Perplexity API Request:', {
        model: 'sonar',
        query: query
      });

      const response = await fetch(this.perplexityApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'user',
              content: query
            }
          ],
          temperature: 0.2,
          max_tokens: 1000
        })
      });

      console.log('📡 Perplexity API Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Perplexity API error:', response.status, errorText);
        throw new Error(`Perplexity API returned status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📦 Perplexity API Full Response:', data);

      // Extract the response content
      const answer = data.choices?.[0]?.message?.content || '';

      // Try to extract citations from different possible locations
      const citations = data.citations ||
                       data.choices?.[0]?.citations ||
                       [];

      console.log('📝 Extracted Answer:', answer);
      console.log('🔗 Citations:', citations);

      if (!answer) {
        console.warn('⚠️ No answer content in Perplexity response');
        return [];
      }

      // Format as search results with the answer
      const results = [{
        title: 'Latest Information',
        snippet: answer,
        url: Array.isArray(citations) && citations.length > 0 ? citations[0] : '',
        source: 'Perplexity AI'
      }];

      // Add citations as separate results if they exist
      if (Array.isArray(citations) && citations.length > 0) {
        citations.slice(0, 3).forEach((citation, index) => {
          results.push({
            title: `Source ${index + 1}`,
            snippet: `Referenced in the answer above`,
            url: citation,
            source: 'Citation'
          });
        });
      }

      console.log('✅ Formatted Results:', results);
      return results;
    } catch (error) {
      console.error('💥 Perplexity search error:', error);
      return [];
    }
  }

  /**
   * Create error message when API key is not configured
   * @returns {Array}
   */
  createNoKeyError() {
    return [{
      title: 'Perplexity API Key Required',
      snippet: 'Web search requires a Perplexity API key. Please add your API key in Settings (⚙️) to enable web search.\n\nGet a free API key at: https://www.perplexity.ai/settings/api',
      url: 'https://www.perplexity.ai/settings/api',
      source: 'Configuration Required',
    }];
  }

  /**
   * Create error message when search returns no results
   * @param {string} query
   * @returns {Array}
   */
  createNoResultsError(query) {
    return [{
      title: 'No Search Results',
      snippet: `Perplexity didn't return results for "${query}". This could be due to:\n- API rate limits\n- Network connectivity issues\n- The query being too vague\n\nPlease try rephrasing your question or try again later.`,
      url: '',
      source: 'Perplexity AI',
    }];
  }

  /**
   * Format search results into a readable text format for the LLM
   * @param {Array} results - Search results
   * @returns {string} - Formatted text
   */
  formatResultsForLLM(results) {
    if (!results || results.length === 0) {
      return '';
    }

    let formatted = '\n\nHere is current information from web search:\n\n';

    results.forEach((result, index) => {
      // Only include the main result (Latest Information), skip citation placeholders
      if (result.title === 'Latest Information') {
        formatted += result.snippet + '\n';
      }
    });

    return formatted;
  }

  /**
   * Check if a query needs a web search
   * Simple heuristic based on keywords
   * @param {string} query
   * @returns {boolean}
   */
  shouldSearch(query) {
    const searchKeywords = [
      'search', 'find', 'look up', 'what is', 'who is', 'when did',
      'latest', 'current', 'news', 'today', 'recent', 'now',
      'how to', 'where is', 'weather', 'stock', 'price'
    ];

    const lowerQuery = query.toLowerCase();
    return searchKeywords.some(keyword => lowerQuery.includes(keyword));
  }
}
