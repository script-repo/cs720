# CS720 Setup Guide 🚀

Follow these steps to set up CS720 Customer Intelligence Platform on your machine.

## Prerequisites ✅

- **Node.js 20+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **Salesforce account** with admin access
- **Microsoft 365 account** with OneDrive access

## Quick Start (5 minutes)

```bash
# 1. Clone and install
git clone <your-repo-url>
cd CS720
npm install

# 2. Set up environment
cd backend
cp .env.example .env
# Edit .env with your OAuth credentials (see steps below)

# 3. Start the application
cd ..
npm run dev
```

**Open:** http://localhost:3000

---

## Step 1: Salesforce OAuth Setup 🏢

### Create Connected App in Salesforce

1. **Log into Salesforce** → Setup (gear icon) → App Manager
2. **Click "New Connected App"**
3. **Fill in Basic Information:**
   - Connected App Name: `CS720 Customer Intelligence`
   - API Name: `CS720_Customer_Intelligence`
   - Contact Email: Your email
   - Description: `Local application for Sales Engineer customer context`

4. **Enable OAuth Settings:**
   - ✅ Check "Enable OAuth Settings"
   - **Callback URL:** `http://localhost:3001/api/auth/salesforce/callback`
   - **Selected OAuth Scopes:**
     - ✅ Access and manage your data (api)
     - ✅ Perform requests on your behalf at any time (refresh_token, offline_access)

5. **Save** and wait 2-10 minutes for the app to propagate

6. **Get Your Credentials:**
   - Click "View" on your new Connected App
   - Copy **Consumer Key** (this is your CLIENT_ID)
   - Click "Click to reveal" next to Consumer Secret
   - Copy **Consumer Secret** (this is your CLIENT_SECRET)

### Update .env File
```bash
# Edit backend/.env
SALESFORCE_CLIENT_ID=your_consumer_key_here
SALESFORCE_CLIENT_SECRET=your_consumer_secret_here
```

---

## Step 2: Microsoft/OneDrive OAuth Setup ☁️

### Register App in Azure Portal

1. **Go to** [Azure Portal](https://portal.azure.com)
2. **Navigate to:** Azure Active Directory → App registrations
3. **Click "New registration"**
4. **Fill in details:**
   - Name: `CS720 Customer Intelligence`
   - Supported account types: `Accounts in any organizational directory`
   - **Redirect URI:** Select "Web" → `http://localhost:3001/api/auth/onedrive/callback`

5. **Click "Register"**

6. **Set up API Permissions:**
   - Go to "API permissions" in the left menu
   - Click "Add a permission" → Microsoft Graph → Delegated permissions
   - **Add these permissions:**
     - ✅ `Files.Read` (Read user files)
     - ✅ `offline_access` (Maintain access to data)
   - Click "Grant admin consent" (if you're an admin)

7. **Create Client Secret:**
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Description: `CS720 Secret`
   - Expires: 24 months
   - **Copy the VALUE** (not the ID) - this is your CLIENT_SECRET

8. **Get Application ID:**
   - Go to "Overview"
   - Copy **Application (client) ID** - this is your CLIENT_ID

### Update .env File
```bash
# Edit backend/.env
MICROSOFT_CLIENT_ID=your_application_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_value_here
```

---

## Step 3: Install Ollama (Local AI) 🤖

### Windows Installation
```powershell
# Option 1: Using winget (recommended)
winget install Ollama.Ollama

# Option 2: Download installer
# Go to https://ollama.ai/download and download the Windows installer
```

### Setup Local AI Model
```bash
# Start Ollama service (runs in background)
ollama serve

# In a new terminal, pull a model
ollama pull llama2:7b-chat

# Test it works
ollama run llama2:7b-chat "Hello, how are you?"
```

**Note:** Ollama runs on http://localhost:11434 by default (already configured in .env)

---

## Step 4: Optional - OpenAI API 🧠

If you want to use OpenAI instead of or in addition to local AI:

1. **Get API Key:**
   - Go to [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create new API key
   - Copy the key

2. **Update .env:**
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

---

## Step 5: Start CS720 🎯

```bash
# From the CS720 root directory
npm run dev
```

This starts:
- **Backend API:** http://localhost:3001
- **Frontend App:** http://localhost:3000

### Verify Setup

1. **Open CS720:** http://localhost:3000
2. **Check API health:** http://localhost:3001/health
3. **Test authentication:** Go to Settings page and connect your accounts

---

## Troubleshooting 🔧

### Common Issues

**"Failed to start backend"**
- Check that Node.js 20+ is installed: `node --version`
- Verify .env file exists and has correct values
- Check port 3001 isn't already in use

**"OAuth redirect error"**
- Verify redirect URIs match exactly in Salesforce/Azure
- Check that URLs use http://localhost:3001/api/auth/... format

**"AI queries not working"**
- For local AI: Make sure `ollama serve` is running
- For OpenAI: Verify API key is correct and has usage remaining
- Check http://localhost:3001/api/ai/health for status

**"Sync not working"**
- Ensure OAuth authentication completed successfully
- Check browser console for any error messages
- Verify Salesforce/OneDrive accounts have accessible data

### Getting Help

- **Check logs:** Browser DevTools → Console
- **Backend logs:** Terminal running `npm run dev`
- **API status:** http://localhost:3001/health

---

## Next Steps 🎉

Once setup is complete:

1. **Authenticate:** Connect your Salesforce and OneDrive accounts
2. **Sync Data:** Run your first data synchronization
3. **Test AI:** Ask questions about your customer data
4. **Explore:** Navigate through the dashboard and features

**Success!** CS720 is now ready to help you understand customer context in under 5 minutes! 🚀