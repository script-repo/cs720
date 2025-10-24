# NAI Health Check Fix

## Issue
NAI health indicator showing red even when NAI is configured and working.

## Root Cause
The backend was not correctly parsing the proxy's health check response format.

**Proxy returns:**
```json
{
  "success": true,
  "data": {
    "status": "available",
    "latency": 200
  }
}
```

**Backend was expecting:**
```json
{
  "status": "available",
  "latency": 200
}
```

## Fix Applied
Updated `services/backend/src/services/llmService.ts` line 478:

**Before:**
```typescript
if (data.status === 'available') {
  health.external.available = true;
  health.external.responseTime = Date.now() - startTime;
}
```

**After:**
```typescript
// Proxy returns { success: true, data: { status: 'available', latency: 123 } }
if (result.success && result.data && result.data.status === 'available') {
  health.external.available = true;
  health.external.responseTime = result.data.latency || (Date.now() - startTime);
  console.log('[Health] NAI endpoint is available');
} else {
  console.log('[Health] NAI endpoint is unavailable:', result.data?.message);
}
```

## Enhanced Logging
Added comprehensive logging to debug NAI health checks:

```typescript
console.log('[Health] Checking NAI endpoint:', naiBaseUrl);
console.log('[Health] NAI health check response:', result);
console.log('[Health] NAI endpoint is available');
console.log('[Health] NAI endpoint is unavailable:', result.data?.message);
console.log('[Health] NAI not configured, skipping health check');
console.log('[Health] Proxy unavailable, skipping NAI health check');
```

## Testing Steps

### 1. Restart Backend
```bash
cd services/backend
npm run dev
```

### 2. Configure NAI in Settings
1. Go to Settings → AI Settings
2. Set:
   - **Preferred Backend:** Remote (NAI)
   - **NAI Base URL:** `https://api.openai.com/v1` (or your NAI endpoint)
   - **NAI API Key:** Your API key
   - **NAI Model:** `gpt-4` (or your model)
3. Click "Save Changes"

### 3. Wait for Health Check
Health checks run every 10 seconds. Watch the backend logs:

```bash
# You should see:
[Health] Checking NAI endpoint: https://api.openai.com/v1
[Health] NAI health check response: { success: true, data: { status: 'available', latency: 200 } }
[Health] NAI endpoint is available
```

### 4. Verify in UI
Check the top-right corner - **NAI indicator should turn green (🟢)**

## Debugging

### Backend Logs
Watch backend console output:

```bash
cd services/backend
npm run dev
```

Look for `[Health]` prefixed messages every 10 seconds.

### Expected Log Output (Success)
```
[Health] Checking NAI endpoint: https://api.openai.com/v1
[Health] NAI health check response: { success: true, data: { status: 'available', latency: 234 } }
[Health] NAI endpoint is available
```

### Expected Log Output (Not Configured)
```
[Health] NAI not configured, skipping health check
```

### Expected Log Output (Proxy Down)
```
Proxy health check failed: Error: fetch failed
[Health] Proxy unavailable, skipping NAI health check
```

### Expected Log Output (NAI Unreachable)
```
[Health] Checking NAI endpoint: https://api.openai.com/v1
[Health] NAI health check response: { success: true, data: { status: 'unavailable', message: 'Endpoint returned status 401' } }
[Health] NAI endpoint is unavailable: Endpoint returned status 401
```

## Common Issues

### Issue: NAI still shows red after configuration
**Solution:**
1. Check backend logs for `[Health]` messages
2. Verify NAI Base URL is correct (must end with `/v1`)
3. Verify API key is correct (no extra spaces)
4. Ensure proxy service is running (Proxy indicator should be green)
5. Wait 10 seconds for next health check

### Issue: Backend logs show "NAI not configured"
**Solution:**
1. Save settings in UI
2. Wait a few seconds
3. Check `.cs720/preferences.json` file:
   ```bash
   cat .cs720/preferences.json
   ```
   Should show:
   ```json
   {
     "ai": {
       "naiBaseUrl": "https://api.openai.com/v1",
       "naiApiKey": "sk-...",
       "naiModel": "gpt-4"
     }
   }
   ```

### Issue: Backend logs show "Proxy unavailable"
**Solution:**
1. Start proxy service:
   ```bash
   cd services/proxy
   npm run dev
   ```
2. Verify proxy health:
   ```bash
   curl http://localhost:3002/health
   ```
   Should return:
   ```json
   {
     "success": true,
     "data": {
       "status": "healthy"
     }
   }
   ```

### Issue: NAI health check shows "status 401"
**Solution:**
- Invalid API key
- Check API key in Settings
- Verify key works with:
  ```bash
  curl https://api.openai.com/v1/models \
    -H "Authorization: Bearer YOUR_API_KEY"
  ```

### Issue: NAI health check shows "status 404"
**Solution:**
- Incorrect base URL
- Should be: `https://api.openai.com/v1` (with `/v1`)
- Not: `https://api.openai.com` (missing `/v1`)

## Manual Health Check Test

Test the health check manually:

```bash
# Test proxy health endpoint directly
curl -X POST http://localhost:3002/health/remote \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "https://api.openai.com/v1",
    "apiKey": "YOUR_API_KEY",
    "model": "gpt-4"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "available",
    "message": "Remote endpoint is reachable",
    "latency": 234
  }
}
```

## Summary

✅ **Fixed:** NAI health check now correctly parses proxy response format
✅ **Added:** Comprehensive logging for debugging
✅ **Enhanced:** Better error messages and troubleshooting info

**Action Required:**
1. Restart backend service: `cd services/backend && npm run dev`
2. Refresh browser
3. NAI indicator should turn green within 10 seconds

---

**Status:** ✅ Fixed
**Build:** ✅ Backend rebuilt successfully
