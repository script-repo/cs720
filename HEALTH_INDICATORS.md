# AI Service Health Indicators

## What Changed

Replaced the generic "Online/Offline" indicator in the top-right corner with **three AI service health indicators**:

1. **Ollama** - Local LLM service
2. **Proxy** - CORS proxy for OpenAI-compatible APIs
3. **OpenAI** - Remote AI service (via proxy)

## Implementation

### New Store: `aiHealthStore.ts`

Created a dedicated Zustand store to manage AI service health checks:

**Features:**
- Checks health every 10 seconds automatically
- Queries the AI Service at `http://localhost:3003/health`
- Tracks status, latency, and last check time for each service
- Three possible states:
  - 🟢 `available` - Service is healthy
  - 🔴 `unavailable` - Service is down
  - 🟡 `checking` - Health check in progress (with pulse animation)

**Auto-monitoring:**
- Starts when the Header component mounts
- Runs checks every 10 seconds
- Stops when component unmounts

### Updated Header Component

**Visual Design:**
```
┌─────────────────────────────────────────┐
│  Ollama  •  Proxy  •  OpenAI   🔔  👤  │
│   🟢       🟢        🟢                  │
└─────────────────────────────────────────┘
```

**Features:**
- Color-coded status dots
- Service name labels
- Hover tooltips showing:
  - Availability status
  - Response latency (when available)
  - "Checking..." during health checks
  - "Unavailable" when service is down

**Status Colors:**
- 🟢 Green: Service available
- 🔴 Red: Service unavailable
- 🟡 Yellow (pulsing): Checking status

## How It Works

### Health Check Flow

```
1. Header component mounts
   ↓
2. Start health monitoring (every 10s)
   ↓
3. Fetch http://localhost:3003/health
   ↓
4. Parse response:
   {
     "data": {
       "backends": {
         "ollama": { "available": true, "latency": 50 },
         "proxy": { "available": true, "latency": 120 }
       }
     }
   }
   ↓
5. Update store with status for each service
   ↓
6. UI updates automatically (reactive)
   ↓
7. Wait 10 seconds, repeat from step 3
```

### Error Handling

If health check fails:
- All services marked as `unavailable`
- Error logged to console
- UI shows red dots for all services
- Next check in 10 seconds

## User Experience

### What Users See

**All services healthy:**
```
Ollama  •  Proxy  •  OpenAI
  🟢       🟢        🟢
```

**Some services down:**
```
Ollama  •  Proxy  •  OpenAI
  🟢       🔴        🔴
```

**Checking status:**
```
Ollama  •  Proxy  •  OpenAI
  🟡       🟡        🟡
 (pulsing animation)
```

### Tooltips on Hover

**When healthy:**
```
┌─────────────────┐
│ Available (50ms)│
└─────────────────┘
```

**When down:**
```
┌──────────────┐
│ Unavailable  │
└──────────────┘
```

**When checking:**
```
┌─────────────┐
│ Checking... │
└─────────────┘
```

## Benefits

✅ **Real-time monitoring** - Know immediately if AI services are down
✅ **At-a-glance status** - Quick visual feedback without opening settings
✅ **Performance metrics** - See latency for each service
✅ **Automatic updates** - No manual refresh needed
✅ **Better debugging** - Quickly identify which service is causing issues
✅ **Professional UI** - More informative than generic "Online/Offline"

## Technical Details

### Services Monitored

1. **Ollama (Port 11434)**
   - Local LLM service
   - Direct connection
   - Fastest option for AI queries

2. **Proxy (Port 3002)**
   - CORS proxy server
   - Required for browser → OpenAI API calls
   - Middleware service

3. **OpenAI (via Proxy)**
   - Remote AI service
   - Goes through proxy
   - Fallback when Ollama unavailable

### Health Check Endpoint

**URL:** `http://localhost:3003/health`

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "CS720 AI Service",
    "version": "1.0.0",
    "uptime": 12345,
    "backends": {
      "ollama": {
        "backend": "ollama",
        "available": true,
        "latency": 50,
        "model": "llama2"
      },
      "proxy": {
        "backend": "proxy",
        "available": true,
        "latency": 120
      }
    },
    "timestamp": "2025-10-23T18:00:00.000Z"
  }
}
```

### Performance

- **Health check frequency:** Every 10 seconds
- **Request timeout:** 5 seconds (in AI service)
- **Network overhead:** Minimal (~1KB per check)
- **UI updates:** Reactive (no manual refresh)

## Files Modified

1. ✅ **Created:** `frontend/src/store/aiHealthStore.ts`
   - New Zustand store for health monitoring
   - Auto-polling every 10 seconds
   - Clean lifecycle management

2. ✅ **Modified:** `frontend/src/components/layout/Header.tsx`
   - Removed "Online/Offline" indicator
   - Added three AI service indicators
   - Added tooltips with latency info
   - Integrated with health store

## Testing

To verify the health indicators:

1. **All services running:**
   ```bash
   npm run dev
   ```
   Expected: All three indicators show green

2. **Stop Ollama:**
   ```bash
   # Stop Ollama service
   ```
   Expected: Ollama shows red, others green

3. **Stop Proxy:**
   ```bash
   # Kill proxy service (Ctrl+C)
   ```
   Expected: Proxy and OpenAI show red, Ollama green

4. **Stop AI Service:**
   ```bash
   # Kill AI service
   ```
   Expected: All three show red (can't reach health endpoint)

## Future Enhancements

Potential improvements:

1. **Click to view details** - Modal with full service info
2. **Historical data** - Graph showing uptime over time
3. **Notifications** - Alert when service goes down
4. **Manual refresh** - Button to force health check
5. **Settings integration** - Configure which backend to prefer
6. **Status page** - Dedicated page with detailed diagnostics

---

**The health indicators are now live!** Refresh your browser to see the three AI service status dots in the top-right corner of the header. 🎉
