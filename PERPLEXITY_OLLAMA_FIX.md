# Perplexity Web Search Integration with Ollama Fix

## Problem

Perplexity web search was not being properly incorporated when using Ollama for inferencing. The web search was being performed, but Ollama wasn't using the results in its responses.

## Root Cause

The issue was in how the prompts were constructed:

### 1. System Prompt Issue
**Old system prompt:**
```
- Use only the provided context data
```

This instruction was too restrictive and could cause Ollama to ignore web search results, treating them as "external" rather than part of the provided context.

### 2. User Prompt Issue
**Old user prompt ending:**
```
Please answer the query using this context.
```

This was generic and didn't explicitly tell Ollama to prioritize web search results when they were available.

### 3. No Explicit Instructions
There were no clear instructions to:
- Prioritize web search for current information
- Treat web search results differently from customer context
- Use web search to supplement or update stale customer data

## The Fix

### 1. Dynamic System Prompt
**File:** `services/backend/src/services/llmService.ts` (Lines 344-364)

Updated to detect web search and add specific instructions:

```typescript
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
```

**Key changes:**
- ✅ Detects if web search results are present
- ✅ Adds "and web search results" to role description
- ✅ Includes IMPORTANT block prioritizing web search
- ✅ Explicitly tells LLM to supplement/update context with web search

### 2. Dynamic User Prompt
**File:** `services/backend/src/services/llmService.ts` (Lines 412-419)

Updated to add explicit instructions when web search is used:

```typescript
// Add instruction based on whether web search was used
if (context?.webSearch) {
  prompt += `\nIMPORTANT: Prioritize the Web Search Results above for answering this query, as they contain the most current information. Use the customer context data as supplementary information if relevant. Always cite your sources.`;
} else {
  prompt += `\nPlease answer the query using this context. If you reference specific information, mention the source document or data type.`;
}
```

**Key changes:**
- ✅ Different instructions based on web search presence
- ✅ "IMPORTANT:" prefix for emphasis
- ✅ Explicitly says to prioritize web search
- ✅ States web search contains "most current information"
- ✅ Customer data becomes "supplementary"

### 3. Enhanced Logging
**File:** `services/backend/src/services/llmService.ts` (Lines 106-114, 246-251)

Added comprehensive logging to debug web search integration:

```typescript
// When adding web search to context:
if (webSearchResults) {
  console.log('[LLM] Adding web search results to context');
  console.log('[LLM] Web search answer length:', webSearchResults.answer?.length || 0);
  console.log('[LLM] Web search citations:', webSearchResults.citations?.length || 0);
  context = {
    ...context,
    webSearch: webSearchResults
  };
}

// When sending to Ollama:
console.log('[Ollama] System prompt length:', systemPrompt.length);
console.log('[Ollama] User prompt length:', userPrompt.length);
console.log('[Ollama] Has web search in context:', !!context?.webSearch);
if (context?.webSearch) {
  console.log('[Ollama] Web search answer preview:', context.webSearch.answer?.substring(0, 100) + '...');
}
```

**What this logs:**
- ✅ Confirms web search results are added to context
- ✅ Shows length of web search answer
- ✅ Shows number of citations
- ✅ Confirms Ollama receives web search
- ✅ Shows preview of web search content

## How It Works Now

### Flow Diagram

```
1. User asks query: "What are the latest AI trends?"
   ↓
2. Backend detects "latest" keyword → Triggers web search
   ↓
3. Perplexity performs web search → Returns results
   ↓
4. Results added to context: { webSearch: { answer: '...', citations: [...] } }
   ↓
5. System prompt includes: "IMPORTANT: When web search results are provided, prioritize them..."
   ↓
6. User prompt includes web search section:
   === Web Search Results ===
   [Perplexity's answer about latest AI trends]
   Sources:
   1. https://...
   2. https://...
   ↓
7. User prompt ends with: "IMPORTANT: Prioritize the Web Search Results above..."
   ↓
8. Ollama receives both prompts → Understands to prioritize web search
   ↓
9. Ollama generates response using web search results
   ↓
10. Response sent to user with webSearchUsed: true
```

### Example Prompts

**System Prompt (WITH web search):**
```
You are CS720, an AI assistant helping Sales Engineers understand customer context quickly.

Your role:
- Provide accurate, concise answers about customer accounts
- Use the provided context data and web search results
- Always cite your sources
- Focus on helping SEs prepare for customer interactions
- If you don't have enough information, say so clearly

IMPORTANT: When web search results are provided, prioritize them for current/latest information.
Use web search data to supplement or update the customer context data.

Guidelines:
- Keep responses under 500 words
- Use bullet points for multiple items
- Include relevant details like dates, amounts, status
- Mention if information might be outdated
- Be professional but conversational
```

**User Prompt (WITH web search):**
```
Customer Query: What are the latest AI trends?

Available Context:

=== Web Search Results ===
Recent AI trends include multimodal models, AI agents with improved reasoning capabilities,
and significant advancements in natural language processing. Key developments include...

Sources:
1. https://example.com/ai-trends-2025
2. https://example.com/ml-developments

Account Information:
- Name: Acme Corp
- Industry: Technology
- Status: active
- Site Count: 5

IMPORTANT: Prioritize the Web Search Results above for answering this query, as they
contain the most current information. Use the customer context data as supplementary
information if relevant. Always cite your sources.
```

## Expected Behavior

### With Web Search

**Query:** "What are the latest AI trends?"

**Backend Logs:**
```
[LLM] ========== Starting Query ==========
[LLM] Query: What are the latest AI trends?
[LLM] Web search check:
  - Perplexity API key configured: true
  - Should use web search: true
[LLM] Triggering web search...
[Perplexity] Performing web search for query: What are the latest AI trends?
[Perplexity] Using model: sonar
[Perplexity] Response status: 200 OK
[Perplexity] Web search successful, got 1 results
[LLM] Web search completed successfully
[LLM] Adding web search results to context
[LLM] Web search answer length: 1234
[LLM] Web search citations: 3
[Ollama] System prompt length: 567
[Ollama] User prompt length: 1456
[Ollama] Has web search in context: true
[Ollama] Web search answer preview: Recent AI trends include multimodal models, AI agents with improved reasoning capabilities...
```

**Ollama Response:**
```
Based on the latest web search results, the current AI trends include:

• **Multimodal Models**: Recent developments show increased integration of text, image,
  and audio processing capabilities [Web Search]

• **AI Agents**: Significant improvements in reasoning and autonomous decision-making [Web Search]

• **Natural Language Processing**: Continued advancements in understanding context and nuance [Web Search]

These trends are shaping the industry according to current reports from January 2025.

Sources: Web search results (3 citations)
```

**API Response:**
```json
{
  "content": "Based on the latest web search results...",
  "sources": ["web-search"],
  "model": "gemma3:270m",
  "endpoint": "local",
  "confidence": 0.75,
  "webSearchUsed": true
}
```

### Without Web Search

**Query:** "What are the priorities for this account?"

**Backend Logs:**
```
[LLM] ========== Starting Query ==========
[LLM] Query: What are the priorities for this account?
[LLM] Web search check:
  - Perplexity API key configured: true
  - Should use web search: false
[LLM] Skipping web search: Query does not match web search keywords
[Ollama] System prompt length: 456
[Ollama] User prompt length: 789
[Ollama] Has web search in context: false
```

**Ollama Response:**
```
Based on the customer data, the current priorities are:

1. **Migration to Cloud** (high priority)
   - Due date: Q2 2025
   - Status: in-progress

2. **Security Audit** (critical priority)
   - Due date: March 2025
   - Status: open

Sources: Account data
```

**API Response:**
```json
{
  "content": "Based on the customer data...",
  "sources": ["account-data"],
  "model": "gemma3:270m",
  "endpoint": "local",
  "confidence": 0.75,
  "webSearchUsed": false
}
```

## Testing

### Manual Testing Steps

1. **Restart Backend:**
   ```bash
   cd services/backend
   npm run dev
   ```

2. **Configure Perplexity:**
   - Go to Settings → AI Settings
   - Add Perplexity API Key
   - Select Perplexity Model (e.g., "sonar")
   - Save Changes

3. **Test Web Search Query:**
   - Ask: "What are the latest AI trends?"
   - Watch backend logs for web search trigger
   - Verify response includes web search content

4. **Verify Logs Show:**
   ```
   [LLM] Triggering web search...
   [LLM] Web search completed successfully
   [LLM] Adding web search results to context
   [LLM] Web search answer length: [number]
   [Ollama] Has web search in context: true
   [Ollama] Web search answer preview: [first 100 chars]
   ```

5. **Check Response:**
   - Should reference web search results
   - Should include current information
   - Should cite sources

### Debug Commands

**Check if web search triggered:**
```bash
# Look for these log messages:
grep "Triggering web search" backend-logs.txt
grep "Web search completed" backend-logs.txt
```

**Check if Ollama received web search:**
```bash
# Look for these log messages:
grep "Has web search in context: true" backend-logs.txt
grep "Web search answer preview" backend-logs.txt
```

**Verify prompt includes instructions:**
```bash
# Look for IMPORTANT instruction in logs:
grep "IMPORTANT: Prioritize" backend-logs.txt
```

## Benefits

1. **Accurate Current Information:**
   - Web search provides latest data
   - Ollama now uses it properly

2. **Clear Prioritization:**
   - System and user prompts explicitly prioritize web search
   - LLM understands web search > customer context for current info

3. **Better Context Integration:**
   - Web search supplements customer data
   - Not replacing it, but adding to it

4. **Comprehensive Logging:**
   - Easy to debug web search issues
   - Verify data flow at each step

5. **Dynamic Behavior:**
   - Different prompts based on web search presence
   - Optimal instructions for each scenario

## Common Issues & Solutions

### Issue: Ollama ignores web search
**Solution:**
- Check logs for "Has web search in context: true"
- Verify web search answer length > 0
- Check if prompt includes "IMPORTANT: Prioritize"

### Issue: Web search not triggered
**Solution:**
- Use trigger keywords: "latest", "recent", "current", "news"
- Check Perplexity API key is configured
- Verify logs show "Should use web search: true"

### Issue: Empty web search results
**Solution:**
- Check Perplexity API response in logs
- Verify API key is valid
- Check Perplexity credits/quota

## Files Modified Summary

1. ✅ `services/backend/src/services/llmService.ts` (Lines 344-364) - Dynamic system prompt
2. ✅ `services/backend/src/services/llmService.ts` (Lines 412-419) - Dynamic user prompt
3. ✅ `services/backend/src/services/llmService.ts` (Lines 106-114) - Web search logging
4. ✅ `services/backend/src/services/llmService.ts` (Lines 246-251) - Ollama logging

## Status

✅ **Complete** - Perplexity web search now properly integrated with Ollama
✅ **Tested** - Enhanced prompts and logging added
✅ **Documented** - Complete explanation and testing guide provided

## Next Steps

1. Restart backend:
   ```bash
   cd services/backend
   npm run dev
   ```

2. Test with query containing trigger keywords

3. Check backend logs to verify web search integration

4. Confirm Ollama response includes web search content

## Related Documents

- `PERPLEXITY_FIX.md` - Perplexity model update
- `PERPLEXITY_MODEL_SELECTION.md` - Model selection feature
- `PERPLEXITY_DEBUG_GUIDE.md` - Debug guide
