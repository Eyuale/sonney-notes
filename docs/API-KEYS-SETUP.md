# API Keys Setup Guide

## Required API Keys

To use the RAG system, you need **TWO** API keys:

### 1. Google Gemini API Key (for answer generation)

**Purpose**: Used by Gemini to generate answers from retrieved context

**Get it here**: https://makersuite.google.com/app/apikey

**Free tier**: 60 requests per minute

**Add to `.env.local`**:
```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key_here
```

### 2. OpenAI API Key (for embeddings)

**Purpose**: Used to create vector embeddings of document chunks and questions

**Why OpenAI instead of Google?**
- Google's embedding API has very strict free tier limits (causing 429 errors)
- OpenAI has much better rate limits and pricing
- More reliable for production use

**Get it here**: https://platform.openai.com/api-keys

**Pricing**: 
- `text-embedding-3-small`: $0.02 per 1M tokens (~$0.0001 per document)
- First-time users get $5 free credit

**Add to `.env.local`**:
```bash
OPENAI_API_KEY=your_openai_key_here
```

## Complete .env.local Example

```bash
# Required: Google Gemini (for answer generation)
GOOGLE_GENERATIVE_AI_API_KEY=AIza...your_gemini_key

# Required: OpenAI (for embeddings)
OPENAI_API_KEY=sk-proj-...your_openai_key

# Required: MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/

# Optional
GEMINI_MODEL_NAME=gemini-1.5-pro
CHROMA_URL=http://localhost:8000
MONGODB_DB=tiptap_app

# Auth (if using)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
AUTH_SECRET=your_random_secret

# AWS S3 (if using file uploads)
AWS_REGION_NAME=us-east-1
S3_BUCKET_NAME=your-bucket
AWS_ACCESS_KEY_ID_SECRET=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret
```

## Why Two APIs?

**Gemini** (Google):
- ✅ Excellent at generating natural language answers
- ✅ Good free tier for generation
- ❌ Very limited embedding quota (causes 429 errors)

**OpenAI**:
- ✅ Industry-standard embeddings
- ✅ Better rate limits
- ✅ Very affordable ($0.02 per 1M tokens)
- ✅ Reliable and fast
- ❌ Not completely free (but very cheap)

## Cost Estimate

For a typical student using the system:

**Embeddings (OpenAI)**:
- 50-page textbook = ~30,000 tokens = **$0.0006**
- 100 questions/day = ~10,000 tokens = **$0.0002/day**
- Monthly cost: **~$0.02 - $0.05**

**Answer Generation (Gemini)**:
- Free tier: 60 requests/minute
- Sufficient for most student use

**Total monthly cost**: Less than $0.10 for typical use 💰

## Getting Started

### Step 1: Get Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (starts with `AIza...`)
4. Add to `.env.local`:
   ```bash
   GOOGLE_GENERATIVE_AI_API_KEY=AIza...
   ```

### Step 2: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-...` or `sk-...`)
5. Add to `.env.local`:
   ```bash
   OPENAI_API_KEY=sk-proj-...
   ```

### Step 3: Restart Your App

```bash
npm run dev
```

### Step 4: Test It

1. Upload a document
2. Ask a question
3. Check console logs for successful indexing
4. Verify you get an accurate answer

## Troubleshooting

### "OPENAI_API_KEY is required"

❌ **Error**: Missing OpenAI API key  
✅ **Fix**: Add `OPENAI_API_KEY=your_key` to `.env.local`

### "You exceeded your current quota" (429 error)

❌ **Error**: Out of API credits  
✅ **Fix**: 
- Check your OpenAI billing: https://platform.openai.com/account/billing
- Add payment method if needed
- Use the free $5 credit for new accounts

### "Invalid API key"

❌ **Error**: Wrong or expired API key  
✅ **Fix**:
- Verify the key is copied correctly
- Check for extra spaces
- Regenerate the key if needed

### Still seeing Google embedding errors?

❌ **Error**: Still using Google embeddings  
✅ **Fix**:
- Make sure you've restarted the dev server
- Check that OpenAI key is in `.env.local`
- Clear `.next` folder: `rm -rf .next` (then restart)

## Security Notes

🔒 **Never commit API keys to git**
- `.env.local` is already in `.gitignore`
- Never share keys publicly
- Rotate keys if accidentally exposed

🔒 **Rate limiting**
- OpenAI: 3,000 requests/minute (plenty for RAG)
- Gemini: 60 requests/minute (sufficient for answers)

🔒 **Cost protection**
- Set spending limits in OpenAI dashboard
- Monitor usage at https://platform.openai.com/usage

## Alternative: Free Embeddings (Advanced)

If you want to avoid OpenAI costs entirely, you can use:

1. **HuggingFace Inference API** (free tier available)
2. **Local embeddings** with `transformers.js`
3. **Sentence transformers** (self-hosted)

See `docs/ALTERNATIVE-EMBEDDINGS.md` for setup instructions.

## Summary

✅ **Gemini** = Answer generation (free)  
✅ **OpenAI** = Embeddings (very cheap, ~$0.05/month)  
✅ **Total cost** = Practically free for students  
✅ **Much more reliable** than Google-only approach  

Get your keys and start using RAG! 🚀

