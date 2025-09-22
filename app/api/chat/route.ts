import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure you set GOOGLE_GENERATIVE_AI_API_KEY in your environment
// For local dev: create a .env.local with: GOOGLE_GENERATIVE_AI_API_KEY=your_key_here

const MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-1.5-pro";

// Optional: a basic response schema to encourage concise markdown answers
const systemInstruction = `
You are an assistant embedded in a lesson builder app. Keep answers concise and helpful.
Use simple markdown for structure. If the user requests content to be added to the lesson,
clearly enumerate the actions as bullet points under a header "Actions".
`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing GOOGLE_GENERATIVE_AI_API_KEY env var." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: expected { messages: Array }" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Shape and split our chat into history (prior turns) and the last user prompt
    type ChatMessage = { id?: string; role: "user" | "assistant"; content: string };
    const msgs = messages as ChatMessage[];
    const last = msgs[msgs.length - 1];
    const prompt = last?.content ?? "";

    // Map only prior messages to Gemini roles
    const history = msgs
      .slice(0, -1)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content ?? "") }],
      }));

    // Ensure history starts with a user role per Gemini requirement
    while (history.length && history[0].role !== "user") history.shift();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction });

    // Start chat with sanitized history and send the last user content as the prompt
    const chat = model.startChat({ history });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const text = response.text();

    return new Response(
      JSON.stringify({ role: "assistant", content: text }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("/api/chat error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
