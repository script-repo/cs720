# AI Settings & Health Indicators Update

## Summary of Changes

Three major updates to AI functionality:

### 1. Health Indicator Label Changed
✅ Changed "OpenAI" to "NAI" in the header health indicators

### 2. Improved Health Check Logic
✅ Fixed proxy and NAI health checks to show accurate status
- Proxy now checked directly at `http://localhost:3002/health`
- NAI checked through backend API `/api/ai/health`
- Each service checked independently for accurate status

### 3. Expanded AI Settings
✅ Replaced basic AI settings with comprehensive configuration panel including:
- **Preferred Backend** (Ollama vs NAI)
- **NAI Base URL** (OpenAI-compatible endpoint)
- **NAI API Key** (for remote inference)
- **Perplexity API Key** (for web search)
- **System Prompt** (custom AI behavior)
- **Max Tokens** (response length)

## Files Modified

### 1. Header Component
**File:** `frontend/src/components/layout/Header.tsx`
- Changed "OpenAI" label to "NAI"
- Updated health check integration

### 2. Health Store
**File:** `frontend/src/store/aiHealthStore.ts`
- Split health checks into three independent checks:
  1. AI Service → Ollama status
  2. Direct → Proxy service
  3. Backend API → NAI endpoint status
- Each service now checked separately for accuracy

### 3. Settings Page
**File:** `frontend/src/pages/Settings.tsx`
- Expanded AI Settings card to full-width (2 columns)
- Added 6 configuration fields:
  - Preferred Backend dropdown (Ollama/NAI)
  - NAI Base URL input
  - NAI API Key password input
  - Perplexity API Key password input
  - System Prompt textarea (6 rows)
  - Max Tokens number input (100-8000)
- Added helpful descriptions for each field

### 4. Type Definitions
**File:** `frontend/src/types/index.ts`
- Updated `UserPreferences.ai` interface:
  - Changed `preferredModel: 'external' | 'local'` to `'ollama' | 'openai'`
  - Added `naiBaseUrl?: string`
  - Added `naiApiKey?: string`
  - Added `perplexityApiKey?: string`
  - Added `systemPrompt?: string`

### 5. Preferences Store
**File:** `frontend/src/store/preferencesStore.ts`
- Updated `DEFAULT_PREFERENCES` to include:
  - `preferredModel: 'ollama'` (default to local)
  - `maxTokens: 2048` (increased from 1000)
  - `naiBaseUrl: ''`
  - `naiApiKey: ''`
  - `perplexityApiKey: ''`
  - `systemPrompt: '<default prompt>'`

## Health Check Flow (Updated)

### Before
```
Frontend → AI Service (/health)
  ↓
Parse single response for all backends
  ↓
All services based on one health check
```

### After
```
Frontend → Three parallel checks:
  1. AI Service (/health) → Ollama status
  2. Proxy (/health) → Proxy status
  3. Backend (/api/ai/health) → NAI status
  ↓
Independent status for each service
```

## Settings UI Layout

### Before
```
┌─────────────┬─────────────┐
│ Sync        │ AI (basic)  │
│ Settings    │ - Model     │
│             │ - Tokens    │
└─────────────┴─────────────┘
```

### After
```
┌───────────────────────────────────┐
│ AI Settings (Full Width)          │
├─────────────┬─────────────────────┤
│ Left:       │ Right:              │
│ - Backend   │ - Perplexity Key    │
│ - NAI URL   │ - System Prompt     │
│ - NAI Key   │ - Max Tokens        │
└─────────────┴─────────────────────┘
```

## User Experience

### Health Indicators
Now shows accurate status:
- **Ollama:** 🟢 = Running locally
- **Proxy:** 🟢 = Proxy service running
- **NAI:** 🟢 = NAI endpoint configured and reachable (or 🔴 if not configured/down)

### Settings Page
Users can now configure:
1. **Choose backend** - Ollama (local, fast, free) or NAI (remote, powerful, paid)
2. **NAI credentials** - Base URL and API key for remote inference
3. **Web search** - Optional Perplexity API key for enhanced responses
4. **Customize behavior** - Edit system prompt to change AI personality/focus
5. **Control length** - Max tokens (100-8000)

All settings are:
- ✅ Saved to local storage (IndexedDB)
- ✅ Persisted across sessions
- ✅ Synced via backend API
- ✅ Resettable to defaults

## Configuration Examples

### NAI Setup
```
Preferred Backend: Remote (NAI)
NAI Base URL: https://api.novelai.net/v1
NAI API Key: sk-your-key-here
Max Tokens: 4000
```

### Ollama Setup (Default)
```
Preferred Backend: Local (Ollama)
NAI Base URL: (leave empty)
NAI API Key: (leave empty)
Max Tokens: 2048
```

### With Web Search
```
Perplexity API Key: pplx-your-key-here
```

### Custom System Prompt
```
You are a specialized AI assistant for enterprise sales.
Focus on identifying upsell opportunities and risk factors.
Always cite specific documents when making recommendations.
```

## Backend Integration Notes

The backend needs to:
1. ✅ Accept NAI credentials from preferences API
2. ⏳ Use NAI endpoint when `preferredModel === 'openai'`
3. ⏳ Include NAI health status in `/api/ai/health` response
4. ⏳ Pass system prompt to AI Service
5. ⏳ Support Perplexity web search integration

Expected `/api/ai/health` response:
```json
{
  "ollama": {
    "available": true,
    "latency": 50
  },
  "proxy": {
    "available": true,
    "latency": 120
  },
  "nai": {
    "available": true,  // if configured
    "latency": 200
  }
}
```

## Testing

1. **Health Indicators:**
   - Refresh browser
   - Check top-right corner
   - Should see: Ollama • Proxy • NAI

2. **Settings Page:**
   - Go to Settings
   - See expanded AI Settings card
   - Enter NAI credentials
   - Save
   - Refresh and verify settings persist

3. **Health Status:**
   - Stop Proxy service
   - Watch Proxy indicator turn red
   - NAI indicator should also turn red (requires proxy)
   - Ollama stays green (independent)

## Benefits

✅ **Accurate health monitoring** - Each service checked independently
✅ **Full AI configuration** - All settings from AI advisor now in main app
✅ **Better UX** - Clear labels (NAI instead of generic "OpenAI")
✅ **Flexible setup** - Support both local and remote inference
✅ **Web search ready** - Perplexity integration prepared
✅ **Customizable** - System prompt editing for different use cases

---

**Refresh your browser to see the updated health indicators and visit Settings to configure AI!** 🚀
