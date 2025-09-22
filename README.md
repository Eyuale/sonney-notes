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
