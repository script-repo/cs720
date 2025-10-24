# CS720 Quick Start Guide

## ✅ Completed
- [x] Shared library installed
- [x] Shared library built successfully

## 📋 Next Steps

### 1. Install Remaining Dependencies

Run these commands in PowerShell:

```powershell
# Backend
cd services\backend
npm install --legacy-peer-deps
cd ..\..

# Proxy
cd services\proxy
npm install --legacy-peer-deps
cd ..\..

# AI Service
cd services\ai-service
npm install --legacy-peer-deps
cd ..\..

# Frontend
cd frontend
npm install --legacy-peer-deps
cd ..

# Root (for concurrently)
npm install concurrently --legacy-peer-deps
```

### 2. Configure Environment Files

```powershell
# Copy example files
copy services\backend\.env.example services\backend\.env
copy services\proxy\.env.example services\proxy\.env
copy services\ai-service\.env.example services\ai-service\.env

# Edit each .env file with your settings
notepad services\backend\.env
notepad services\proxy\.env
notepad services\ai-service\.env
```

**Important .env settings:**

**services/backend/.env:**
```env
PORT=3001
SALESFORCE_CLIENT_ID=your-salesforce-client-id
MICROSOFT_CLIENT_ID=your-microsoft-client-id
OLLAMA_BASE_URL=http://localhost:11434
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

**services/proxy/.env:**
```env
PORT=3002
```

**services/ai-service/.env:**
```env
PORT=3003
PREFERRED_BACKEND=ollama
OLLAMA_URL=http://localhost:11434
PROXY_URL=http://localhost:3002
```

### 3. Install Ollama (Optional but Recommended)

For local AI:

1. Download from https://ollama.ai
2. Install Ollama
3. Open a separate PowerShell terminal:
   ```powershell
   ollama serve
   ```
4. In another terminal, pull a model:
   ```powershell
   ollama pull llama2
   # Or for faster responses:
   ollama pull gemma2:2b
   ```

### 4. Start All Services

```powershell
npm run dev
```

You should see output like:
```
[BACKEND] Backend API running on http://localhost:3001
[PROXY] CORS Proxy running on http://localhost:3002
[AI] AI Service running on http://localhost:3003
[FRONTEND] Frontend running on http://localhost:3000
```

### 5. Verify Everything Works

Open a new PowerShell window:

```powershell
# Run health check
npm run health
```

Expected output:
```
✓ Frontend          HEALTHY (50ms)
✓ Backend API       HEALTHY (35ms)
✓ CORS Proxy        HEALTHY (20ms)
✓ AI Service        HEALTHY (45ms)
✓ Ollama            HEALTHY (100ms)
```

### 6. Access the Application

Open your browser:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/health
- **Proxy:** http://localhost:3002/health
- **AI Service:** http://localhost:3003/health

## 🎯 What Each Service Does

| Service | Port | Purpose |
|---------|------|---------|
| **Frontend** | 3000 | React PWA - Main user interface |
| **Backend** | 3001 | Core API - Handles data, auth, sync |
| **Proxy** | 3002 | CORS proxy for OpenAI-compatible APIs |
| **AI Service** | 3003 | AI chat with multi-backend support |

## 🔧 Common Issues

### Issue: Port already in use

```powershell
# Find what's using the port
netstat -ano | findstr :3001

# Kill the process
taskkill /PID <process-id> /F
```

### Issue: Services won't start

```powershell
# Make sure shared library is built
cd shared
npm run build
cd ..

# Try starting one service at a time
npm run dev:backend
# Then in separate terminals:
npm run dev:proxy
npm run dev:ai
npm run dev:frontend
```

### Issue: Frontend can't connect to backend

1. Check backend is running: http://localhost:3001/health
2. Check browser console for CORS errors
3. Verify frontend is configured to use correct backend URL

## 📚 Documentation

- **[README.md](./README.md)** - Project overview
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture
- **[WINDOWS_SETUP.md](./WINDOWS_SETUP.md)** - Windows-specific setup
- **[MODULARIZATION_SUMMARY.md](./MODULARIZATION_SUMMARY.md)** - What changed

## ✅ Success Criteria

You're ready to develop when:

- [ ] All services start without errors
- [ ] `npm run health` shows all services healthy
- [ ] Frontend loads at http://localhost:3000
- [ ] No errors in browser console
- [ ] Backend API responds at http://localhost:3001/health

## 🚀 Next Steps After Setup

1. Configure OAuth credentials for Salesforce/OneDrive
2. Test sync functionality
3. Test AI chat
4. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
5. Start developing!

---

**Need help?** Check the documentation or refer to error messages in the console.
