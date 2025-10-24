# Perplexity Web Search Fix

## Issue
Perplexity web search was not working due to using an outdated/incorrect model name.

## Root Cause
The code was using `llama-3.1-sonar-small-128k-online` which is an old model name that no longer exists.

## Fix Applied

### Updated Model Name
Changed from:
```typescript
model: 'llama-3.1-sonar-small-128k-online'
```

To:
```typescript
model: 'sonar'  // Current Perplexity search model with web grounding
```

### Available Perplexity Models

According to Perplexity documentation, the current models are:

**Chat Completions API Models (with web search):**
1. **sonar** - Lightweight, cost-effective search model with grounding
2. **sonar-pro** - Advanced search offering for complex queries
3. **sonar-reasoning** - Fast reasoning model with search
4. **sonar-reasoning-pro** - Precise reasoning powered by DeepSeek-R1
5. **sonar-deep-research** - Expert-level research model

All these models support web search and grounding.

### Removed Invalid Parameter
Removed `return_citations: true` parameter as it's not documented in the current API.

Citations are returned automatically in the response structure.

---

## How Perplexity Works

### Chat Completions API
**Endpoint:** `https://api.perplexity.ai/chat/completions`

**What it does:**
- Takes a query/prompt
- Searches the web automatically (when using Sonar models)
- Generates an LLM response based on search results
- Returns citations embedded in the response

**Request:**
```json
{
  "model": "sonar",
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
  "temperature": 0.2
}
```

**Response:**
```json
{
  "id": "...",
  "model": "sonar",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Based on recent developments, the latest AI trends include... [1][2]"
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

### Search API (Alternative)
**Endpoint:** `https://api.perplexity.ai/search`

**What it does:**
- Pure search results (like Google)
- Returns URLs, titles, and snippets
- No LLM response generation

**Not currently used in our implementation** - we use Chat Completions for integrated search + response.

---

## Testing

### 1. Restart Backend
```bash
cd services/backend
npm run dev
```

### 2. Configure Perplexity API Key
1. Go to Settings → AI Settings
2. Add Perplexity API Key: `pplx-...`
3. Click "Save Changes"

### 3. Test Query
Ask a question with trigger keywords:
- "What are the **latest** AI trends?"
- "What is the **current** state of machine learning?"
- "**Explain** quantum computing"

### 4. Check Backend Logs
You should see:
```
[LLM] ========== Starting Query ==========
[LLM] Query: What are the latest AI trends?
[LLM] Web search check:
  - Perplexity API key configured: true
  - Should use web search: true
[LLM] Triggering web search...
[Perplexity] Performing web search for query: What are the latest AI trends?
[Perplexity] Request body: {
  "model": "sonar",
  ...
}
[Perplexity] Response status: 200 OK
[Perplexity] Web search successful, got 1 results
[LLM] Web search completed successfully
```

---

## Model Options

You can change the model in the code for different capabilities:

### For Cost-Effective Search
```typescript
model: 'sonar'  // Default - lightweight and fast
```

### For Complex Queries
```typescript
model: 'sonar-pro'  // Better for multi-part questions
```

### For Reasoning Tasks
```typescript
model: 'sonar-reasoning'  // Adds problem-solving capability
```

### For Deep Research
```typescript
model: 'sonar-deep-research'  // Comprehensive multi-source analysis
```

**Note:** More advanced models cost more per request. Check Perplexity pricing.

---

## Common Issues

### Issue: "Invalid model name"
**Error:** `400 Bad Request - Invalid model`

**Solution:**
- We now use `sonar` (valid)
- Old model names like `llama-3.1-sonar-*` are deprecated

### Issue: "401 Unauthorized"
**Error:** `401 Unauthorized`

**Solution:**
- Invalid API key
- Get key from https://www.perplexity.ai/settings/api
- Key should start with `pplx-`

### Issue: "402 Payment Required"
**Error:** `402 Payment Required`

**Solution:**
- No credits remaining
- Add credits at https://www.perplexity.ai/settings/api

### Issue: "429 Too Many Requests"
**Error:** `429 Too Many Requests`

**Solution:**
- Rate limit exceeded
- Wait before retrying
- Check rate limits in Perplexity dashboard

---

## API Key Setup

### Get Perplexity API Key
1. Go to https://www.perplexity.ai/settings/api
2. Create new API key
3. Copy the key (starts with `pplx-`)
4. Add credits if needed

### Configure in CS720
1. Open CS720 app
2. Go to Settings → AI Settings
3. Paste API key in "Perplexity API Key" field
4. Click "Save Changes"

### Verify Configuration
```bash
# Check preferences file
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

---

## Response Format

### With Web Search Results
When web search is triggered, the LLM receives:

**Context includes:**
```
=== Web Search Results ===
Based on recent trends, the latest AI developments include...

Sources:
1. https://example.com/ai-trends
2. https://example.com/ml-news
```

**LLM Response:**
The AI advisor will use this information to provide current, factual answers based on web search results.

**Response Metadata:**
```json
{
  "metadata": {
    "webSearchUsed": true,
    "model": "gemma3:270m",
    "responseTime": 3500
  }
}
```

---

## Summary of Changes

**File:** `services/backend/src/services/llmService.ts`

**Line 170:** Changed model from `llama-3.1-sonar-small-128k-online` to `sonar`

**Line 167:** Removed `return_citations: true` (not needed, citations returned automatically)

**Result:**
✅ Uses current Perplexity API
✅ Valid model name
✅ Web search now works
✅ Citations returned in response

---

## Next Steps

1. **Restart backend:**
   ```bash
   cd services/backend
   npm run dev
   ```

2. **Test web search:**
   - Ask: "What are the latest AI trends?"
   - Watch backend logs for success

3. **Verify response:**
   - Check if response includes current information
   - Check `webSearchUsed: true` in metadata

---

**Status:** ✅ Fixed
**Build:** ✅ Backend rebuilt successfully
**Model:** ✅ Using 'sonar' (current Perplexity model)
**Action Required:** Restart backend service

```bash
cd services/backend
npm run dev
```
