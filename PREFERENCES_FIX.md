# Preferences API Fix

## Issue
When trying to update settings in the UI, users received the error: **"Failed to update preferences: Bad Request"**

## Root Cause
The backend and frontend had mismatched type definitions for `UserPreferences.ai`:

### Frontend (Correct)
```typescript
ai: {
  preferredModel: 'ollama' | 'openai';
  maxTokens: number;
  naiBaseUrl?: string;
  naiApiKey?: string;
  naiModel?: string;
  perplexityApiKey?: string;
  systemPrompt?: string;
}
```

### Backend (Before Fix)
```typescript
ai: {
  preferredModel: 'external' | 'local';  // ❌ Wrong values
  maxTokens: number;                      // ❌ Missing new fields
}
```

## Validation Error
The backend validation function was rejecting the frontend's `preferredModel` values:

```typescript
// Before (line 144)
if (!['external', 'local'].includes(preferences.ai.preferredModel)) {
  return 'Invalid AI model preference';  // ❌ Always failed for 'ollama' or 'openai'
}
```

## Files Fixed

### 1. `services/backend/src/types/index.ts`
**Lines 177-196:** Updated `UserPreferences` interface
```typescript
ai: {
  preferredModel: 'ollama' | 'openai';  // ✅ Changed from 'external' | 'local'
  maxTokens: number;
  naiBaseUrl?: string;                  // ✅ Added
  naiApiKey?: string;                   // ✅ Added
  naiModel?: string;                    // ✅ Added
  perplexityApiKey?: string;            // ✅ Added
  systemPrompt?: string;                // ✅ Added
}
```

### 2. `services/backend/src/routes/config.ts`
**Lines 5-23:** Updated `DEFAULT_PREFERENCES`
```typescript
ai: {
  preferredModel: 'ollama',             // ✅ Changed from 'external'
  maxTokens: 2048,                      // ✅ Increased from 1000
  naiBaseUrl: '',                       // ✅ Added
  naiApiKey: '',                        // ✅ Added
  naiModel: '',                         // ✅ Added
  perplexityApiKey: '',                 // ✅ Added
  systemPrompt: '...'                   // ✅ Added
}
```

**Lines 138-163:** Updated `validatePreferences()` function
```typescript
// ✅ Changed validation to accept 'ollama' | 'openai'
if (!['ollama', 'openai'].includes(preferences.ai.preferredModel)) {
  return 'Invalid AI model preference';
}

// ✅ Increased max tokens from 4000 to 8000
if (preferences.ai.maxTokens < 100 || preferences.ai.maxTokens > 8000) {
  return 'Max tokens must be between 100 and 8000';
}
```

## Solution Summary
1. ✅ Updated backend `UserPreferences` type to match frontend
2. ✅ Changed `preferredModel` values from `'external' | 'local'` to `'ollama' | 'openai'`
3. ✅ Added new optional fields: `naiBaseUrl`, `naiApiKey`, `naiModel`, `perplexityApiKey`, `systemPrompt`
4. ✅ Updated validation to accept new values
5. ✅ Increased max tokens limit from 4000 to 8000
6. ✅ Rebuilt backend with `npm run build`

## Testing
After restarting the backend service, test the fix:

1. Navigate to Settings page
2. Modify any AI setting (e.g., change Preferred Backend)
3. Click "Save Changes"
4. Should see: ✅ "Settings saved successfully"

## Next Steps
If you still see the error after restarting the backend:

1. **Restart Backend Service:**
   ```bash
   cd services/backend
   npm run dev
   ```

2. **Check Backend Logs:**
   Look for validation errors or request details

3. **Verify Request Body:**
   Open browser DevTools → Network tab → Check PUT request to `/api/config/preferences`

## Related Files
- Frontend types: `frontend/src/types/index.ts`
- Frontend store: `frontend/src/store/preferencesStore.ts`
- Frontend UI: `frontend/src/pages/Settings.tsx`
- Backend types: `services/backend/src/types/index.ts`
- Backend routes: `services/backend/src/routes/config.ts`

---

**Status:** ✅ Fixed - Backend types and validation now match frontend
