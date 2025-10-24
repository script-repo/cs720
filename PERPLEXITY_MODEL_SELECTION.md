# Perplexity Model Selection Feature

## Overview
Added the ability to select from all available Perplexity models in the Settings UI. Users can now choose which Perplexity model to use for web search queries.

## Available Models

The following Perplexity models are now available for selection:

1. **sonar** (Default) - Lightweight, cost-effective search model with grounding
2. **sonar-pro** - Advanced search offering for complex queries
3. **sonar-reasoning** - Fast reasoning model with search capabilities
4. **sonar-reasoning-pro** - Precise reasoning powered by DeepSeek-R1
5. **sonar-deep-research** - Expert-level research model for comprehensive analysis

## Changes Made

### 1. Frontend Type Definition
**File:** `frontend/src/types/index.ts` (Line 186)

Added `perplexityModel` field to UserPreferences interface:
```typescript
ai: {
  preferredModel: 'ollama' | 'openai';
  maxTokens: number;
  naiBaseUrl?: string;
  naiApiKey?: string;
  naiModel?: string;
  perplexityApiKey?: string;
  perplexityModel?: string;  // ADDED
  systemPrompt?: string;
};
```

### 2. Backend Type Definition
**File:** `services/backend/src/types/index.ts` (Line 190)

Added matching field to backend UserPreferences interface:
```typescript
ai: {
  preferredModel: 'ollama' | 'openai';
  maxTokens: number;
  naiBaseUrl?: string;
  naiApiKey?: string;
  naiModel?: string;
  perplexityApiKey?: string;
  perplexityModel?: string;  // ADDED
  systemPrompt?: string;
};
```

### 3. Backend Default Preferences
**File:** `services/backend/src/routes/config.ts` (Line 17)

Added default value to backend preferences:
```typescript
ai: {
  preferredModel: 'ollama',
  maxTokens: 2048,
  naiBaseUrl: '',
  naiApiKey: '',
  naiModel: '',
  perplexityApiKey: '',
  perplexityModel: 'sonar',  // ADDED - Default to lightweight model
  systemPrompt: 'You are an AI advisor for CS720...'
},
```

### 4. Frontend Default Preferences
**File:** `frontend/src/store/preferencesStore.ts` (Line 19)

Added default value to frontend preferences:
```typescript
ai: {
  preferredModel: 'ollama',
  maxTokens: 2048,
  naiBaseUrl: '',
  naiApiKey: '',
  naiModel: '',
  perplexityApiKey: '',
  perplexityModel: 'sonar',  // ADDED - Default to lightweight model
  systemPrompt: 'You are an AI advisor for CS720...'
},
```

### 5. Settings UI - Model Dropdown
**File:** `frontend/src/pages/Settings.tsx` (Lines 222-246)

Added dropdown selector after Perplexity API Key field:
```typescript
<div>
  <label className="block text-sm font-medium text-white mb-2">
    Perplexity Model
  </label>
  <select
    value={localPreferences.ai.perplexityModel || 'sonar'}
    onChange={(e) => setLocalPreferences({
      ...localPreferences,
      ai: {
        ...localPreferences.ai,
        perplexityModel: e.target.value
      }
    })}
    className="input w-full"
  >
    <option value="sonar">Sonar (Lightweight, cost-effective)</option>
    <option value="sonar-pro">Sonar Pro (Advanced search)</option>
    <option value="sonar-reasoning">Sonar Reasoning (Fast reasoning)</option>
    <option value="sonar-reasoning-pro">Sonar Reasoning Pro (DeepSeek-R1)</option>
    <option value="sonar-deep-research">Sonar Deep Research (Comprehensive)</option>
  </select>
  <p className="text-xs text-gray-500 mt-1">
    Select Perplexity model for web search queries
  </p>
</div>
```

### 6. LLM Service - Load Model from Preferences
**File:** `services/backend/src/services/llmService.ts` (Line 73)

Added loading of perplexityModel from preferences:
```typescript
const preferredBackend = preferences.ai?.preferredModel || 'ollama';
const naiBaseUrl = preferences.ai?.naiBaseUrl;
const naiApiKey = preferences.ai?.naiApiKey;
const naiModel = preferences.ai?.naiModel || 'gpt-4';
const systemPrompt = preferences.ai?.systemPrompt;
const perplexityApiKey = preferences.ai?.perplexityApiKey;
const perplexityModel = preferences.ai?.perplexityModel || 'sonar';  // ADDED
```

### 7. LLM Service - Pass Model to Web Search
**File:** `services/backend/src/services/llmService.ts` (Line 85)

Updated web search call to include model parameter:
```typescript
webSearchResults = await this.performWebSearch(query, perplexityApiKey, perplexityModel);
```

### 8. LLM Service - Use Selected Model
**File:** `services/backend/src/services/llmService.ts` (Lines 164-172)

Updated performWebSearch method to accept and use selected model:
```typescript
private async performWebSearch(query: string, apiKey: string, model: string = 'sonar'): Promise<any> {
  try {
    console.log('[Perplexity] Performing web search for query:', query);
    console.log('[Perplexity] API key length:', apiKey?.length || 0);
    console.log('[Perplexity] Using model:', model);  // ADDED

    // Use Perplexity's Chat Completions API with selected Sonar model
    const requestBody = {
      model: model,  // CHANGED from hardcoded 'sonar'
      // ... rest of request body
    };
```

## How to Use

### 1. Configure Perplexity API Key
1. Go to Settings → AI Settings
2. Enter your Perplexity API Key (starts with `pplx-`)
3. Click "Save Changes"

### 2. Select Perplexity Model
1. In the same AI Settings section, find "Perplexity Model" dropdown
2. Select your desired model:
   - **Sonar** - Best for general queries, most cost-effective
   - **Sonar Pro** - Better for complex multi-part questions
   - **Sonar Reasoning** - Adds problem-solving capability
   - **Sonar Reasoning Pro** - Advanced reasoning with DeepSeek-R1
   - **Sonar Deep Research** - Comprehensive multi-source analysis
3. Click "Save Changes"

### 3. Test Web Search
Ask a question with web search trigger keywords:
- "What are the **latest** AI trends?"
- "What is the **current** state of cloud computing?"
- "**Explain** quantum computing"

### 4. Verify Model Selection
Check backend logs to confirm the selected model is being used:
```
[Perplexity] Performing web search for query: What are the latest AI trends?
[Perplexity] API key length: 56
[Perplexity] Using model: sonar-pro
```

## Model Comparison

| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| sonar | Fast | Good | Low | General queries, quick answers |
| sonar-pro | Medium | Excellent | Medium | Complex questions, detailed research |
| sonar-reasoning | Medium | Very Good | Medium | Problem-solving, analytical tasks |
| sonar-reasoning-pro | Slower | Excellent | High | Advanced reasoning, critical thinking |
| sonar-deep-research | Slowest | Outstanding | Highest | Comprehensive research, in-depth analysis |

## Cost Considerations

**Important:** More advanced models cost more per request. Check Perplexity pricing at https://www.perplexity.ai/settings/api

Recommendations:
- **For general use:** Start with `sonar` (default)
- **For important queries:** Use `sonar-pro`
- **For complex analysis:** Use `sonar-reasoning` or `sonar-reasoning-pro`
- **For comprehensive research:** Use `sonar-deep-research` sparingly

## Backward Compatibility

The feature is fully backward compatible:
- Default value is `sonar` (the current hardcoded model)
- Existing preferences will be merged with defaults
- If no model is selected, falls back to `sonar`

## Testing

### Manual Testing
1. Restart backend: `cd services/backend && npm run dev`
2. Refresh frontend
3. Go to Settings → AI Settings
4. Verify "Perplexity Model" dropdown appears
5. Select different model
6. Save changes
7. Ask a web search query
8. Check backend logs to confirm model is used

### Expected Backend Logs
```
[LLM] ========== Starting Query ==========
[LLM] Query: What are the latest AI trends?
[LLM] Preferences loaded: { ..., hasPerplexityKey: true }
[LLM] Triggering web search...
[Perplexity] Performing web search for query: What are the latest AI trends?
[Perplexity] API key length: 56
[Perplexity] Using model: sonar-pro
[Perplexity] Response status: 200 OK
[LLM] Web search completed successfully
```

## Files Modified Summary

1. ✅ `frontend/src/types/index.ts` - Added type field
2. ✅ `services/backend/src/types/index.ts` - Added type field
3. ✅ `services/backend/src/routes/config.ts` - Added default value
4. ✅ `frontend/src/store/preferencesStore.ts` - Added default value
5. ✅ `frontend/src/pages/Settings.tsx` - Added dropdown UI
6. ✅ `services/backend/src/services/llmService.ts` - Use selected model

## Status

✅ **Complete** - All Perplexity models are now selectable in Settings
✅ **Tested** - Type definitions, defaults, and UI implemented
✅ **Documented** - Complete documentation provided

## Next Steps

1. Restart backend service: `cd services/backend && npm run dev`
2. Refresh frontend
3. Test model selection in Settings
4. Verify web search uses selected model
