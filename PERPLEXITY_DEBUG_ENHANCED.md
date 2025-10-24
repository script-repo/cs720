# Enhanced Perplexity Debug Logging

## Problem

Perplexity web search logs show that a search is performed, but the results are not being incorporated into the chat response.

## Enhanced Logging Added

To debug this issue, I've added comprehensive logging throughout the web search flow.

## What Will Be Logged

### 1. Perplexity Response
**Location:** After Perplexity API call

```
[Perplexity] Response data: <full JSON response>
[Perplexity] Web search successful, got X results
[Perplexity] Extracted answer length: X
[Perplexity] Citations count: X
[Perplexity] === FULL ANSWER ===
<complete answer from Perplexity>
[Perplexity] === CITATIONS ===
<array of citation URLs>
[Perplexity] === END WEB SEARCH RESULTS ===
[Perplexity] WARNING: Empty answer received from Perplexity!  (if empty)
```

### 2. Context Augmentation
**Location:** After web search results added to context

```
[LLM] Adding web search results to context
[LLM] Web search answer length: X
[LLM] Web search citations: X
```

### 3. Ollama Prompt Details
**Location:** Before sending to Ollama

```
[Ollama] System prompt length: X
[Ollama] User prompt length: X
[Ollama] Has web search in context: true/false
[Ollama] Web search answer preview: <first 100 chars>
[Ollama] Full web search answer: <complete answer>
[Ollama] Web search citations: <array of URLs>
[Ollama] === FULL SYSTEM PROMPT ===
<complete system prompt sent to Ollama>
[Ollama] === FULL USER PROMPT ===
<complete user prompt sent to Ollama>
[Ollama] === END PROMPTS ===
```

## How to Use This Logging

### Step 1: Restart Backend
```bash
cd services/backend
npm run dev
```

### Step 2: Perform a Web Search Query
In the chat, ask a question with trigger keywords:
- "What are the **latest** AI trends?"
- "What is the **current** state of cloud computing?"
- "What are **recent** developments in quantum computing?"

### Step 3: Analyze the Logs

Check the backend console output for the following sections:

#### Check 1: Did Perplexity Return Data?
Look for:
```
[Perplexity] === FULL ANSWER ===
```

**Expected:** Should show a detailed answer about the topic
**If empty:** Perplexity API issue - check API key, credits, model

#### Check 2: Was Data Added to Context?
Look for:
```
[LLM] Adding web search results to context
[LLM] Web search answer length: <should be > 0>
```

**Expected:** Answer length should be greater than 0
**If 0:** Perplexity returned empty response

#### Check 3: Did Ollama Receive the Data?
Look for:
```
[Ollama] Has web search in context: true
[Ollama] Full web search answer: <should match Perplexity answer>
```

**Expected:** Should show `true` and the full answer
**If false:** Context not being passed correctly

#### Check 4: Are Prompts Correct?
Look for:
```
[Ollama] === FULL SYSTEM PROMPT ===
```

**Expected to contain:**
```
IMPORTANT: When web search results are provided, prioritize them for current/latest information.
```

And:
```
[Ollama] === FULL USER PROMPT ===
```

**Expected to contain:**
```
=== Web Search Results ===
<Perplexity's answer>

Sources:
1. <URL>
2. <URL>

...

IMPORTANT: Prioritize the Web Search Results above for answering this query...
```

## Troubleshooting Decision Tree

```
Start: Web search not working

├─ Check: [Perplexity] === FULL ANSWER ===
│  ├─ Is answer present and non-empty?
│  │  ├─ YES → Continue
│  │  └─ NO → PROBLEM: Perplexity API issue
│  │     ├─ Check API key is valid
│  │     ├─ Check Perplexity credits/quota
│  │     ├─ Check model name is correct
│  │     └─ Check network connectivity
│  │
│  ├─ Check: [LLM] Web search answer length: X
│  │  ├─ Is length > 0?
│  │  │  ├─ YES → Continue
│  │  │  └─ NO → PROBLEM: Answer not extracted
│  │  │     └─ Check Perplexity response format
│  │
│  ├─ Check: [Ollama] Has web search in context: true
│  │  ├─ Is it true?
│  │  │  ├─ YES → Continue
│  │  │  └─ NO → PROBLEM: Context not passed
│  │  │     └─ Check context passing in queryLLM → queryOllama
│  │
│  ├─ Check: [Ollama] === FULL USER PROMPT ===
│  │  ├─ Does it contain "=== Web Search Results ==="?
│  │  │  ├─ YES → Continue
│  │  │  └─ NO → PROBLEM: Prompt building issue
│  │  │     └─ Check buildUserPrompt method
│  │
│  ├─ Check: [Ollama] === FULL USER PROMPT ===
│  │  ├─ Does it contain the Perplexity answer?
│  │  │  ├─ YES → Continue
│  │  │  └─ NO → PROBLEM: Answer not in prompt
│  │  │     └─ Check context.webSearch.answer in buildUserPrompt
│  │
│  └─ Check: Ollama response
│     ├─ Does response reference web search content?
│     │  ├─ YES → SUCCESS!
│     │  └─ NO → PROBLEM: Ollama ignoring instructions
│     │     ├─ Check if IMPORTANT instruction is in prompt
│     │     ├─ Try different Ollama model
│     │     └─ Increase Ollama context window
```

## Common Issues

### Issue 1: Empty Perplexity Answer
**Symptoms:**
```
[Perplexity] Extracted answer length: 0
[Perplexity] WARNING: Empty answer received from Perplexity!
```

**Causes:**
- Perplexity API error
- Invalid model name
- Insufficient credits
- API key revoked

**Solutions:**
1. Check Perplexity response data for errors
2. Verify model name in settings (should be "sonar", "sonar-pro", etc.)
3. Check Perplexity account has credits
4. Regenerate API key if needed

### Issue 2: Context Not Passed to Ollama
**Symptoms:**
```
[LLM] Web search answer length: 1234
[Ollama] Has web search in context: false
```

**Causes:**
- Context object not passed correctly
- Context reset between calls

**Solutions:**
1. Check queryLLM passes context to queryOllama
2. Verify context spread operator: `{ ...context, webSearch: webSearchResults }`
3. Check for any context mutations

### Issue 3: Web Search Not in Prompt
**Symptoms:**
```
[Ollama] Has web search in context: true
[Ollama] === FULL USER PROMPT ===
<prompt doesn't contain "=== Web Search Results ===">
```

**Causes:**
- buildUserPrompt not checking context.webSearch
- Typo in context key

**Solutions:**
1. Verify buildUserPrompt checks `if (context?.webSearch)`
2. Check context key is exactly "webSearch"
3. Verify prompt string concatenation

### Issue 4: Ollama Ignores Web Search
**Symptoms:**
- Prompt contains web search results
- Prompt contains IMPORTANT instruction
- But Ollama response doesn't use them

**Causes:**
- Small Ollama model can't follow complex instructions
- Context window too small
- Model not good at instruction following

**Solutions:**
1. Try larger model: `llama3:8b` instead of small models
2. Increase max_tokens in Ollama request
3. Try different model with better instruction following
4. Make instructions even more explicit

## Files Modified

**services/backend/src/services/llmService.ts**

### Added Perplexity Logging (Lines 226-234)
```typescript
console.log('[Perplexity] === FULL ANSWER ===');
console.log(answer);
console.log('[Perplexity] === CITATIONS ===');
console.log(JSON.stringify(citations, null, 2));
console.log('[Perplexity] === END WEB SEARCH RESULTS ===');

if (!answer || answer.length === 0) {
  console.error('[Perplexity] WARNING: Empty answer received from Perplexity!');
}
```

### Added Ollama Logging (Lines 246-258)
```typescript
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
```

## Next Steps

1. **Restart backend with new logging:**
   ```bash
   cd services/backend
   npm run dev
   ```

2. **Perform a web search query:**
   Ask: "What are the latest AI trends?"

3. **Collect logs:**
   Copy the entire backend console output

4. **Analyze using decision tree above:**
   - Find each log section
   - Verify data is present
   - Identify where the flow breaks

5. **Share logs if issue persists:**
   Include the full log output from:
   - `[Perplexity] === FULL ANSWER ===` section
   - `[Ollama] === FULL SYSTEM PROMPT ===` section
   - `[Ollama] === FULL USER PROMPT ===` section
   - Final Ollama response

## Expected Successful Flow

When everything works correctly, you should see:

```
[LLM] ========== Starting Query ==========
[LLM] Query: What are the latest AI trends?
[LLM] Triggering web search...

[Perplexity] Performing web search for query: What are the latest AI trends?
[Perplexity] Using model: sonar
[Perplexity] Response status: 200 OK
[Perplexity] Web search successful, got 1 results
[Perplexity] Extracted answer length: 1234
[Perplexity] Citations count: 3
[Perplexity] === FULL ANSWER ===
Recent AI trends include multimodal models, AI agents with improved reasoning...
[Perplexity] === CITATIONS ===
[
  "https://example.com/ai-trends",
  "https://example.com/ml-news",
  "https://example.com/tech-updates"
]
[Perplexity] === END WEB SEARCH RESULTS ===

[LLM] Web search completed successfully
[LLM] Adding web search results to context
[LLM] Web search answer length: 1234
[LLM] Web search citations: 3

[Ollama] System prompt length: 567
[Ollama] User prompt length: 1567
[Ollama] Has web search in context: true
[Ollama] Web search answer preview: Recent AI trends include multimodal models, AI agents with improved reasoning...
[Ollama] Full web search answer: Recent AI trends include multimodal models, AI agents with improved reasoning capabilities, and significant advancements in natural language processing...
[Ollama] Web search citations: [ 'https://example.com/ai-trends', ... ]

[Ollama] === FULL SYSTEM PROMPT ===
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

[Ollama] === FULL USER PROMPT ===
Customer Query: What are the latest AI trends?

Available Context:

=== Web Search Results ===
Recent AI trends include multimodal models, AI agents with improved reasoning capabilities...

Sources:
1. https://example.com/ai-trends
2. https://example.com/ml-news
3. https://example.com/tech-updates

IMPORTANT: Prioritize the Web Search Results above for answering this query, as they contain the most current information. Use the customer context data as supplementary information if relevant. Always cite your sources.

[Ollama] === END PROMPTS ===

<Ollama generates response using web search data>
```

## Status

✅ Enhanced logging implemented
✅ Covers all steps in web search flow
✅ Detailed troubleshooting guide provided

## Action Required

Restart backend and perform test query to collect logs.
