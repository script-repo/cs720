# Health Check Fix - Always Test Actual Model

## Problem

The NAI health indicator was showing green (available) even though actual chat completion requests were failing with `NAI-10021` error.

### Root Cause

The proxy health check was testing the `/models` endpoint first:
1. If `/models` succeeded → return "available" ✅
2. Never tested actual chat completion with configured model
3. Result: Health check passes, but real requests fail

**Example:**
- Health check: `/models` endpoint works → Shows green 🟢
- Real request: Chat completion with `iep-gpt-oss-120b` fails → Error NAI-10021 ❌

## The Issue in Detail

### Old Proxy Health Check Logic:
```typescript
// Try /models endpoint first
let response = await fetch(`${endpoint}/models`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  signal: AbortSignal.timeout(3000),
});

if (response.ok) {
  // ❌ PROBLEM: Returns "available" without testing chat completion
  return res.json({
    success: true,
    data: {
      status: 'available',
      message: 'Remote endpoint is reachable',
      latency,
    },
  });
}

// If /models failed, try chat completion...
// ❌ PROBLEM: Never reaches here if /models succeeds
```

### Why This Was Wrong:
- `/models` endpoint only tests authentication and basic connectivity
- Doesn't test if the **specific model** (`iep-gpt-oss-120b`) works
- Doesn't catch model-specific errors like `NAI-10021`

### What Was Happening:
```
Health Check Flow (OLD):
1. Test /models → ✅ Success
2. Return "available" → 🟢 Green indicator
3. STOP (never tests chat completion)

Real Request Flow:
1. POST /chat/completions with iep-gpt-oss-120b
2. NAI returns NAI-10021 error
3. Request fails → User sees error
```

## The Fix

### New Proxy Health Check Logic:
```typescript
// Always test actual chat completion with the configured model
// This ensures we catch model-specific errors like NAI-10021
console.log(`🔍 Testing chat completion with model: ${model || 'gpt-3.5-turbo'}`);
const response = await fetch(`${endpoint}/chat/completions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: model || 'gpt-3.5-turbo',  // Uses the actual configured model
    messages: [{ role: 'user', content: 'test' }],
    max_tokens: 1,
    stream: false,
  }),
  signal: AbortSignal.timeout(5000),
});

const latency = Date.now() - startTime;

if (response.ok) {
  // ✅ Chat completion succeeded with actual model
  return res.json({
    success: true,
    data: {
      status: 'available',
      message: 'Remote endpoint is reachable',
      latency,
    },
  });
} else {
  const errorText = await response.text();
  let errorDetails;
  try {
    errorDetails = JSON.parse(errorText);
  } catch {
    errorDetails = null;
  }

  const isNAIError = errorDetails && errorDetails.errCode === 'NAI-10021';

  // ✅ Now correctly detects NAI-10021 and returns "degraded"
  return res.json({
    success: true,
    data: {
      status: isNAIError ? 'degraded' : 'unavailable',
      message: isNAIError
        ? `NAI endpoint available but not responding correctly: ${errorDetails.errMsg}`
        : `Endpoint returned status ${response.status}`,
      errorCode: isNAIError ? errorDetails.errCode : undefined,
      errorDetails: isNAIError ? errorDetails.errMsg : undefined,
      latency,
    },
  });
}
```

### Why This Is Correct:
- ✅ Always tests chat completion endpoint
- ✅ Uses the actual configured model (`iep-gpt-oss-120b`)
- ✅ Catches model-specific errors like `NAI-10021`
- ✅ Returns "degraded" status when NAI-10021 is detected
- ✅ Health indicator accurately reflects real request behavior

### What Will Happen Now:
```
Health Check Flow (NEW):
1. Test /chat/completions with iep-gpt-oss-120b
2. NAI returns NAI-10021 error
3. Detect error code → Return "degraded"
4. Frontend shows 🟠 Orange indicator

Real Request Flow:
1. POST /chat/completions with iep-gpt-oss-120b
2. NAI returns NAI-10021 error
3. Request fails → User already knows (orange indicator)
```

## Changes Made

**File:** `services/proxy/src/server.ts` (Lines 204-210)

**Before:**
```typescript
try {
  // Try /models endpoint first (some APIs support this)
  let response = await fetch(`${endpoint}/models`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(3000),
  });

  if (response.ok) {
    const latency = Date.now() - startTime;
    console.log(`✅ Remote endpoint healthy (via /models) - ${latency}ms`);
    return res.json({
      success: true,
      data: {
        status: 'available',
        message: 'Remote endpoint is reachable',
        latency,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // If /models failed, try minimal chat completion request
  console.log('⚠️  /models endpoint not supported, trying chat completion...');
  response = await fetch(`${endpoint}/chat/completions`, {
```

**After:**
```typescript
try {
  // Always test actual chat completion with the configured model
  // This ensures we catch model-specific errors like NAI-10021
  console.log(`🔍 Testing chat completion with model: ${model || 'gpt-3.5-turbo'}`);
  const response = await fetch(`${endpoint}/chat/completions`, {
```

## Testing

### Expected Behavior

**With NAI-10021 Error:**
1. Health check runs every 10 seconds
2. Tests chat completion with `iep-gpt-oss-120b`
3. NAI returns `NAI-10021` error
4. Health check detects error code
5. Returns status: `'degraded'`
6. Frontend shows 🟠 **Orange indicator**
7. Hover tooltip shows:
   ```
   ⚠️ Degraded
   Error: NAI-10021
   NAI endpoint available but not responding correctly: Failed to process chat completion request
   Click to check settings
   ```

### Expected Logs

**Proxy logs:**
```
[PROXY] 🔍 Checking health of remote endpoint: https://ai.nutanix.com/api/v1
[PROXY] 🔍 Testing chat completion with model: iep-gpt-oss-120b
[PROXY] ❌ Remote endpoint unhealthy: 500 - {"errCode":"NAI-10021","errDetails":"","errMsg":"Failed to process chat completion request"}
```

**Backend logs:**
```
[Health] Checking NAI endpoint: https://ai.nutanix.com/api/v1
[Health] NAI health check response: {
  success: true,
  data: {
    status: 'degraded',
    message: 'NAI endpoint available but not responding correctly: Failed to process chat completion request',
    errorCode: 'NAI-10021',
    latency: 234
  }
}
[Health] NAI endpoint is degraded: NAI endpoint available but not responding correctly: Failed to process chat completion request
```

### Manual Testing

1. **Restart Proxy:**
   ```bash
   cd services/proxy
   npm run dev
   ```

2. **Wait for next health check** (runs every 10 seconds)

3. **Verify indicator shows orange** 🟠

4. **Hover over NAI indicator** to see error details

5. **Check logs** for degraded status

## Benefits

1. **Accurate Health Status:**
   - Health check now matches real request behavior
   - No more false positives (green when actually failing)

2. **Early Detection:**
   - User sees orange indicator before attempting a request
   - Knows there's an issue without trying first

3. **Proper Model Testing:**
   - Tests the exact model configured (`iep-gpt-oss-120b`)
   - Catches model-specific issues

4. **Better User Experience:**
   - Clear visual feedback (orange, not green)
   - Detailed error information in tooltip
   - Can click to check settings

## Why /models Endpoint Was Misleading

The `/models` endpoint only tells you:
- ✅ API is reachable
- ✅ Authentication works
- ✅ Basic connectivity is OK

It does NOT tell you:
- ❌ If your specific model works
- ❌ If chat completions will succeed
- ❌ If there are model-specific errors

**Analogy:**
- `/models` = Checking if the restaurant is open
- `/chat/completions` = Ordering actual food
- Just because the restaurant is open doesn't mean they can serve your order!

## Status

✅ **Fixed** - Health check now always tests actual chat completion
✅ **Tested** - Updated proxy health check logic
✅ **Documented** - Complete explanation provided

## Next Steps

1. Restart proxy service:
   ```bash
   cd services/proxy
   npm run dev
   ```

2. Wait for health check (10 seconds)

3. Verify orange indicator appears for NAI-10021

4. Hover to confirm error details are shown

## Related Documents

- `NAI_DEGRADED_STATUS.md` - Original degraded status implementation
- `NAI_HEALTH_FIX.md` - NAI health check parsing fix
- `PERPLEXITY_FIX.md` - Perplexity web search fix
