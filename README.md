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

