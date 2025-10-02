# RAG (Retrieval-Augmented Generation) Setup Guide

This application now includes RAG functionality using LangChain and Google Gemini to answer questions over user-uploaded PDF documents.

## Architecture Overview

The RAG system consists of:

1. **Document Processing** (`lib/rag-document-processor.ts`) - Extracts text from PDFs and chunks them for embedding
2. **Vector Store** (`lib/rag-vector-store.ts`) - Manages embeddings using Chroma DB
3. **RAG Service** (`lib/rag-service.ts`) - Combines retrieval with Gemini for question answering
4. **API Endpoints** - `/api/rag/index` and `/api/rag/query` for indexing and querying
5. **Auto-indexing** - PDFs are automatically indexed when attached to chat messages

## Prerequisites

### 1. Google Generative AI API Key

You need a Google API key for Gemini:

```bash
# Add to .env.local
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

Get your API key from: https://makersuite.google.com/app/apikey

### 2. Chroma Vector Database

Chroma DB is used to store document embeddings. You have two options:

#### Option A: Docker (Recommended)

```bash
# Run Chroma in Docker
docker run -p 8000:8000 chromadb/chroma
```

#### Option B: Python Installation

```bash
# Install Chroma
pip install chromadb

# Run Chroma server
chroma run --path ./chroma_data
```

The application expects Chroma to be running on `http://localhost:8000` by default.

### 3. Environment Variables

Add to your `.env.local`:

```bash
# Required
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=tiptap_app

# Optional
GEMINI_MODEL_NAME=gemini-1.5-pro
CHROMA_URL=http://localhost:8000
```

## Usage

### Automatic Mode (Recommended)

The RAG system works automatically when users upload PDFs and ask questions:

1. **Upload a PDF** - Use the paperclip icon in the chat to attach a PDF
2. **Ask a Question** - Type any question about the document
3. **RAG Auto-activates** - The system will:
   - Automatically extract text from the PDF
   - Chunk and index it into the vector store
   - Retrieve relevant sections
   - Use Gemini to generate an answer based on the context

### Manual Indexing

You can also manually index PDFs using the API:

```javascript
// Index a PDF document
const response = await fetch('/api/rag/index', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    objectKey: 's3-object-key',
    filename: 'textbook.pdf'
  })
});

const result = await response.json();
// { success: true, chunksIndexed: 45, filename: 'textbook.pdf' }
```

### Querying Indexed Documents

```javascript
// Query indexed documents
const response = await fetch('/api/rag/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'What is photosynthesis?',
    k: 4 // Number of chunks to retrieve
  })
});

const result = await response.json();
// {
//   answer: "Based on the document...",
//   sourceCount: 4,
//   sources: [...]
// }
```

### List Indexed Documents

```javascript
// Get list of indexed documents
const response = await fetch('/api/rag/index');
const data = await response.json();
// { documents: [...] }
```

## How It Works

### 1. Document Processing

When a PDF is uploaded:
- Text is extracted using `pdf-parse` and `pdfjs-dist`
- Text is split into chunks (1000 chars with 200 char overlap)
- Each chunk preserves metadata (filename, source)

### 2. Embedding & Storage

- Each chunk is embedded using Google's `embedding-001` model
- Embeddings are stored in Chroma DB with user-specific collections
- Collection name format: `user_{userId}_docs`

### 3. Retrieval

When a question is asked:
- The question is embedded using the same model
- Semantic similarity search retrieves top-k relevant chunks
- Results are filtered by relevance score (threshold: 0.5)

### 4. Generation

- Retrieved chunks are formatted as context
- A prompt combines the context with the user's question
- Gemini generates an answer based only on the provided context
- Source information is included in the response

## RAG Trigger Keywords

The system automatically uses RAG when the question contains keywords like:

- "according to"
- "in the document"
- "in my pdf"
- "explain"
- "summarize"
- "unit", "chapter", "section"
- "textbook", "lecture", "notes"

Or when PDFs are attached to the message.

## Customization

### Adjust Chunk Size

Edit `lib/rag-document-processor.ts`:

```typescript
export async function processPdfForRAG(
  buffer: Buffer,
  filename: string,
  options: {
    chunkSize?: number; // Default: 1000
    chunkOverlap?: number; // Default: 200
  } = {}
)
```

### Adjust Retrieval Count

Edit `lib/rag-service.ts` or pass in API calls:

```typescript
const result = await answerQuestionWithRAG(userId, question, {
  k: 6, // Retrieve 6 chunks instead of 4
});
```

### Change Temperature

Lower temperature = more factual, higher = more creative:

```typescript
const model = new ChatGoogleGenerativeAI({
  temperature: 0.3, // Default for RAG
});
```

## Troubleshooting

### "Vector store not available"

- Make sure Chroma DB is running on port 8000
- Check with: `curl http://localhost:8000/api/v1/heartbeat`

### "No text could be extracted"

- The PDF might be image-based (scanned)
- Try using OCR-enabled PDFs
- Check PDF file isn't corrupted

### Poor answer quality

- Increase `k` to retrieve more chunks
- Adjust chunk size and overlap
- Ensure PDFs have good quality text
- Check that questions are specific

### High latency

- First query takes longer (model initialization)
- Reduce chunk count being retrieved
- Consider caching embeddings

## Architecture Decisions

### Why Chroma DB?

- Open source and easy to deploy
- Good Python/JS support
- No cloud vendor lock-in
- Runs locally for development

### Why Google Gemini Embeddings?

- Free tier available
- Good quality embeddings
- Native integration with Gemini models
- Consistent with existing LLM choice

### Why Auto-indexing?

- Better UX - users don't need separate indexing step
- Documents are indexed only when needed
- Automatically handles re-uploads

## Performance Notes

- **Indexing**: ~2-5 seconds for typical 50-page PDF
- **Querying**: ~1-2 seconds for typical question
- **Storage**: ~1-2 MB per indexed PDF in Chroma
- **Embeddings**: Cached per user collection

## Future Enhancements

Potential improvements:

- [ ] Support for multi-modal PDFs (images + text)
- [ ] Better table extraction in RAG context
- [ ] Citation with page numbers
- [ ] Hybrid search (keyword + semantic)
- [ ] Support for other document types (DOCX, TXT)
- [ ] Conversation memory in RAG queries
- [ ] Re-ranking for better relevance

## API Reference

### POST /api/rag/index

Index a PDF document.

**Request:**
```json
{
  "objectKey": "string",
  "filename": "string"
}
```

**Response:**
```json
{
  "success": true,
  "chunksIndexed": 45,
  "collectionName": "user_xxx_docs",
  "message": "Successfully indexed..."
}
```

### GET /api/rag/index

Get indexed documents.

**Response:**
```json
{
  "documents": [
    {
      "id": "...",
      "filename": "textbook.pdf",
      "chunkCount": 45,
      "indexedAt": "2025-10-02T..."
    }
  ]
}
```

### POST /api/rag/query

Query indexed documents.

**Request:**
```json
{
  "question": "string",
  "k": 4,
  "includeScores": false
}
```

**Response:**
```json
{
  "answer": "Based on your documents...",
  "sourceCount": 4,
  "sources": [...],
  "scores": [0.85, 0.82, ...]
}
```

