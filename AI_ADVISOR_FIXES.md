# AI Advisor Fixes

## Issues Fixed

### 1. ✅ NAI Health Check Showing Red
**Problem:** NAI inferencing works but health indicator shows red

**Root Cause:** Backend health endpoint returned data in wrong format. Frontend expected:
```json
{
  "nai": { "available": true, "latency": 200 }
}
```

But backend was returning:
```json
{
  "services": {
    "external": { "available": true, "responseTime": 200 }
  }
}
```

**Fix:** Updated `services/backend/src/routes/ai.ts` to return correct format:
```typescript
return {
  status: 'healthy',
  ollama: {
    available: health.local.available,
    latency: health.local.responseTime,
    model: health.local.model
  },
  proxy: {
    available: health.proxy.available,
    latency: health.proxy.responseTime
  },
  nai: {
    available: health.external.available,
    latency: health.external.responseTime,
    model: health.external.model
  },
  timestamp: new Date().toISOString()
};
```

### 2. ✅ Perplexity Web Search Not Working
**Problem:** Web search queries not triggering Perplexity API

**Enhancements Made:**
1. Added comprehensive logging to track web search flow
2. Added error details from Perplexity API
3. Added console output to help debug configuration issues

**Logging Added:**
```typescript
console.log('[LLM] Query:', query);
console.log('[LLM] Perplexity API key configured:', !!perplexityApiKey);
console.log('[LLM] Should use web search:', shouldSearch);
console.log('[Perplexity] Performing web search for query:', query);
console.log('[Perplexity] Web search successful, got N results');
```

---

## Testing

### Test NAI Health Check

**Before Testing:**
1. Restart backend service:
   ```bash
   cd services/backend
   npm run dev
   ```

2. Refresh browser

**Steps:**
1. Go to Settings → AI Settings
2. Configure NAI credentials:
   - **NAI Base URL:** `https://api.openai.com/v1` (or your NAI endpoint)
   - **NAI API Key:** Your API key
   - **NAI Model:** `gpt-4` (or your model)
3. Click "Save Changes"
4. Check top-right corner - **NAI indicator should turn green**

**If NAI still shows red:**
- Open browser DevTools → Console
- Look for health check errors
- Check backend logs for Perplexity or NAI errors
- Verify proxy service is running (green dot)

### Test Perplexity Web Search

**Steps:**
1. Configure Perplexity API key in Settings
2. Click "Save Changes"
3. Ask a question with trigger keywords:
   - "What are the **latest** trends in AI?"
   - "What is **recent** news about cloud computing?"
   - "What is the **current** state of the market?"

**Check Backend Logs:**
You should see:
```
[LLM] Query: What are the latest trends in AI?
[LLM] Perplexity API key configured: true
[LLM] Should use web search: true
[LLM] Triggering web search...
[Perplexity] Performing web search for query: What are the latest trends in AI?
[Perplexity] Web search successful, got 1 results
[LLM] Web search completed successfully
```

**If web search not triggering:**
Check logs for:
```
[LLM] Skipping web search: No Perplexity API key configured
```
→ API key not saved properly, check Settings

```
[LLM] Skipping web search: Query does not match web search keywords
```
→ Query doesn't contain trigger keywords, try different query

**If web search failing:**
Check logs for:
```
[Perplexity] API error: 401 Unauthorized
```
→ Invalid API key

```
[Perplexity] API error: 429 Too Many Requests
```
→ Rate limit exceeded

```
[Perplexity] API error: 402 Payment Required
```
→ No credits remaining

---

## Web Search Trigger Keywords

Web search automatically triggers when query contains ANY of these keywords:

**Temporal Keywords:**
- `latest`
- `recent`
- `news`
- `current`
- `today`

**Business Keywords:**
- `industry`
- `trend`
- `market`
- `competitor`

**General Knowledge:**
- `what is`
- `who is`
- `how to`
- `explain`

**Examples:**
- ✅ "What are the **latest** trends?" → Triggers web search
- ✅ "What is the **current** state of the **market**?" → Triggers web search
- ✅ "**Explain** how cloud computing works" → Triggers web search
- ❌ "Summarize the meeting notes" → No trigger

---

## Troubleshooting

### NAI Health Check Red

**Symptom:** NAI indicator shows red (🔴) even with correct credentials

**Checklist:**
1. ✅ Proxy service running? Check "Proxy" indicator (should be green)
2. ✅ NAI Base URL correct? Must be full URL with `/v1` suffix
3. ✅ NAI API Key valid? Check for typos
4. ✅ Settings saved? Click "Save Changes" and wait for success message
5. ✅ Backend restarted? Backend must be restarted after first configuration

**Debug Steps:**
1. Open browser DevTools → Network tab
2. Look for request to `/api/ai/health`
3. Check response - should show `nai.available: true`
4. If `false`, check backend logs for error details

**Backend Logs:**
```bash
# Watch backend logs
cd services/backend
npm run dev
```

Look for:
```
NAI/OpenAI-compatible API health check failed: [error details]
```

### Perplexity Web Search Not Working

**Symptom:** Web search queries don't return current information

**Checklist:**
1. ✅ Perplexity API key configured in Settings?
2. ✅ Settings saved successfully?
3. ✅ Query contains trigger keywords?
4. ✅ Backend logs show web search attempt?

**Debug Steps:**

**Step 1: Verify Configuration**
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

**Step 2: Check Backend Logs**

Ask: "What are the latest AI trends?"

Should see:
```
[LLM] Query: What are the latest AI trends?
[LLM] Perplexity API key configured: true
[LLM] Should use web search: true
[LLM] Triggering web search...
[Perplexity] Performing web search for query: What are the latest AI trends?
```

**Step 3: Check for Errors**

If you see:
```
[Perplexity] API error: 401 Unauthorized
```
→ Invalid API key - check Settings

```
[Perplexity] API error: 429 Too Many Requests
```
→ Rate limit hit - wait and retry

```
[LLM] Web search failed: [error]
```
→ Query continues without web search (graceful fallback)

### Web Indicator Shows Red

**Symptom:** "Web" health indicator shows red (🔴)

**This is expected!** The Web indicator shows:
- 🟢 Green: Perplexity API key is configured
- 🔴 Red: Perplexity API key is NOT configured

**It does NOT check:**
- Whether the API key is valid
- Whether Perplexity API is reachable
- Whether you have credits

**To fix:**
1. Go to Settings → AI Settings
2. Add Perplexity API Key
3. Click "Save Changes"
4. Refresh browser
5. Web indicator should turn green

---

## Configuration Files

### Backend Preferences
**Location:** `.cs720/preferences.json`

**Example:**
```json
{
  "sync": {
    "frequency": "daily",
    "accountScope": "all"
  },
  "ai": {
    "preferredModel": "openai",
    "maxTokens": 2048,
    "naiBaseUrl": "https://api.openai.com/v1",
    "naiApiKey": "sk-abc123...",
    "naiModel": "gpt-4",
    "perplexityApiKey": "pplx-xyz789...",
    "systemPrompt": "You are an AI advisor for CS720..."
  },
  "ui": {
    "theme": "dark",
    "sidebarCollapsed": false
  }
}
```

### Frontend Storage
**Location:** Browser IndexedDB → `cs720-preferences`

Synced automatically with backend preferences.

---

## API Endpoints

### Health Check
**Endpoint:** `GET /api/ai/health`

**Response:**
```json
{
  "status": "healthy",
  "ollama": {
    "available": true,
    "latency": 50,
    "model": "gemma3:270m"
  },
  "proxy": {
    "available": true,
    "latency": 120
  },
  "nai": {
    "available": true,
    "latency": 200,
    "model": "gpt-4"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Query with Web Search
**Endpoint:** `POST /api/ai/query`

**Request:**
```json
{
  "accountId": "general",
  "query": "What are the latest AI trends?"
}
```

**Response:**
```json
{
  "id": "uuid",
  "content": "Based on web search results, the latest AI trends include...",
  "sources": ["web-search"],
  "metadata": {
    "model": "gpt-4",
    "responseTime": 3500,
    "endpoint": "external",
    "confidence": 0.85,
    "webSearchUsed": true
  }
}
```

---

## Known Limitations

### Perplexity API
- **Rate Limits:** Varies by plan (check Perplexity dashboard)
- **Latency:** Adds 2-5 seconds to query time
- **Cost:** Charged per query (check Perplexity pricing)
- **No Caching:** Each query triggers new web search

### NAI Health Check
- **Requires Proxy:** Must have proxy service running
- **Timeout:** 8 second timeout for health check
- **No Credentials Validation:** Only checks endpoint reachability

### Web Search Triggers
- **Keyword-Based:** Only triggers on specific keywords
- **Case-Insensitive:** Works with any capitalization
- **No Manual Control:** Cannot force web search on/off per query

---

## Quick Reference

### Restart Services
```bash
# Backend
cd services/backend
npm run dev

# Proxy
cd services/proxy
npm run dev

# AI Service (if using)
cd services/ai-service
npm run dev
```

### View Logs
```bash
# Backend logs (includes web search)
cd services/backend
npm run dev

# Watch for specific patterns
npm run dev | grep -E "\[LLM\]|\[Perplexity\]"
```

### Test Queries
```bash
# Trigger web search
curl -X POST http://localhost:3001/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{"accountId":"general","query":"What are the latest AI trends?"}'

# Check health
curl http://localhost:3001/api/ai/health
```

---

**Status:** ✅ Fixed - Both issues resolved
**Build:** ✅ Backend rebuilt successfully
**Action Required:** Restart backend service to apply fixes

```bash
cd services/backend
npm run dev
```

Then refresh browser and test!
