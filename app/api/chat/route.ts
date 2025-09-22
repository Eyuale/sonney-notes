import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure you set GOOGLE_GENERATIVE_AI_API_KEY in your environment
// For local dev: create a .env.local with: GOOGLE_GENERATIVE_AI_API_KEY=your_key_here

const MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-1.5-pro";

// Instruction to prefer structured JSON blueprints for lessons
const systemInstruction = `
You are an assistant embedded in a lesson builder app.

If the user asks to teach, generate, or create a lesson, respond with ONLY a JSON blueprint.
Do not include any backticks, markdown fences, or commentary. Output raw JSON only.
Use this schema:

{
  "title": string,
  "sections": [
    { "type": "text", "content": string } |
    { "type": "quiz", "question": string, "options": string[], "answer"?: string } |
    {
      "type": "graph",
      "expression": string,
      "title"?: string,
      "xLabel"?: string,
      "yLabel"?: string,
      "domain"?: { "xMin": number, "xMax": number },
      "samples"?: number,
      "params"?: Array<{ "name": string, "default": number, "min": number, "max": number }>,
      "color"?: string
    } |
    { "type": "simulation", "content": string }
  ]
}

Example of valid output (no extra text before or after):
{
  "title": "Logarithmic Functions",
  "sections": [
    { "type": "text", "content": "A logarithm answers the question..." },
    { "type": "quiz", "question": "What is log_10(100)?", "options": ["1", "2", "10"], "answer": "2" },
    { "type": "graph", "expression": "y = log(x)", "title": "y = log(x)", "xLabel": "x", "yLabel": "y", "domain": { "xMin": 0.1, "xMax": 10 }, "samples": 200, "params": [{ "name": "a", "default": 1, "min": 0.5, "max": 2 }], "color": "#4f46e5" },
    { "type": "simulation", "content": "interactive-slider" }
  ]
}

If the user asks a general question not related to generating a lesson, answer concisely in plain text.
`;

// Minimal server-side blueprint parser (no imports from client libs)
function tryParseJsonBlueprint(text: string): { blueprint: { title?: string; sections: unknown[] } | null } {
  if (!text) return { blueprint: null };
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\n([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  try {
    const parsed: unknown = JSON.parse(candidate);
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { sections?: unknown[] }).sections)
    ) {
      return { blueprint: parsed as { title?: string; sections: unknown[] } };
    }
  } catch {
    // ignore parse errors
  }
  return { blueprint: null };
}

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

    // Attempt to parse a JSON blueprint from the model output
    const { blueprint } = tryParseJsonBlueprint(text);
    if (blueprint) {
      // Make a brief follow-up to get a conversational summary without JSON
      const brief = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Provide a concise, friendly 1-3 sentence introduction for this lesson for the chat panel. Do not include JSON or code blocks.\n\nTitle: ${blueprint.title ?? "Lesson"}`,
              },
            ],
          },
        ],
      });
      const briefText = brief.response.text();

      return new Response(
        JSON.stringify({ type: "blueprint", blueprint, chat: briefText }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fallback: normal assistant message
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
