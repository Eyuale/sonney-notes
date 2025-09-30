This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

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

# Gemini
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
# Optional
# GEMINI_MODEL_NAME=gemini-1.5-pro

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

