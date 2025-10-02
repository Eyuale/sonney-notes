# QUICK FIX: 429 Error - Google Embedding Quota Exceeded

## Problem ❌

You're getting this error:
```
[429 Too Many Requests] You exceeded your current quota
Quota exceeded for metric: generativelanguage.googleapis.com/embed_content_free_tier_requests
```

**Root cause**: Google's free tier for embeddings has very strict limits and you've exceeded them.

## Solution ✅

I've updated the system to use **OpenAI embeddings** instead (much better rate limits).

### What You Need to Do (3 steps):

#### 1. Get an OpenAI API Key

Go to: **https://platform.openai.com/api-keys**
- Sign up or log in
- Click "Create new secret key"
- Copy the key (starts with `sk-proj-...`)

**New users get $5 free credit!**

#### 2. Add to `.env.local`

Open your `.env.local` file and add:

```bash
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

Your `.env.local` should now have:

```bash
# Gemini for answer generation (keep this)
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key

# OpenAI for embeddings (NEW - add this)
OPENAI_API_KEY=sk-proj-your-openai-key

# MongoDB (keep this)
MONGODB_URI=your_mongodb_uri

# Other existing variables...
```

#### 3. Restart Your App

```bash
# Stop the server (Ctrl+C)
npm run dev
```

## That's It! 🎉

Now try:
1. Upload a document (PDF, DOCX, TXT, or MD)
2. Ask a question
3. It should work without 429 errors!

## Cost

**OpenAI embeddings are very cheap**:
- 50-page textbook = **$0.0006** (less than a penny!)
- Typical monthly usage = **$0.02 - $0.05**

**Gemini** (answer generation):
- Still **FREE** (we only changed embeddings)

**Total**: Less than **$0.10/month** for typical use 💰

## What Changed

**Before**:
- Google embeddings (very limited free tier)
- Frequent 429 errors
- Unreliable indexing

**After**:
- OpenAI embeddings (generous limits)
- No more 429 errors  
- Reliable document processing
- Still using Gemini for answers (free)

## Updated Files

I've updated these files for you:
- ✅ `lib/rag-vector-store.ts` - Now uses OpenAI embeddings
- ✅ `lib/rag-service.ts` - Added OpenAI config
- ✅ `README.md` - Updated environment variables
- ✅ `docs/API-KEYS-SETUP.md` - Complete setup guide
- ✅ `docs/TROUBLESHOOTING-429-ERROR.md` - Detailed troubleshooting

## Verification

After restarting, you should see in console:

**Good**:
```
Processing 1 attachment(s) for RAG indexing...
Indexing document.pdf (application/pdf)...
✓ Successfully indexed 45 chunks from document.pdf
Using RAG to answer: "your question..."
✓ RAG answered successfully using 6 sources
```

**Bad** (means you need to add the key):
```
OPENAI_API_KEY not set - RAG functionality will be limited
Error: OPENAI_API_KEY is required for embeddings
```

## Need Help?

See detailed guides:
- **API Keys Setup**: `docs/API-KEYS-SETUP.md`
- **Troubleshooting 429**: `docs/TROUBLESHOOTING-429-ERROR.md`
- **Quick Start**: `docs/rag-quick-start.md`

## Summary

1. ✅ Get OpenAI key: https://platform.openai.com/api-keys
2. ✅ Add `OPENAI_API_KEY=...` to `.env.local`
3. ✅ Restart app: `npm run dev`
4. ✅ Test with document upload
5. ✅ No more 429 errors!

The fix is simple and the cost is negligible. Your RAG system will now work reliably! 🚀

