# RAG Quick Start Guide

Get started with RAG (Retrieval-Augmented Generation) in under 5 minutes!

## Prerequisites

✅ **Google Gemini API Key** (for answer generation) - https://makersuite.google.com/app/apikey  
✅ **OpenAI API Key** (for embeddings) - https://platform.openai.com/api-keys  
✅ Docker installed (for Chroma DB)  
✅ MongoDB connection (already configured)

> **Note**: We use OpenAI for embeddings because Google's free tier has very strict limits that cause errors. OpenAI costs ~$0.05/month for typical use and is much more reliable.

## Step 1: Start Chroma DB

Run the Chroma vector database:

```bash
# Option 1: Use the npm script (recommended)
npm run chroma:start

# Option 2: Manual Docker command
docker run -p 8000:8000 chromadb/chroma
```

Chroma will run on `http://localhost:8000`

## Step 2: Verify Environment Variables

Make sure your `.env.local` has:

```bash
# Required: Gemini for answer generation
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key_here

# Required: OpenAI for embeddings (better rate limits)
OPENAI_API_KEY=

# Required: MongoDB
MONGODB_URI=your_mongodb_connection_string

# Optional (defaults shown)
# GEMINI_MODEL_NAME=gemini-1.5-pro
# CHROMA_URL=http://localhost:8000
```

> **Don't have an OpenAI key?** Get one at https://platform.openai.com/api-keys (new users get $5 free credit)  
> **See detailed setup**: [docs/API-KEYS-SETUP.md](./API-KEYS-SETUP.md)

## Step 3: Start Your App

```bash
npm run dev
```

## Step 4: Use RAG!

1. **Open the app** at `http://localhost:3000`
2. **Sign in** with Google (top-right)
3. **Upload a document**:
   - Click the paperclip icon 📎 in the chat
   - Select a document: **PDF, DOCX, TXT, or MD**
   - Wait for upload to complete
4. **Ask questions**:
   - "What is photosynthesis?" (if biology textbook)
   - "Explain chapter 3"
   - "Summarize unit 2"
   - "What does the document say about X?"

## What Happens Automatically

When you upload a document (PDF, DOCX, TXT, or MD) and ask a question:

1. ✅ Document text is **extracted** (supports multiple formats)
2. ✅ Text is **chunked** into 1000-character segments
3. ✅ Chunks are **embedded** using Google's embedding model
4. ✅ Embeddings are **stored** in Chroma DB
5. ✅ Your question is **searched** against stored chunks
6. ✅ Relevant chunks are **retrieved** (top 8 most relevant)
7. ✅ Gemini **generates** an answer using only those chunks
8. ✅ **Sources** are cited in the response

### Supported Document Formats

- ✅ **PDF** - Text-based PDFs (best results)
- ✅ **DOCX** - Microsoft Word documents
- ✅ **TXT** - Plain text files
- ✅ **MD** - Markdown files

## Example Interaction

**You**: *[Uploads biology textbook PDF or DOCX]*  
**You**: "What is cellular respiration?"

**AI**: "Based on your document, cellular respiration is the process by which cells break down glucose and other molecules to produce ATP (adenosine triphosphate), which is the cell's primary energy currency. The process occurs in three main stages: glycolysis, the Krebs cycle, and the electron transport chain.

📚 *Based on 6 section(s) from your uploaded document(s)*"

## Testing RAG

Try these questions to test RAG functionality:

- "Summarize the main points from the document"
- "What does chapter X say about [topic]?"
- "Explain [concept] according to the PDF"
- "Find information about [keyword]"

## Troubleshooting

### "Vector store not available"
- Make sure Chroma is running: `docker ps` should show `chromadb/chroma`
- Try restarting Chroma: `docker stop chroma-db && npm run chroma:start`

### "No text could be extracted"
- PDF might be image-based (scanned) - try a text-based PDF or DOCX
- DOCX might be corrupted - try opening in Word and re-saving
- Check file isn't password-protected
- Try converting to TXT or MD format

### No response or slow
- First query takes ~3-5 seconds (model initialization)
- Large PDFs (>100 pages) may take longer to index
- Check console logs for errors

## Advanced Usage

### Manual Indexing API

```javascript
// Index a specific PDF
const response = await fetch('/api/rag/index', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    objectKey: 's3-key-here',
    filename: 'textbook.pdf'
  })
});
```

### Query API

```javascript
// Query without auto-indexing
const response = await fetch('/api/rag/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'What is photosynthesis?',
    k: 6 // number of chunks to retrieve
  })
});
```

### List Indexed Documents

```javascript
const response = await fetch('/api/rag/index');
const { documents } = await response.json();
```

## Performance Tips

- **Smaller PDFs** (10-50 pages) work best for quick indexing
- **Clear questions** get better results
- **Specific queries** (e.g., "Explain theorem 3.2") are more accurate than vague ones
- **Wait for indexing** - let the upload complete before asking questions

## Next Steps

- Read [docs/rag-setup.md](./rag-setup.md) for detailed documentation
- Experiment with different PDF types
- Try multi-document queries (upload multiple PDFs)
- Customize chunk size and retrieval parameters (see setup docs)

## Support

If you encounter issues:

1. Check Docker is running: `docker ps`
2. Check Chroma health: `curl http://localhost:8000/api/v1/heartbeat`
3. Check browser console for errors
4. Check Next.js server logs

Happy querying! 🚀

