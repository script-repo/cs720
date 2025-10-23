# CS720 Setup Checklist ✅

Use this checklist to track your setup progress:

## Pre-Setup Requirements
- [ ] Node.js 20+ installed (`node --version`)
- [ ] Git installed
- [ ] Salesforce account with admin access
- [ ] Microsoft 365 account with OneDrive

## Quick Installation
- [ ] Run: `npm install` (installs all dependencies)
- [ ] Run: `cp backend/.env.example backend/.env` (creates environment file)
- [ ] Run: `node test-setup.js` (verifies basic setup)

## OAuth Configuration

### Salesforce Setup
- [ ] Log into Salesforce → Setup → App Manager
- [ ] Create New Connected App named "CS720 Customer Intelligence"
- [ ] Enable OAuth Settings
- [ ] Set Callback URL: `http://localhost:3001/api/auth/salesforce/callback`
- [ ] Add OAuth Scopes: `api`, `refresh_token`
- [ ] Save and wait 2-10 minutes
- [ ] Copy Consumer Key → Update `SALESFORCE_CLIENT_ID` in `.env`
- [ ] Copy Consumer Secret → Update `SALESFORCE_CLIENT_SECRET` in `.env`

### Microsoft/Azure Setup
- [ ] Go to Azure Portal → App registrations
- [ ] Create new registration named "CS720 Customer Intelligence"
- [ ] Set Redirect URI: `http://localhost:3001/api/auth/onedrive/callback`
- [ ] Add API Permissions: `Files.Read`, `offline_access`
- [ ] Grant admin consent (if admin)
- [ ] Create new client secret
- [ ] Copy Application ID → Update `MICROSOFT_CLIENT_ID` in `.env`
- [ ] Copy Client Secret Value → Update `MICROSOFT_CLIENT_SECRET` in `.env`

## Local AI Setup (Ollama)
- [ ] Install Ollama: `winget install Ollama.Ollama` (Windows) or see SETUP.md
- [ ] Start service: `ollama serve`
- [ ] Download model: `ollama pull llama2:7b-chat`
- [ ] Test: `ollama run llama2:7b-chat "Hello"`

## Optional: External AI
- [ ] Get OpenAI API key from platform.openai.com
- [ ] Update `OPENAI_API_KEY` in `.env`

## Testing & Verification
- [ ] Run: `npm run dev` (starts both servers)
- [ ] Open: http://localhost:3000 (frontend loads)
- [ ] Check: http://localhost:3001/health (backend responds)
- [ ] Run: `node test-setup.js` (all checks pass)

## First Use Testing
- [ ] Go to Settings page in CS720
- [ ] Click "Connect Salesforce" → Complete OAuth flow
- [ ] Click "Connect OneDrive" → Complete OAuth flow
- [ ] Go to Sync page → Start a test sync
- [ ] Check Dashboard → Verify data appears
- [ ] Test AI chat → Ask a question about customer data

## Production Deployment (for SE laptops)
- [ ] Create deployment package: `npm run build:all`
- [ ] Copy to SE laptops with setup scripts
- [ ] Provide OAuth credentials or setup instructions
- [ ] Run alpha testing checklist
- [ ] Measure success metrics

---

## Quick Commands Reference

```bash
# Setup
npm install
cp backend/.env.example backend/.env
node test-setup.js

# Development
npm run dev                # Start both servers
npm run dev:frontend      # Frontend only
npm run dev:backend       # Backend only

# Production
npm run build             # Build both
npm run build:frontend    # Frontend only
npm run build:backend     # Backend only

# Testing
curl http://localhost:3001/health           # Backend health
curl http://localhost:3001/api/auth/status  # Auth status
curl http://localhost:3001/api/ai/health    # AI health
```

## Troubleshooting Quick Fixes

**Port already in use:**
```bash
# Kill processes on ports 3000/3001
npx kill-port 3000 3001
```

**OAuth redirect errors:**
- Verify URLs match exactly in Salesforce/Azure
- Use `http://localhost:3001/api/auth/...` format

**AI not working:**
- Check `ollama serve` is running
- Verify OpenAI API key if using external AI
- Test: `curl http://localhost:3001/api/ai/health`

---

**Status:** Ready for implementation! 🚀