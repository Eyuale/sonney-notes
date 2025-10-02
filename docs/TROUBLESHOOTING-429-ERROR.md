# Fixing the 429 "Too Many Requests" Error

## The Problem

You're seeing this error:

```
Error: [GoogleGenerativeAI Error]: Error fetching from 
https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent: 
[429 Too Many Requests] You exceeded your current quota
```

## Why This Happens

Google's **free tier for embeddings** has extremely strict limits:
- Very low daily quota
- Very low per-minute quota
- Shared across all your projects
- Easily exceeded when indexing documents

## The Solution ✅

**Switch to OpenAI embeddings** - they have much better rate limits and are very affordable.

### Step 1: Get an OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-...` or `sk-...`)

**New users get $5 free credit!**

### Step 2: Add to Environment Variables

Add to your `.env.local`:

```bash
OPENAI_API_KEY=sk-proj-your-key-here
```

### Step 3: Restart Your App

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### Step 4: Test It

Upload a document and ask a question - it should work now!

## What Changed

**Before**:
- ❌ Google Gemini embeddings (very limited free tier)
- ❌ Frequent 429 errors
- ❌ Can't index documents reliably

**After**:
- ✅ OpenAI embeddings (generous limits)
- ✅ No more 429 errors
- ✅ Reliable document indexing
- ✅ Still using Gemini for answer generation

## Cost Breakdown

**OpenAI Embeddings** (`text-embedding-3-small`):
- **Price**: $0.02 per 1 million tokens
- **50-page textbook**: ~30,000 tokens = $0.0006 (less than a penny!)
- **100 questions**: ~10,000 tokens = $0.0002/day
- **Monthly cost**: ~$0.02 - $0.05

**Gemini Answer Generation**:
- **Free tier**: 60 requests per minute
- **Cost**: $0

**Total**: Less than **$0.10/month** for typical student use 💰

## Still Getting Errors?

### "Invalid API key"

Check that:
- Key is copied correctly (no spaces)
- Key starts with `sk-proj-` or `sk-`
- Key is in `.env.local` file

### "Insufficient quota"

Your OpenAI account needs a payment method:
1. Go to https://platform.openai.com/account/billing
2. Add a payment method
3. Use the $5 free credit

### "Module not found"

You might need to reinstall dependencies:

```bash
npm install @langchain/openai tiktoken
```

## Verification

Check console logs when uploading a document:

**Good** (working):
```
Processing 1 attachment(s) for RAG indexing...
Indexing biology.pdf (application/pdf)...
✓ Successfully indexed 45 chunks from biology.pdf
```

**Bad** (still broken):
```
Error: OPENAI_API_KEY is required for embeddings
```

## Alternative: Free Embeddings

If you absolutely don't want to use OpenAI, you can use free alternatives:

1. **HuggingFace Inference API** (free tier)
2. **Local embeddings** with transformers.js
3. **Sentence transformers** (self-hosted)

See `docs/ALTERNATIVE-EMBEDDINGS.md` for setup.

## Summary

✅ Google Gemini has strict embedding limits  
✅ Switch to OpenAI embeddings (very cheap)  
✅ Add `OPENAI_API_KEY` to `.env.local`  
✅ Restart app and test  
✅ Cost: ~$0.05/month for typical use  

The 429 error will be gone and RAG will work reliably! 🚀

