# Troubleshooting: Environment Variables Not Loading

## The Issue

Your `.env.local` file has the Gemini API key, but the app isn't seeing it.

## Common Causes

### 1. Server Not Restarted
**Most common!** Environment variables are only loaded when the server starts.

**Fix:**
```bash
# Stop the server (Ctrl+C)
npm run dev
```

### 2. Wrong File Location
`.env.local` must be in the **root** of your project:

```
my-tiptap-project/
  ├── .env.local          ✅ HERE
  ├── app/
  ├── components/
  ├── lib/
  └── package.json
```

**Not here:**
- ❌ `app/.env.local`
- ❌ `lib/.env.local`
- ❌ `.env` (should be `.env.local`)

### 3. Incorrect Key Name
Check your `.env.local` has the **exact** name:

```bash
# ✅ CORRECT
GOOGLE_GENERATIVE_AI_API_KEY=AIza...your_key

# ❌ WRONG (missing _AI)
GOOGLE_GENERATIVE_API_KEY=AIza...your_key

# ❌ WRONG (typo)
GOOGLE_GENERATIVE_Al_API_KEY=AIza...your_key
```

### 4. Extra Spaces or Quotes
The value should have **no quotes or spaces**:

```bash
# ✅ CORRECT
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyAbc123def456

# ❌ WRONG (has quotes)
GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyAbc123def456"
GOOGLE_GENERATIVE_AI_API_KEY='AIzaSyAbc123def456'

# ❌ WRONG (has spaces)
GOOGLE_GENERATIVE_AI_API_KEY= AIzaSyAbc123def456
GOOGLE_GENERATIVE_AI_API_KEY = AIzaSyAbc123def456
```

### 5. File Encoding Issues
Make sure `.env.local` is saved as **UTF-8** (not UTF-16 or other).

## How to Verify

After restarting your server, check the console logs. You should see:

```
💻 Using LOCAL embeddings - runs offline on your computer, no API needed!
🔍 Checking Gemini API key...
   - API key exists: true
   - API key length: 39
   - API key preview: AIzaSyAbc123de...
```

If you see:
```
❌ GOOGLE_GENERATIVE_AI_API_KEY not set
   - API key exists: false
   - API key length: 0
   - API key preview: MISSING
```

Then the environment variable isn't loading.

## Step-by-Step Fix

### Step 1: Open `.env.local`

Make sure it's in the root folder:
```
C:\Users\hp\Desktop\Projects\my-tiptap-project\.env.local
```

### Step 2: Check the Contents

Should look like this (with your actual key):

```bash
# Gemini API Key
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyAbc123def456ghi789

# MongoDB
MONGODB_URI=mongodb+srv://...

# Other variables...
```

**Important:**
- No quotes around the value
- No spaces before or after `=`
- Key name is exactly `GOOGLE_GENERATIVE_AI_API_KEY`

### Step 3: Save the File

Make sure you actually saved it (Ctrl+S or Cmd+S).

### Step 4: Restart the Server

```bash
# In your terminal, stop the server
Ctrl+C

# Start it again
npm run dev
```

### Step 5: Check Console Logs

Look for:
```
🔍 Checking Gemini API key...
   - API key exists: true
   - API key length: 39
   - API key preview: AIzaSy...
```

If it says `true`, you're good! Try uploading a document and asking a question.

## Still Not Working?

### Check if File Exists

**Windows PowerShell:**
```powershell
Get-Content .env.local
```

**Windows CMD:**
```cmd
type .env.local
```

You should see your environment variables.

### Create New .env.local

If the file might be corrupted:

1. **Delete** the old `.env.local`
2. **Create new file** called `.env.local` in project root
3. **Add this:**
   ```bash
   GOOGLE_GENERATIVE_AI_API_KEY=your_actual_key_here
   MONGODB_URI=your_mongodb_uri_here
   ```
4. **Save**
5. **Restart server**

### Verify Key is Valid

Test your Gemini API key works:

1. Go to: https://aistudio.google.com/app/apikey
2. Make sure your key is there and active
3. Copy it fresh and paste into `.env.local`

## Example Working `.env.local`

```bash
# Authentication
AUTH_SECRET=your_random_secret_string
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Gemini API (for answer generation)
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyAbc123def456ghi789jkl

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true

# Optional
GEMINI_MODEL_NAME=gemini-1.5-pro
MONGODB_DB=tiptap_app
```

Save this, restart server, and it should work!

## Quick Test

After restarting, upload your biology PDF again and ask a question. If you see:

```
✓ RAG answered successfully using 8 sources
```

Then it's working! 🎉

