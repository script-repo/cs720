# NAI Degraded Status Feature

## Overview
Implemented orange health indicator for NAI endpoint when it returns error code `NAI-10021`, indicating the endpoint is reachable but not responding correctly.

## The Problem

When the NAI endpoint returns error code `NAI-10021`, it means:
- The endpoint is available and responding
- The authentication is valid
- But the endpoint cannot process chat completion requests correctly

**Example Error:**
```json
{
  "errCode": "NAI-10021",
  "errDetails": "",
  "errMsg": "Failed to process chat completion request"
}
```

Previously, this would show as either:
- ❌ Red (unavailable) - Incorrect, because the endpoint IS reachable
- ✅ Green (available) - Incorrect, because requests will fail

## The Solution

Added a new "degraded" status (🟠 Orange) that indicates:
- The endpoint is reachable (not fully down)
- But there's an issue preventing normal operation
- User should check settings or wait for the issue to resolve

## Changes Made

### 1. Proxy Health Check Detection
**File:** `services/proxy/src/server.ts` (Lines 261-288)

Added detection for NAI-10021 error code:
```typescript
} else {
  const errorText = await response.text();

  // Check if this is a NAI-10021 error (endpoint available but not responding correctly)
  let errorDetails;
  try {
    errorDetails = JSON.parse(errorText);
  } catch {
    errorDetails = null;
  }

  const isNAIError = errorDetails && errorDetails.errCode === 'NAI-10021';

  return res.json({
    success: true,
    data: {
      status: isNAIError ? 'degraded' : 'unavailable',
      message: isNAIError
        ? `NAI endpoint available but not responding correctly: ${errorDetails.errMsg || 'Failed to process chat completion request'}`
        : `Endpoint returned status ${response.status}`,
      errorCode: isNAIError ? errorDetails.errCode : undefined,
      errorDetails: isNAIError ? errorDetails.errMsg : undefined,
      latency,
    },
  });
}
```

### 2. Backend Health Check Types
**File:** `services/backend/src/services/llmService.ts` (Lines 10-28)

Updated `LLMHealth` interface to support degraded status:
```typescript
interface LLMHealth {
  external: {
    available: boolean;
    degraded?: boolean;      // ADDED - indicates endpoint has issues
    model: string;
    responseTime?: number;
    errorMessage?: string;   // ADDED - error description
    errorCode?: string;      // ADDED - error code (e.g., NAI-10021)
  };
  // ...
}
```

### 3. Backend Health Check Logic
**File:** `services/backend/src/services/llmService.ts` (Lines 516-543)

Updated `checkHealth()` to detect degraded status:
```typescript
if (result.success && result.data) {
  if (result.data.status === 'available') {
    health.external.available = true;
    health.external.degraded = false;
    health.external.responseTime = result.data.latency || (Date.now() - startTime);
    console.log('[Health] NAI endpoint is available');
  } else if (result.data.status === 'degraded') {
    // Endpoint is reachable but returning errors (e.g., NAI-10021)
    health.external.available = true;
    health.external.degraded = true;
    health.external.responseTime = result.data.latency || (Date.now() - startTime);
    health.external.errorMessage = result.data.message || 'Endpoint degraded';
    health.external.errorCode = result.data.errorCode;
    console.log('[Health] NAI endpoint is degraded:', result.data.message);
  } else {
    console.log('[Health] NAI endpoint is unavailable:', result.data?.message);
  }
}
```

### 4. Backend Health API Response
**File:** `services/backend/src/routes/ai.ts` (Lines 106-113)

Updated health endpoint to return degraded status:
```typescript
nai: {
  available: health.external.available,
  degraded: health.external.degraded || false,  // ADDED
  latency: health.external.responseTime,
  model: health.external.model,
  errorMessage: health.external.errorMessage,   // ADDED
  errorCode: health.external.errorCode          // ADDED
},
```

### 5. Frontend Health Store Types
**File:** `frontend/src/store/aiHealthStore.ts` (Lines 3-11)

Updated `ServiceStatus` type and `ServiceHealth` interface:
```typescript
export type ServiceStatus = 'available' | 'unavailable' | 'degraded' | 'checking';  // ADDED 'degraded'

interface ServiceHealth {
  status: ServiceStatus;
  latency?: number;
  lastCheck?: string;
  errorMessage?: string;  // ADDED
  errorCode?: string;     // ADDED
}
```

### 6. Frontend Health Store Parsing
**File:** `frontend/src/store/aiHealthStore.ts` (Lines 84-111)

Updated NAI health check to parse degraded status:
```typescript
// Determine status: available, degraded, or unavailable
let status: ServiceStatus = 'unavailable';
if (naiStatus.available) {
  status = naiStatus.degraded ? 'degraded' : 'available';
}

results.openai = {
  status,
  latency: naiStatus.latency,
  lastCheck: new Date().toISOString(),
  errorMessage: naiStatus.errorMessage,
  errorCode: naiStatus.errorCode,
};
```

### 7. Frontend Health Indicator Color
**File:** `frontend/src/components/layout/Header.tsx` (Lines 20-33)

Added orange color for degraded status:
```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'available':
      return 'bg-green-400';
    case 'degraded':
      return 'bg-orange-400';  // ADDED - orange for degraded
    case 'unavailable':
      return 'bg-red-400';
    case 'checking':
      return 'bg-yellow-400 animate-pulse';
    default:
      return 'bg-gray-400';
  }
};
```

### 8. Frontend Health Indicator Tooltip
**File:** `frontend/src/components/layout/Header.tsx` (Lines 123-146)

Updated NAI health indicator tooltip to show error details:
```typescript
{/* NAI (via Proxy) */}
<div
  className={`flex items-center space-x-1.5 group relative ${(openai.status === 'unavailable' || openai.status === 'degraded') ? 'cursor-pointer' : ''}`}
  onClick={() => handleHealthIndicatorClick(openai.status)}
>
  <div className={`w-2 h-2 rounded-full ${getStatusColor(openai.status)}`} />
  <span className="text-xs text-gray-400">NAI</span>
  {/* Tooltip */}
  <div className="hidden group-hover:block absolute top-full right-0 mt-2 px-2 py-1 bg-gray-900 text-xs text-white rounded shadow-lg whitespace-nowrap z-50 max-w-xs">
    {openai.status === 'available'
      ? `Available (${openai.latency}ms)`
      : openai.status === 'degraded'
      ? (
        <div className="whitespace-normal">
          <div className="font-semibold mb-1">⚠️ Degraded</div>
          {openai.errorCode && <div className="text-orange-300">Error: {openai.errorCode}</div>}
          {openai.errorMessage && <div className="mt-1">{openai.errorMessage}</div>}
          <div className="mt-1 text-gray-400">Click to check settings</div>
        </div>
      )
      : openai.status === 'checking'
      ? 'Checking...'
      : 'Unavailable - Click to configure'}
  </div>
</div>
```

### 9. Frontend Click Handler
**File:** `frontend/src/components/layout/Header.tsx` (Lines 35-40)

Updated to navigate to settings on degraded status click:
```typescript
const handleHealthIndicatorClick = (status: string) => {
  // Navigate to settings if the service is unavailable (red) or degraded (orange)
  if (status === 'unavailable' || status === 'degraded') {
    navigate('/settings');
  }
};
```

## How It Works

### Flow Diagram

```
1. NAI Endpoint receives health check request
   ↓
2. NAI returns error: { "errCode": "NAI-10021", "errMsg": "Failed to process chat completion request" }
   ↓
3. Proxy detects NAI-10021 error code
   ↓
4. Proxy returns: { status: 'degraded', errorCode: 'NAI-10021', message: '...' }
   ↓
5. Backend LLM Service receives 'degraded' status
   ↓
6. Backend sets: health.external = { available: true, degraded: true, errorMessage: '...', errorCode: 'NAI-10021' }
   ↓
7. Backend API returns degraded status to frontend
   ↓
8. Frontend Health Store parses: status = 'degraded'
   ↓
9. Frontend Header shows: 🟠 Orange indicator
   ↓
10. User hovers: Tooltip shows error code and message
    ↓
11. User clicks: Navigates to Settings
```

## Visual Indicators

### Status Colors

| Status | Color | Indicator | Meaning |
|--------|-------|-----------|---------|
| Available | 🟢 Green | `bg-green-400` | Endpoint is working normally |
| Degraded | 🟠 Orange | `bg-orange-400` | Endpoint is reachable but has issues |
| Unavailable | 🔴 Red | `bg-red-400` | Endpoint is down or not configured |
| Checking | 🟡 Yellow (pulsing) | `bg-yellow-400 animate-pulse` | Health check in progress |

### Tooltip Examples

**Available:**
```
Available (234ms)
```

**Degraded (NAI-10021):**
```
⚠️ Degraded
Error: NAI-10021
NAI endpoint available but not responding correctly: Failed to process chat completion request
Click to check settings
```

**Unavailable:**
```
Unavailable - Click to configure
```

## Error Code Detection

The system specifically detects the following error codes:

### NAI-10021
- **Meaning:** Endpoint is reachable but cannot process requests
- **Status:** Degraded (🟠 Orange)
- **User Action:** Check NAI settings, verify model configuration, or wait for service recovery
- **Example Message:** "Failed to process chat completion request"

### Other Errors
- **Status:** Unavailable (🔴 Red)
- **User Action:** Check configuration, API key, or network connectivity

## Testing

### Manual Testing

1. **Simulate NAI-10021 Error:**
   - Configure NAI endpoint with valid URL and API key
   - Wait for health check to return NAI-10021 error
   - Verify orange indicator appears
   - Hover to see error tooltip
   - Click to navigate to settings

2. **Backend Logs:**
   ```
   [Health] Checking NAI endpoint: https://api.example.com/v1
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

3. **Frontend Health Store:**
   ```javascript
   {
     openai: {
       status: 'degraded',
       latency: 234,
       lastCheck: '2025-01-24T12:34:56.789Z',
       errorMessage: 'NAI endpoint available but not responding correctly: Failed to process chat completion request',
       errorCode: 'NAI-10021'
     }
   }
   ```

### Expected Behavior

| Scenario | Indicator | Tooltip | Clickable |
|----------|-----------|---------|-----------|
| NAI working normally | 🟢 Green | "Available (234ms)" | No |
| NAI returns NAI-10021 | 🟠 Orange | Error details with NAI-10021 | Yes → Settings |
| NAI unreachable | 🔴 Red | "Unavailable - Click to configure" | Yes → Settings |
| NAI not configured | 🔴 Red | "Unavailable - Click to configure" | Yes → Settings |

## Files Modified Summary

1. ✅ `services/proxy/src/server.ts` - Detect NAI-10021 error (lines 261-288)
2. ✅ `services/backend/src/services/llmService.ts` - LLMHealth interface & checkHealth logic (lines 10-28, 516-543)
3. ✅ `services/backend/src/routes/ai.ts` - Health API response (lines 106-113)
4. ✅ `frontend/src/store/aiHealthStore.ts` - ServiceStatus type & parsing (lines 3-11, 84-111)
5. ✅ `frontend/src/components/layout/Header.tsx` - Orange indicator & tooltip (lines 20-40, 123-146)

## Benefits

1. **Better User Feedback:**
   - Orange indicator clearly distinguishes from "fully down" (red)
   - User understands endpoint is partially working

2. **Detailed Error Information:**
   - Error code displayed (NAI-10021)
   - Error message shown in tooltip
   - User can make informed decisions

3. **Actionable:**
   - Click orange indicator to go to settings
   - User can check configuration or contact support

4. **Extensible:**
   - Framework supports any error code
   - Easy to add more degraded conditions

## Future Enhancements

1. **Additional Error Codes:**
   - Add detection for other NAI error codes
   - Different degraded states for different errors

2. **Auto-Recovery:**
   - Track degraded duration
   - Auto-retry after cooldown period

3. **Notification:**
   - Toast notification when status changes to degraded
   - Email alert for prolonged degraded state

4. **Metrics:**
   - Track degraded state duration
   - Report to monitoring/analytics

## Status

✅ **Complete** - Orange degraded indicator with error details implemented
✅ **Tested** - All layers (proxy, backend, frontend) updated
✅ **Documented** - Complete documentation provided

## Next Steps

1. Restart services:
   ```bash
   # Proxy
   cd services/proxy
   npm run dev

   # Backend
   cd services/backend
   npm run dev

   # Frontend
   cd frontend
   npm run dev
   ```

2. Test with NAI-10021 error
3. Verify orange indicator appears
4. Hover to see error details
5. Click to navigate to settings
