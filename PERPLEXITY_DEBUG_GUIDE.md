# Perplexity Web Search Debug Guide

## Enhanced Logging

The backend now has **comprehensive logging** for debugging Perplexity web search issues.

### What You'll See

When you ask a query that should trigger web search, you'll see detailed logs like:

```
[LLM] ========== Starting Query ==========
[LLM] Query: What are the latest AI trends?
[LLM] Preferences loaded: {
  preferredModel: 'ollama',
  hasNaiUrl: false,
  hasNaiKey: false,
  hasPerplexityKey: true,
  naiModel: undefined
}
[LLM] Web search check:
  - Perplexity API key configured: true
  - Should use web search: true
[LLM] Triggering web search...
[Perplexity] Performing web search for query: What are the latest AI trends?
[Perplexity] API key length: 56
[Perplexity] Request body: {
  "model": "llama-3.1-sonar-small-128k-online",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant..."
    },
    {
      "role": "user",
      "content": "What are the latest AI trends?"
    }
  ],
  "max_tokens": 500,
  "temperature": 0.2,
  "return_citations": true
}
[Perplexity] Response status: 200 OK
[Perplexity] Response data: {
  "choices": [...],
  "citations": [...]
}
[Perplexity] Web search successful, got 1 results
[Perplexity] Extracted answer length: 456
[Perplexity] Citations count: 3
[LLM] Web search completed successfully
[LLM] Web search results: { answer: '...', citations: [...] }
```

---

## Testing Steps

### 1. Restart Backend with Logging
```bash
cd services/backend
npm run dev
```

### 2. Configure Perplexity API Key
1. Go to Settings → AI Settings
2. Add your Perplexity API Key: `pplx-...`
3. Click "Save Changes"
4. **Wait 2-3 seconds** for settings to save

### 3. Test with Trigger Query
Ask a question with web search keywords:

**Good test queries:**
- "What are the **latest** trends in AI?"
- "What is the **current** state of cloud computing?"
- "What is **recent** news about OpenAI?"
- "**Explain** quantum computing"
- "What **is** machine learning?"

### 4. Check Backend Logs

**Success Pattern:**
```
[LLM] ========== Starting Query ==========
[LLM] Query: What are the latest trends in AI?
[LLM] Preferences loaded: { ..., hasPerplexityKey: true }
[LLM] Web search check:
  - Perplexity API key configured: true
  - Should use web search: true
[LLM] Triggering web search...
[Perplexity] Performing web search...
[Perplexity] Response status: 200 OK
[LLM] Web search completed successfully
```

---

## Common Issues & Solutions

### Issue 1: "No Perplexity API key configured"

**Logs show:**
```
[LLM] Preferences loaded: { ..., hasPerplexityKey: false }
[LLM] Skipping web search: No Perplexity API key configured
```

**Solution:**
1. Check Settings → AI Settings → Perplexity API Key
2. Make sure you clicked "Save Changes"
3. Check backend preferences file:
   ```bash
   cat .cs720/preferences.json
   ```
   Should show:
   ```json
   {
     "ai": {
       "perplexityApiKey": "pplx-..."
     }
   }
   ```

### Issue 2: "Query does not match web search keywords"

**Logs show:**
```
[LLM] Web search check:
  - Perplexity API key configured: true
  - Should use web search: false
[LLM] Skipping web search: Query does not match web search keywords
```

**Solution:**
Your query doesn't contain trigger keywords. Try including:
- `latest`, `recent`, `news`, `current`, `today`
- `industry`, `trend`, `market`, `competitor`
- `what is`, `who is`, `how to`, `explain`

**Examples:**
- ❌ "Summarize the meeting notes" → No trigger
- ✅ "What are the **latest** AI trends?" → Triggers

### Issue 3: Perplexity API Error 401 (Unauthorized)

**Logs show:**
```
[Perplexity] Response status: 401 Unauthorized
[Perplexity] API error response: {"error":"Invalid API key"}
```

**Solution:**
1. Verify your API key at https://www.perplexity.ai/settings/api
2. Make sure you copied the full key (starts with `pplx-`)
3. Check for extra spaces or line breaks
4. Update the key in Settings

### Issue 4: Perplexity API Error 402 (Payment Required)

**Logs show:**
```
[Perplexity] Response status: 402 Payment Required
[Perplexity] API error response: {"error":"Insufficient credits"}
```

**Solution:**
- Add credits to your Perplexity account
- Check your usage at https://www.perplexity.ai/settings/api

### Issue 5: Perplexity API Error 429 (Too Many Requests)

**Logs show:**
```
[Perplexity] Response status: 429 Too Many Requests
[Perplexity] API error response: {"error":"Rate limit exceeded"}
```

**Solution:**
- Wait a few minutes before retrying
- Check your rate limits at https://www.perplexity.ai/settings/api
- Consider upgrading your plan

### Issue 6: Web Search Failed (Network Error)

**Logs show:**
```
[Perplexity] Error performing web search: Error: fetch failed
[LLM] Web search failed: Error: fetch failed
```

**Solution:**
1. Check internet connection
2. Verify firewall allows HTTPS to api.perplexity.ai
3. Try from command line:
   ```bash
   curl -X POST https://api.perplexity.ai/chat/completions \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"llama-3.1-sonar-small-128k-online","messages":[{"role":"user","content":"test"}],"max_tokens":1}'
   ```

### Issue 7: Empty Web Search Results

**Logs show:**
```
[Perplexity] Web search successful, got 1 results
[Perplexity] Extracted answer length: 0
[Perplexity] Citations count: 0
```

**Solution:**
- Check Perplexity response format in logs
- May be a model issue - try different model name
- Contact Perplexity support if persistent

---

## Verification Checklist

Use this checklist to verify web search is working:

- [ ] Backend is running (`npm run dev`)
- [ ] Perplexity API key is configured in Settings
- [ ] Settings have been saved successfully
- [ ] Query contains at least one trigger keyword
- [ ] Backend logs show `hasPerplexityKey: true`
- [ ] Backend logs show `Should use web search: true`
- [ ] Backend logs show `Triggering web search...`
- [ ] Backend logs show `Response status: 200 OK`
- [ ] Backend logs show `Web search completed successfully`
- [ ] Response includes web search information

---

## Manual API Test

Test Perplexity API directly:

```bash
curl -X POST https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.1-sonar-small-128k-online",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "What are the latest AI trends?"
      }
    ],
    "max_tokens": 500,
    "temperature": 0.2,
    "return_citations": true
  }'
```

**Expected Response:**
```json
{
  "id": "...",
  "model": "llama-3.1-sonar-small-128k-online",
  "created": 1234567890,
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Based on recent trends, AI is..."
      },
      "finish_reason": "stop"
    }
  ],
  "citations": [
    "https://example.com/article1",
    "https://example.com/article2"
  ]
}
```

---

## Debug Commands

### Check Preferences File
```bash
# Windows
type .cs720\preferences.json

# Mac/Linux
cat .cs720/preferences.json
```

### Watch Backend Logs
```bash
cd services/backend
npm run dev | grep -E "\[LLM\]|\[Perplexity\]"
```

### Test Query via API
```bash
curl -X POST http://localhost:3001/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "general",
    "query": "What are the latest AI trends?"
  }'
```

---

## Web Search Trigger Keywords

**Full list of keywords that trigger web search:**

**Temporal:**
- `latest`
- `recent`
- `news`
- `current`
- `today`

**Business:**
- `industry`
- `trend`
- `market`
- `competitor`

**General Knowledge:**
- `what is`
- `who is`
- `how to`
- `explain`

**Case insensitive** - works with any capitalization.

---

## Example Output

### Successful Web Search

**Query:** "What are the latest AI trends?"

**Backend Logs:**
```
[LLM] ========== Starting Query ==========
[LLM] Query: What are the latest AI trends?
[LLM] Preferences loaded: {
  preferredModel: 'ollama',
  hasNaiUrl: false,
  hasNaiKey: false,
  hasPerplexityKey: true,
  naiModel: undefined
}
[LLM] Web search check:
  - Perplexity API key configured: true
  - Should use web search: true
[LLM] Triggering web search...
[Perplexity] Performing web search for query: What are the latest AI trends?
[Perplexity] API key length: 56
[Perplexity] Request body: {
  "model": "llama-3.1-sonar-small-128k-online",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant that provides concise, factual information from web search."
    },
    {
      "role": "user",
      "content": "What are the latest AI trends?"
    }
  ],
  "max_tokens": 500,
  "temperature": 0.2,
  "return_citations": true
}
[Perplexity] Response status: 200 OK
[Perplexity] Response data: {
  "id": "abc123",
  "choices": [
    {
      "message": {
        "content": "Recent AI trends include multimodal models, AI agents, and improved reasoning capabilities..."
      }
    }
  ],
  "citations": [
    "https://example.com/ai-trends-2024",
    "https://example.com/ai-developments"
  ]
}
[Perplexity] Web search successful, got 1 results
[Perplexity] Extracted answer length: 342
[Perplexity] Citations count: 2
[LLM] Web search completed successfully
[LLM] Web search results: {
  answer: 'Recent AI trends include...',
  citations: ['https://...', 'https://...']
}
```

**API Response Metadata:**
```json
{
  "metadata": {
    "model": "gemma3:270m",
    "responseTime": 3456,
    "endpoint": "local",
    "confidence": 0.75,
    "webSearchUsed": true
  }
}
```

---

## Next Steps

1. **Restart Backend:**
   ```bash
   cd services/backend
   npm run dev
   ```

2. **Configure Perplexity API Key** in Settings

3. **Test with trigger query** like "What are the latest AI trends?"

4. **Watch backend logs** for detailed debugging info

5. **Report issues** with full log output for investigation

---

**Status:** Enhanced with comprehensive logging
**Build:** Backend rebuilt successfully
**Action:** Restart backend and test with logs
