# Sonney Notes - AI-Powered Interactive Lesson Builder

An intelligent lesson creation platform that combines a rich-text editor with AI-powered content generation, document analysis, and interactive learning components. Built with Next.js, Tiptap, Google Gemini AI, and RAG (Retrieval-Augmented Generation) technology.

## 🎯 What Does This App Do?

**Sonney Notes** is a dual-panel application designed for educators, students, and content creators who want to:

1. **Generate Interactive STEM Lessons** - Ask the AI to create comprehensive lessons with text, quizzes, interactive graphs, and simulations
2. **Analyze Documents with AI** - Upload PDFs, DOCX, TXT, or Markdown files and ask questions about their content
3. **Create Rich Content** - Use a powerful Tiptap editor with formatting, images, code blocks, math expressions, and custom components
4. **Extract Document Summaries** - Automatically generate detailed, well-formatted summaries from uploaded documents
5. **Build Knowledge Base** - Store and query your documents using semantic search powered by vector embeddings

## 🏗️ Architecture Overview

### Two-Panel Interface

**Left Panel: Canvas/Editor (Tiptap)**
- Rich-text WYSIWYG editor with full formatting capabilities
- Custom interactive nodes: Graphs (with MathJS), Quizzes, Simulations
- Markdown support with automatic parsing
- Image uploads and embedded media
- Real-time content updates from AI

**Right Panel: AI Chat Assistant**
- Conversational interface powered by Google Gemini
- File attachment support (drag & drop)
- Chat history with save/load/rename/delete
- Context-aware responses based on uploaded documents
- Automatic lesson blueprint generation

### Core Technologies

- **Frontend**: Next.js 15, React 19, TypeScript, Tiptap 3, SCSS
- **AI/ML**: Google Gemini (LLM), LangChain, Local Embeddings (Transformers.js)
- **Vector Database**: ChromaDB (for semantic search)
- **Authentication**: NextAuth with Google OAuth
- **Database**: MongoDB (user data, lessons, chat history)
- **File Storage**: AWS S3 with content-based deduplication (SHA-256)
- **Document Processing**: PDF.js, Mammoth (DOCX), Tesseract.js (OCR)

## ✨ Key Features

### 1. AI Lesson Generation

Ask the AI to create structured lessons on any STEM topic:

```
User: "Teach me about logarithmic functions"
AI: Generates a complete lesson with:
  - Explanatory text sections
  - Interactive quizzes with multiple choice
  - Mathematical graphs with adjustable parameters
  - Practice simulations
```

The AI returns a JSON blueprint that's automatically rendered in the editor with custom Tiptap nodes.

### 2. Document Intelligence (RAG)

**Single Source of Truth Principle**: Uploaded documents are treated as the authoritative source.

- Upload PDFs, DOCX, TXT, or Markdown files
- Documents are automatically:
  - Text extracted (with OCR fallback for scanned PDFs)
  - Chunked into semantic segments (1000 chars, 200 overlap)
  - Embedded using local transformer models (runs offline!)
  - Stored in ChromaDB vector database (per-user collections)
- Ask questions and get answers based ONLY on your documents
- Request summaries that are displayed directly in the editor
- Semantic search retrieves relevant context (top-k chunks)

**Example Workflow**:
```
1. Upload: "biology_textbook_chapter3.pdf"
2. Ask: "Summarize the section on cellular respiration"
3. AI: Extracts relevant sections, generates comprehensive Markdown summary
4. Result: Summary appears in the editor canvas, formatted and ready to edit
```

### 3. File Management (S3 SSOT)

**Content-Addressable Storage**:
- Files are deduplicated by SHA-256 hash
- Same file uploaded by different users = stored once
- Presigned URLs for secure direct browser uploads
- Automatic text extraction for AI context
- Supports: Images, PDFs, DOCX, TXT, MD, CSV, JSON (up to 50MB)

### 4. Interactive Components

**Graph Node**: Render mathematical functions with interactive parameters
```json
{
  "type": "graph",
  "expression": "y = a * sin(b * x)",
  "params": [
    { "name": "a", "default": 1, "min": 0, "max": 5 },
    { "name": "b", "default": 1, "min": 0, "max": 3 }
  ]
}
```

**Quiz Node**: Multiple-choice questions with answer validation
```json
{
  "type": "quiz",
  "question": "What is the derivative of x²?",
  "options": ["x", "2x", "x³"],
  "answer": "2x"
}
```

### 5. Authentication & Persistence

- Google OAuth sign-in via NextAuth
- User-specific data isolation
- MongoDB collections:
  - `lessons`: Saved lesson blueprints
  - `chats`: Conversation history
  - `user_files`: File metadata and links
  - `file_blobs`: Deduplicated file storage references
- Chat history with search, rename, and delete

### 6. Advanced PDF Processing

- Multi-strategy text extraction:
  1. `pdf-parse` (fast, basic)
  2. `pdfjs-dist` (accurate, preserves layout)
  3. Tesseract.js OCR (fallback for scanned documents)
- Table detection and extraction (column-aligned heuristics)
- Export tables as CSV or HTML
- Text cleaning and normalization

## 🚀 Getting Started

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18+ and npm
- MongoDB database (local or Atlas)
- Google Cloud account (for OAuth and Gemini API)
- AWS account (for S3 file storage)
- Docker (optional, for ChromaDB)

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create `.env.local` in the project root:

```bash
# ============================================
# AUTHENTICATION (NextAuth + Google OAuth)
# ============================================
AUTH_SECRET=your_long_random_string_here
# Generate with: openssl rand -base64 32

# Google OAuth Credentials
# Get from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ============================================
# DATABASE (MongoDB)
# ============================================
MONGODB_URI=mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
# Optional: specify database name (defaults to tiptap_app)
# MONGODB_DB=sonney_notes

# ============================================
# AI / LLM (Google Gemini)
# ============================================
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
# Get free key from: https://makersuite.google.com/app/apikey

# Optional: override default model
# GEMINI_MODEL_NAME=gemini-1.5-pro

# ============================================
# FILE STORAGE (AWS S3)
# ============================================
AWS_REGION_NAME=us-east-1
S3_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY_ID_SECRET=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# ============================================
# RAG / VECTOR STORE (ChromaDB)
# ============================================
# Optional: defaults to http://localhost:8000
CHROMA_URL=http://localhost:8000

# ============================================
# EMBEDDINGS (Local - FREE!)
# ============================================
# Uses Transformers.js - runs locally, no API key needed
# Optional: HuggingFace API for cloud embeddings
# HUGGINGFACE_API_KEY=your_hf_key_here

# ============================================
# DEBUGGING (Optional)
# ============================================
# DEBUG_SSOT=1  # Enable document processing debug logs
```

### 3. Start ChromaDB (for RAG features)

**Option A: Using npm script (recommended)**
```bash
npm run chroma:start
```

**Option B: Using Docker directly**
```bash
docker run -p 8000:8000 chromadb/chroma
```

**Option C: Skip RAG** - The app works without ChromaDB, but document Q&A features will be disabled.

### 4. Configure AWS S3

Add CORS configuration to your S3 bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3000
  }
]
```

Ensure IAM permissions for `s3:PutObject` and `s3:GetObject`.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Sign In

Click the user menu (top-right) and sign in with Google to enable:
- AI chat functionality
- Lesson saving
- File uploads
- Chat history

## 📚 Usage Guide

### Creating a Lesson

1. **Sign in** with Google (top-right menu)
2. In the chat panel, type: `"Teach me about quadratic equations"`
3. AI generates a structured lesson with text, quizzes, and graphs
4. Lesson appears in the left editor panel
5. Edit, format, and customize as needed
6. Lesson is automatically saved to your account

### Analyzing Documents

1. **Upload a document**: Click the paperclip icon in chat input
2. Select PDF, DOCX, TXT, or MD file (up to 50MB)
3. Wait for "Document indexed" confirmation
4. **Ask questions**: `"What are the main topics in this document?"`
5. **Get summaries**: `"Summarize chapter 3"` or `"Give me an overview"`
6. AI answers using ONLY your document content (Single Source of Truth)

### Working with Chat History

- Click **"history"** button to view past conversations
- Click any chat to reload it (and its lesson, if applicable)
- **Rename**: Click "rename" to give chats descriptive titles
- **Delete**: Remove unwanted conversations
- **New**: Start fresh conversation (clears editor)

### Editor Features

- **Formatting**: Bold, italic, underline, strikethrough, code
- **Headings**: H1-H6 via dropdown
- **Lists**: Bullet, numbered, task lists
- **Blocks**: Blockquotes, code blocks, horizontal rules
- **Alignment**: Left, center, right, justify
- **Colors**: Text and highlight colors
- **Links**: Add/edit hyperlinks
- **Images**: Upload and embed
- **Math**: Superscript, subscript
- **Interactive**: Graphs and quizzes (AI-generated)

## 💻 Development

### Project Structure

```
sonney-notes/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # NextAuth handlers
│   │   ├── chat/         # AI chat endpoint
│   │   ├── chats/        # Chat history CRUD
│   │   ├── files/        # File upload/download
│   │   ├── lessons/      # Lesson storage
│   │   └── rag/          # RAG endpoints
│   ├── page.tsx          # Main app (dual-panel layout)
│   └── layout.tsx        # Root layout with auth provider
├── components/
│   ├── auth/             # Auth UI (UserMenu, Providers)
│   ├── chat/             # ChatPanel component
│   ├── layout/           # ResizableSplit layout
│   ├── tiptap-node/      # Custom Tiptap nodes
│   │   ├── graph-node/   # Interactive math graphs
│   │   ├── quiz-node/    # Multiple choice quizzes
│   │   └── ...           # Other nodes
│   ├── tiptap-ui/        # Editor toolbar components
│   └── tiptap-templates/ # Editor templates
├── lib/
│   ├── auth.ts           # NextAuth configuration
│   ├── mongodb.ts        # MongoDB client
│   ├── s3.ts             # AWS S3 utilities
│   ├── lesson-mapper.ts  # Blueprint → Tiptap JSON
│   ├── rag-service.ts    # RAG orchestration
│   ├── rag-embeddings.ts # Local embeddings
│   ├── rag-vector-store.ts # ChromaDB interface
│   ├── rag-document-processor.ts # Document chunking
│   ├── pdf-extract.ts    # PDF text extraction
│   ├── pdf-clean.ts      # Text normalization
│   └── pdf-segment.ts    # Smart chunking
├── docs/               # Detailed documentation
├── test/               # Test suites
└── scripts/            # Utility scripts
```

### Key Files

- **`app/page.tsx`**: Main application with ResizableSplit layout
- **`components/chat/ChatPanel.tsx`**: AI chat interface with file uploads
- **`app/api/chat/route.ts`**: Core AI endpoint (RAG + Gemini)
- **`lib/lesson-mapper.ts`**: Converts AI blueprints to Tiptap JSON
- **`lib/rag-service.ts`**: RAG orchestration (retrieval + generation)
- **`components/tiptap-templates/simple/simple-editor.tsx`**: Tiptap editor setup

### Running Tests

```bash
# PDF extraction tests
npm run test:extract

# Table extraction tests
npm run test:tables
```

### Build for Production

```bash
npm run build
npm start
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local`
4. Deploy

**Note**: ChromaDB must be hosted separately (e.g., on a VPS or cloud instance).

### Environment Variables for Production

Ensure all variables are set in your deployment platform:
- Update `AllowedOrigins` in S3 CORS to include production domain
- Set `CHROMA_URL` to your hosted ChromaDB instance
- Use strong `AUTH_SECRET` (generate new one for production)

## 📚 Learn More

### Next.js Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
- [Next.js GitHub](https://github.com/vercel/next.js)

### Tiptap Resources

- [Tiptap Documentation](https://tiptap.dev)
- [Tiptap Examples](https://tiptap.dev/examples)

### AI/ML Resources

- [Google Gemini API](https://ai.google.dev)
- [LangChain Documentation](https://js.langchain.com)
- [ChromaDB Documentation](https://docs.trychroma.com)

## 🧠 RAG (Retrieval-Augmented Generation) Deep Dive

The RAG system enables intelligent document analysis by combining semantic search with AI generation.

### Architecture

```
User uploads PDF → Text Extraction → Chunking → Embedding → ChromaDB
                                                              ↓
User asks question → Embed query → Semantic search → Top-k chunks
                                                              ↓
                    Gemini AI ← Context + Question ← Retrieved chunks
                         ↓
                    Answer (based ONLY on documents)
```

### Document Processing Pipeline

1. **Text Extraction** (`lib/pdf-extract.ts`)
   - PDF: `pdf-parse` → `pdfjs-dist` → Tesseract OCR (fallback)
   - DOCX: Mammoth library
   - TXT/MD: Direct read
   - CSV/JSON: Parsed and formatted

2. **Chunking** (`lib/pdf-segment.ts`)
   - Semantic segmentation (respects paragraphs, sentences)
   - 1000 characters per chunk
   - 200 character overlap (preserves context)
   - Metadata: source file, page numbers, timestamps

3. **Embedding** (`lib/rag-embeddings.ts`)
   - **Local embeddings** using Transformers.js (Xenova)
   - Model: `Xenova/all-MiniLM-L6-v2` (384 dimensions)
   - Runs entirely in Node.js - no API calls!
   - Fallback: HuggingFace API (optional)

4. **Storage** (`lib/rag-vector-store.ts`)
   - ChromaDB vector database
   - Per-user collections (isolated data)
   - Cosine similarity search
   - Metadata filtering

5. **Retrieval** (`lib/rag-service.ts`)
   - Query embedding (same model as documents)
   - Top-k similarity search (default k=10-15)
   - Score thresholding
   - Context formatting

6. **Generation**
   - LangChain orchestration
   - Gemini 1.5 Pro (low temperature for accuracy)
   - Strict prompt: "Answer using ONLY the provided context"
   - Source attribution

### Single Source of Truth (SSOT)

The RAG system enforces document fidelity:

- ❌ **No external knowledge**: AI cannot use training data
- ✅ **Document-only answers**: All responses cite uploaded files
- ✅ **Explicit gaps**: If info isn't in docs, AI says so
- ✅ **Comprehensive extraction**: Summaries include ALL key details

### RAG vs. Standard Chat

The system intelligently routes queries:

| Scenario | Mode | Behavior |
|----------|------|----------|
| Document uploaded + question | RAG | Search docs, answer from context |
| "Summarize this PDF" | RAG | Extract all content, format for editor |
| General question (no docs) | Standard | Use Gemini's knowledge |
| "Teach me calculus" | Standard | Generate lesson blueprint |

### Performance

- **Embedding speed**: ~50-100 chunks/second (local)
- **Search latency**: <100ms for 1000+ chunks
- **Accuracy**: High precision with 15-chunk retrieval
- **Offline capable**: Embeddings work without internet

### Troubleshooting

See detailed guides:
- [docs/rag-quick-start.md](docs/rag-quick-start.md) - 5-minute setup
- [docs/rag-setup.md](docs/rag-setup.md) - Complete configuration
- [docs/RAG-COMPLETE-GUIDE.md](docs/RAG-COMPLETE-GUIDE.md) - Technical deep dive
- [docs/TROUBLESHOOTING-429-ERROR.md](docs/TROUBLESHOOTING-429-ERROR.md) - API issues
- [docs/FREE-EMBEDDINGS.md](docs/FREE-EMBEDDINGS.md) - Local embedding setup

## Gemini LLM Integration

This project includes a chat panel (`components/chat/ChatPanel.tsx`) wired to an API route (`app/api/chat/route.ts`) that calls Google's Gemini model using `@google/generative-ai`.

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` at the project root and add your Google API key:

   ```bash
   GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
   # Optional: override the default model
   # GEMINI_MODEL_NAME=gemini-1.5-pro
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

### How it works

- The chat UI posts the full message history to `POST /api/chat`.
- The API route maps roles to Gemini's expected roles and sends the last user message as the prompt within a chat session.
- Responses are returned as `{ role: "assistant", content: string }` and appended to the UI.

### Files

- `components/chat/ChatPanel.tsx` – chat UI, input handling, loading and error states.
- `app/api/chat/route.ts` – server route calling Gemini with `@google/generative-ai`.

## Authentication (NextAuth) + MongoDB

This project integrates Auth.js (NextAuth) with Google Sign-In and MongoDB for persisting user lessons and chat history.

### New Files

- `lib/auth.ts` – NextAuth configuration with Google provider and MongoDB Adapter
- `app/api/auth/[...nextauth]/route.ts` – NextAuth route handlers (GET/POST)
- `lib/mongodb.ts` – MongoDB client (cached for HMR)
- `components/auth/Providers.tsx` – Client `SessionProvider`
- `components/auth/UserMenu.tsx` – Simple Sign in/out UI
- `types/next-auth.d.ts` – Augments `Session.user` with `id`

### Environment Variables

Create `.env.local` with the following values:

```
# Auth.js (NextAuth)
AUTH_SECRET=your_long_random_string
# NEXTAUTH_URL is recommended in some deploy contexts, e.g. Vercel
# NEXTAUTH_URL=http://localhost:3000

# Google OAuth (create credentials at https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
# Optional DB name (defaults to tiptap_app)
# MONGODB_DB=tiptap_app

# Gemini (for answer generation)
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
# Optional
# GEMINI_MODEL_NAME=gemini-1.5-pro

# HuggingFace (for embeddings - COMPLETELY FREE!)
# HUGGINGFACE_API_KEY=your_hf_key_here  # Optional - uses free demo key by default

# RAG / Vector Store (optional - for document Q&A)
# CHROMA_URL=http://localhost:8000
```

## File Attachments (AWS S3 SSOT)

This project includes a comprehensive file attachment system that uses AWS S3 as a Single Source of Truth (SSOT) based on the file content hash (SHA-256). Files are stored under a deterministic key derived from their content hash to eliminate duplicates across users. Users link to the shared blob via metadata in MongoDB.

### Features

- **Single Source of Truth**: Files are deduplicated by content hash - same file uploaded by different users only stored once
- **Text Extraction**: Automatic text extraction for common formats (txt, md, csv, json) to enhance AI understanding
- **Security**: Client and server-side validation, file type and size restrictions
- **Error Handling**: Comprehensive error messages and user feedback
- **LLM Integration**: Attached files are automatically included in chat context with extracted text content

### API Routes

- `POST /api/files/presign`
  - Request: `{ filename, contentType, size, sha256Hex }`
  - Response: `{ alreadyExists: boolean, uploadUrl?, key, bucket, region }`
  - Behavior: If a blob with the same `sha256Hex` exists, returns `alreadyExists: true` and skips uploading. Otherwise, returns a presigned `PUT` URL for direct S3 upload.

- `POST /api/files/confirm`
  - Request: `{ filename, contentType, size, sha256Hex, key }`
  - Response: `{ linked: true, file: {...} }`
  - Behavior: Upserts the blob record in `file_blobs` and idempotently creates a link in `user_files` for the current user.

- `GET /api/files`
  - Lists the current user's files from `user_files`.

- `GET /api/files/get-url?key=<s3Key>`
  - Returns a presigned GET URL for downloading/viewing the file.

### MongoDB Collections

- `file_blobs` (SSOT)
  - `hash: string` (SHA-256 hex)
  - `objectKey: string` (S3 key, e.g., `ssot/<sha256>`)
  - `size: number`
  - `contentType: string`
  - `createdAt: Date`

- `user_files`
  - `userId: string`
  - `filename: string`
  - `hash: string`
  - `objectKey: string`
  - `size: number`
  - `contentType: string`
  - `createdAt: Date`

### Environment Variables (add to `.env.local`)

```
# AWS S3
AWS_REGION_NAME=us-east-1
S3_BUCKET_NAME=your-bucket-name

# Ensure your server has AWS credentials for presigning
AWS_ACCESS_KEY_ID_SECRET=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### S3 Bucket Configuration

1. **CORS Configuration**: Add to your S3 bucket to allow browser uploads via presigned URLs:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type", "Content-Disposition"],
    "MaxAgeSeconds": 3000
  }
]
```

2. **Bucket Policy**: Ensure your server has `s3:PutObject` and `s3:GetObject` permissions on the bucket.

### File Support

**Supported file types**: Images, text files, documents, audio, video (up to 50MB)
**Text extraction**: Automatic for `.txt`, `.md`, `.csv`, `.json` files (up to 10MB)
**Deduplication**: All file types are deduplicated by content hash

### Usage in UI

The file uploader is integrated into the chat panel:

```tsx
// Files are attached via the paperclip button in the chat input
// Extracted text content is automatically included in LLM context
```
## PDF Extraction utilities

This repo contains server-side utilities for extracting text and simple tables from PDFs located in `lib/pdf-extract.ts` and text cleaning in `lib/pdf-clean.ts`.

Quick notes:
- `extractTextFromPdfBuffer(buffer)` - returns cleaned text, tries `pdf-parse` then `pdfjs` and finally an OCR fallback (if optional deps like `canvas` and `tesseract.js` are installed).
- `extractTablesFromPdfBuffer(buffer)` - conservative column-aligned table heuristic using pdfjs text positions.
- `tablesToCsv(pages)` and `tablesToHtml(pages)` - helpers to convert extracted table objects to CSV/HTML strings.

Running the small test suite added for these utilities:

```bash
npm run test:extract
```

If you don't have the optional OCR dependencies installed, OCR fallback will be skipped. For high-quality OCR consider using a cloud OCR provider (Google Vision, AWS Textract) and wire it into the OCR path in `lib/pdf-extract.ts`.

### Security Features

- **File validation**: Type and size validation on both client and server
- **Hash validation**: SHA-256 hash verification
- **Access control**: Files are private and accessed via presigned URLs
- **Rate limiting**: Built into Next.js API routes

### Error Handling

The system provides detailed error messages for:
- File too large (>50MB)
- Unsupported file types
- Invalid file hashes
- Upload failures
- Network errors

All errors are displayed to users with clear, actionable messages.
```

### Install Dependencies

```
npm install next-auth @auth/mongodb-adapter mongodb
```

### Usage Notes

- The chat API `POST /api/chat` now requires an authenticated user session.
- Use the header user menu to sign in with Google before chatting.
- When a lesson blueprint is generated, it is stored in the `lessons` collection, and the chat exchange is stored in `chats`.
- Plain assistant responses are also stored in `chats`.

### Collections (basic shape)

- `lessons`
  - `userId: string`
  - `blueprint: { title?: string; sections: ... }`
  - `createdAt: Date`
- `chats`
  - `userId: string`
  - `type: "blueprint" | "text"`
  - `lessonId?: ObjectId` (when type is `blueprint`)
  - `messages: Array<{ role: "user" | "assistant"; content: string }>`
  - `chat?: string` (assistant summary for blueprint)
  - `content?: string` (plain assistant message)
  - `createdAt: Date`

