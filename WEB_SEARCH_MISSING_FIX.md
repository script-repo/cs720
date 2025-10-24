# Web Search Results Missing from Prompt - Fix

## The Problem

User asked: "What are the latest news?"

Perplexity searched and found answers, but Ollama responded:
```
Okay, I understand. I will analyze the provided web search results and provide the most
current information based on the customer context. I will also cite my sources. I am ready
to assist you further. Please provide me with the web search results.
```

This means:
- ✅ System prompt correctly tells Ollama to use web search
- ✅ User prompt correctly says "Prioritize the Web Search Results above"
- ❌ **But the actual web search results are NOT in the prompt!**

## Root Cause Analysis

Ollama is asking for web search results because the prompt says to use them, but they're not actually included. This happens when:

1. **`context.webSearch.answer` is empty/undefined**
   - Perplexity returns data, but answer extraction fails
   - Or Perplexity returns empty content

2. **Web search section is skipped**
   - The if condition `if (context.webSearch.answer && context.webSearch.answer.length > 0)` fails
   - So the "=== Web Search Results ===" section is never added

## The Fix

Added defensive logging in `buildUserPrompt` to detect the issue:

### Before (Lines 392-406)
```typescript
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
```

**Problem:** Doesn't check if answer exists before adding it. If answer is empty, adds empty section.

### After (Lines 392-419)
```typescript
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
```

**Fix:**
- ✅ Checks if answer exists AND has content
- ✅ Logs detailed info about web search object
- ✅ Shows error if answer is missing
- ✅ Dumps full webSearch object for debugging

## Debugging with New Logs

### Expected Log Flow (Success)

```
[Perplexity] === FULL ANSWER ===
<Perplexity's answer about latest news>
[Perplexity] === END WEB SEARCH RESULTS ===

[LLM] Adding web search results to context
[LLM] Web search answer length: 1234

[buildUserPrompt] Web search detected in context
[buildUserPrompt] context.webSearch.answer: <answer text>
[buildUserPrompt] Answer exists: true
[buildUserPrompt] Answer length: 1234
[buildUserPrompt] Web search section added to prompt

[Ollama] === FULL USER PROMPT ===
Customer Query: What are the latest news?

Available Context:

=== Web Search Results ===
<Perplexity's answer>

Sources:
1. https://...

IMPORTANT: Prioritize the Web Search Results above...
```

### Actual Log Flow (Failure)

What we'll likely see:

```
[Perplexity] === FULL ANSWER ===
[Perplexity] === END WEB SEARCH RESULTS ===

[LLM] Adding web search results to context
[LLM] Web search answer length: 0  <-- PROBLEM: Empty!

[buildUserPrompt] Web search detected in context
[buildUserPrompt] context.webSearch.answer: undefined  <-- PROBLEM!
[buildUserPrompt] Answer exists: false  <-- PROBLEM!
[buildUserPrompt] Answer length: 0
[buildUserPrompt] ERROR: Web search answer is empty or undefined!
[buildUserPrompt] Full webSearch object: { answer: "", citations: [] }  <-- Shows structure

[Ollama] === FULL USER PROMPT ===
Customer Query: What are the latest news?

Available Context:

<No web search section!>

IMPORTANT: Prioritize the Web Search Results above...  <-- Instruction with no data!
```

## Possible Causes

### 1. Perplexity Returns Empty Response
**Symptoms:** `[Perplexity] Extracted answer length: 0`

**Causes:**
- Query too vague ("latest news" with no topic)
- Perplexity model doesn't understand query
- API rate limiting/throttling
- Service issue on Perplexity side

**Solutions:**
- Try more specific query: "What are the latest AI news?"
- Check Perplexity dashboard for errors
- Try different model (sonar-pro instead of sonar)

### 2. Answer Extraction Fails
**Symptoms:**
```
[Perplexity] Response data: {...}  <-- Has data
[Perplexity] Extracted answer length: 0  <-- But answer is empty
```

**Causes:**
- Response structure changed
- `data.choices[0].message.content` is undefined
- Different response format for some queries

**Solutions:**
- Check full Perplexity response data in logs
- Verify response structure matches expected format
- Update answer extraction logic if needed

### 3. Context Object Mutation
**Symptoms:**
```
[LLM] Web search answer length: 1234  <-- Has content here
[buildUserPrompt] Answer length: 0  <-- But lost by here
```

**Causes:**
- Context object modified between calls
- Shallow copy issue
- Race condition

**Solutions:**
- Check for any code modifying context
- Ensure deep copy of context
- Add logging immediately before queryOllama call

## Testing Steps

1. **Restart backend:**
   ```bash
   cd services/backend
   npm run dev
   ```

2. **Try the same query:**
   "What are the latest news?"

3. **Check logs for these specific markers:**

   **Check 1: Did Perplexity return content?**
   ```
   Look for: [Perplexity] === FULL ANSWER ===
   Expected: Should show answer text
   If empty: Perplexity issue
   ```

   **Check 2: Was answer extracted?**
   ```
   Look for: [Perplexity] Extracted answer length: X
   Expected: X > 0
   If 0: Extraction issue
   ```

   **Check 3: Was answer in context?**
   ```
   Look for: [LLM] Web search answer length: X
   Expected: X > 0
   If 0: Context augmentation issue
   ```

   **Check 4: Did buildUserPrompt receive it?**
   ```
   Look for: [buildUserPrompt] Answer length: X
   Expected: X > 0
   If 0: Context passing issue
   ```

   **Check 5: Was it added to prompt?**
   ```
   Look for: [buildUserPrompt] Web search section added to prompt
   Expected: Should see this message
   If not: Check error message above it
   ```

4. **If you see the error:**
   ```
   [buildUserPrompt] ERROR: Web search answer is empty or undefined!
   [buildUserPrompt] Full webSearch object: {...}
   ```

   **Copy the full webSearch object** - this will show us the exact structure and help identify the problem.

## Likely Issues & Quick Fixes

### Issue: "latest news" is too vague
**Quick Fix:** Try more specific query:
- "What are the latest AI news?"
- "What are the latest tech news?"
- "What are recent developments in quantum computing?"

### Issue: Perplexity returns empty for generic queries
**Quick Fix:** Add a fallback message when answer is empty:

```typescript
if (!answer || answer.length === 0) {
  console.error('[Perplexity] WARNING: Empty answer received from Perplexity!');
  // Return a helpful error instead of empty
  return {
    answer: 'No current information available for this query. Please try a more specific question.',
    citations: []
  };
}
```

### Issue: Sonar model doesn't handle generic queries well
**Quick Fix:** Try sonar-pro model instead:
- Go to Settings → AI Settings
- Change Perplexity Model to "Sonar Pro"
- Try query again

## Files Modified

**services/backend/src/services/llmService.ts** (Lines 392-419)

Added:
- Defensive check for answer existence
- Detailed logging of webSearch object
- Error logging when answer is missing
- JSON dump of full webSearch object

## Next Steps

1. Restart backend with new logging
2. Try the query again: "What are the latest news?"
3. Collect the logs showing:
   - `[Perplexity] === FULL ANSWER ===` section
   - `[buildUserPrompt]` log messages
   - `[buildUserPrompt] Full webSearch object:` output
4. Share these logs so we can identify the exact issue

## Status

✅ Defensive logging added
✅ Error detection implemented
✅ Debug output enhanced
🔄 Waiting for test results to identify root cause
