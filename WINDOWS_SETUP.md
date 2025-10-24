# CS720 Windows Setup Guide

This guide helps you set up CS720 on Windows, especially when working with OneDrive.

## Known Issues on Windows + OneDrive

1. **npm workspaces** - Symlink issues with OneDrive
2. **node_modules** - Directory lock issues during cleanup
3. **Long paths** - Windows path length limitations

## Solution: Manual Installation

Since automated installation has issues with OneDrive, follow these manual steps:

### Step 1: Install Dependencies Manually

Open PowerShell as Administrator and run each command:

```powershell
# Navigate to project root
cd "C:\Users\DaemonBehr\OneDrive - Nutanix\Documents\GitHub\cs720"

# 1. Install shared library
cd shared
npm install
cd ..

# 2. Install backend
cd services\backend
npm install
cd ..\..

# 3. Install proxy
cd services\proxy
npm install
cd ..\..

# 4. Install AI service
cd services\ai-service
npm install
cd ..\..

# 5. Install frontend
cd frontend
npm install
cd ..

# 6. Install root (for concurrently)
npm install concurrently
```

### Step 2: Build Shared Library

```powershell
cd shared
npm run build
cd ..
```

### Step 3: Configure Environment Files

```powershell
# Backend
copy services\backend\.env.example services\backend\.env

# Proxy
copy services\proxy\.env.example services\proxy\.env

# AI Service
copy services\ai-service\.env.example services\ai-service\.env
```

Edit each `.env` file with your credentials.

### Step 4: Start Services

#### Option A: Start All Services Together

```powershell
npm run dev
```

This starts all 4 services concurrently:
- Backend API (port 3001)
- CORS Proxy (port 3002)
- AI Service (port 3003)
- Frontend (port 3000)

#### Option B: Start Services Individually (in separate terminals)

**Terminal 1 - Backend:**
```powershell
npm run dev:backend
```

**Terminal 2 - Proxy:**
```powershell
npm run dev:proxy
```

**Terminal 3 - AI Service:**
```powershell
npm run dev:ai
```

**Terminal 4 - Frontend:**
```powershell
npm run dev:frontend
```

### Step 5: Verify Services

Open a new PowerShell window:

```powershell
# Check if all services are running
curl http://localhost:3000  # Frontend
curl http://localhost:3001/health  # Backend
curl http://localhost:3002/health  # Proxy
curl http://localhost:3003/health  # AI Service
```

Or run the health check script:

```powershell
npm run health
```

## Troubleshooting

### Issue: Port Already in Use

**Solution:**
```powershell
# Find process using port 3001 (repeat for other ports)
netstat -ano | findstr :3001

# Kill the process (replace <PID> with the actual process ID)
taskkill /PID <PID> /F
```

### Issue: npm install Fails with ENOTEMPTY

**Solution:**
```powershell
# Stop all node processes
taskkill /F /IM node.exe

# Wait a few seconds, then delete node_modules
Remove-Item -Path "node_modules" -Recurse -Force

# Try install again
npm install
```

### Issue: TypeScript Errors About @cs720/shared

**Solution:**
```powershell
# Rebuild shared library
cd shared
npm run build
cd ..

# If still failing, check services package.json has:
# "@cs720/shared": "file:../../shared"
```

### Issue: OneDrive Sync Conflicts

**Solution:**
1. Pause OneDrive sync while installing:
   - Right-click OneDrive icon in system tray
   - Click "Pause syncing" → "24 hours"

2. Run installation

3. Resume OneDrive sync after installation complete

4. Add to OneDrive exclusions (optional):
   - Go to OneDrive Settings → Backup → Manage backup
   - Exclude node_modules folders

## Alternative: Use WSL2 (Recommended for Development)

If you continue having issues with Windows/OneDrive, consider using WSL2:

### Install WSL2

```powershell
# In PowerShell as Administrator
wsl --install
```

### Clone project in WSL

```bash
# In WSL terminal
cd ~
git clone <your-repo-url> cs720
cd cs720

# Now use Linux commands
npm run install:all  # This will work without issues
npm run build:shared
npm run dev
```

### Access from Windows

- WSL filesystem: `\\wsl$\Ubuntu\home\<username>\cs720`
- Frontend: `http://localhost:3000` (accessible from Windows browser)

## Quick Start Checklist

- [ ] Install dependencies in each package manually
- [ ] Build shared library (`cd shared && npm run build`)
- [ ] Copy and configure .env files
- [ ] Start Ollama (`ollama serve` in separate terminal)
- [ ] Start all services (`npm run dev`)
- [ ] Verify health (`npm run health`)
- [ ] Access frontend at http://localhost:3000

## Service Ports Reference

| Service | Port | Health Check URL |
|---------|------|-----------------|
| Frontend | 3000 | http://localhost:3000 |
| Backend | 3001 | http://localhost:3001/health |
| Proxy | 3002 | http://localhost:3002/health |
| AI Service | 3003 | http://localhost:3003/health |
| Ollama | 11434 | http://localhost:11434/api/tags |

## Next Steps

Once everything is running:

1. Configure OAuth credentials in `services/backend/.env`
2. Test sync functionality
3. Test AI chat
4. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for architecture details

## Getting Help

If you encounter issues:

1. Check service logs in the terminal
2. Review `.env` files for correct configuration
3. Verify all ports are free
4. Try restarting services
5. Check [ARCHITECTURE.md](./ARCHITECTURE.md) for service details

---

**Important:** Due to OneDrive sync limitations, it's recommended to:
- Pause OneDrive during installation/development
- Or use WSL2 for development
- Or clone project outside OneDrive folder
