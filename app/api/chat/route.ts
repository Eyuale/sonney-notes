import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { presignGetUrl } from "@/lib/s3";
import { getAuthSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import type { LessonBlueprint } from "@/lib/lesson-mapper";

// Ensure you set GOOGLE_GENERATIVE_AI_API_KEY in your environment
// For local dev: create a .env.local with: GOOGLE_GENERATIVE_AI_API_KEY=your_key_here

const MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-1.5-pro";

// Instruction to prefer structured JSON blueprints for lessons and Markdown for general answers
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

If the user asks a general question not related to generating a lesson, answer concisely in Markdown.
Prefer the following when appropriate:
- Use headings (#, ##) for sections.
- Use bold (**) for key terms.
- Use unordered/ordered lists for steps or items.
- Use backticked code for inline code and fenced blocks for multi-line code.
- Avoid surrounding the entire answer in a code fence unless it is code.
- Make the lesson very long unless the user asks you to make it shorter
`;

// Minimal server-side blueprint parser (no imports from client libs)
function tryParseJsonBlueprint(text: string): {
  blueprint: { title?: string; sections: unknown[] } | null;
} {
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
    // Require authenticated user
    const session = await getAuthSession();
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userId =
      (session.user as { id?: string }).id || session.user.email || "anonymous";
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing GOOGLE_GENERATIVE_AI_API_KEY env var.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages, attachments } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({
          error: "Invalid payload: expected { messages: Array }",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const atts = Array.isArray(attachments) ? attachments : [];
    // Shape and split our chat into history (prior turns) and the last user prompt
    type ChatMessage = {
      id?: string;
      role: "user" | "assistant";
      content: string;
    };
    const msgs = messages as ChatMessage[];
    const last = msgs[msgs.length - 1];
    let prompt = last?.content ?? "";

    // Detect if the user explicitly asked about a unit/chapter number (e.g. "unit 3" or "chapter 3")
    const unitMatch = String(prompt).match(/\b(?:unit|chapter)\s*(\d{1,3})\b/i);
    const wantedUnit = unitMatch ? Number(unitMatch[1]) : null;

    // Attempt to extract text from PDF attachments if we have an S3 objectKey
    let pdfExtractionEnabled = true;
    let pdfExtractionAttempted = false;
    for (const a of atts) {
      try {
        const contentType = typeof a?.contentType === "string" ? a.contentType : "";
        const hasText = typeof a?.textContent === "string" && a.textContent.length > 0;
        if (!hasText && contentType.includes("pdf") && typeof a?.objectKey === "string" && a.objectKey.length > 0) {
          // If extraction has been disabled previously, skip
          if (!pdfExtractionEnabled) continue;
          // Mark that we attempted extraction during this run
          pdfExtractionAttempted = true;
          try {
            const url = await presignGetUrl({ key: a.objectKey });
            const res = await fetch(url);
            if (res.ok) {
                const arrayBuffer = await res.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                // keep buffer on attachment for potential SSOT building later
                try {
                  a._buffer = buffer;
                } catch {}
                try {
                  const { extractTextFromPdfBuffer } = await import('@/lib/pdf-extract');
                  const text = await extractTextFromPdfBuffer(buffer as Buffer);
                  if (text && text.length > 0) {
                    a.textContent = text.length > 1000 ? text.slice(0, 1000) + '...' : text;
                  }
                } catch {
                  console.warn('PDF extraction helper failed; disabling PDF extraction for this server run.');
                  pdfExtractionEnabled = false;
                }
            }
          } catch (e) {
            console.warn('PDF extraction failed for', a.filename, e);
            // Non-fatal: continue without textContent
          }
        }
      } catch {
        // ignore per-file extraction errors
      }
    }

  // If there are attachments, append a brief, structured summary so the LLM knows context.
    if (atts.length) {
      const lines = atts.slice(0, 10).map((a, i: number) => {
        const name = typeof a?.filename === "string" ? a.filename : `file_${i + 1}`;
        const type = typeof a?.contentType === "string" ? a.contentType : "unknown";
        const size = typeof a?.size === "number" ? a.size : undefined;
        const key = typeof a?.objectKey === "string" ? a.objectKey : "";
        const textContent = typeof a?.textContent === "string" ? a.textContent : null;

        let line = `- ${name} (${type}${size ? ", " + size + " bytes" : ""}) key=${key}`;
        if (textContent && textContent.length > 0) {
          const preview = textContent.length > 500 ? textContent.substring(0, 500) + "..." : textContent;
          line += `\n  Content: ${preview}`;
        }
        return line;
      });
      let extractionNote = '';
      if (!pdfExtractionEnabled && atts.some((x) => typeof x?.contentType === 'string' && x.contentType.includes('pdf'))) {
        extractionNote = '\n\nNote: PDF text extraction is currently disabled on the server (parser import failed). I attempted extraction but was unable to run the parser; attach a plain-text version or retry later.';
      } else if (pdfExtractionAttempted) {
        extractionNote = '\n\nNote: I attempted to extract text from attached PDFs and included previews where available.';
      }

      const attachmentNote = `\n\n[Attachments]\nThe user attached ${atts.length} file(s). ${extractionNote} Use the provided content when relevant.\n${lines.join("\n")}`;
      prompt += attachmentNote;
      // Optional debug: print attachments and prompt preview when DEBUG_SSOT is enabled
      if (process.env.DEBUG_SSOT === '1' || process.env.DEBUG_SSOT === 'true') {
        try {
          console.log('DEBUG_SSOT: attachments preview:');
          for (const a of atts) {
            console.log('- file:', a.filename || '<unknown>', 'type:', a.contentType || '<unknown>');
            if (a.textContent) console.log('  textPreview:', String(a.textContent).slice(0, 1000));
          }
          console.log('DEBUG_SSOT: prompt preview (first 2000 chars):\n', String(prompt).slice(0, 2000));
        } catch {
          // ignore logging errors
        }
      }
    }

    // If the user asked about a specific unit/chapter, try to build a focused unit context
    if (wantedUnit && pdfExtractionEnabled) {
      try {
        if (process.env.DEBUG_SSOT === '1' || process.env.DEBUG_SSOT === 'true') {
          console.log('DEBUG_SSOT: wantedUnit=', wantedUnit, 'pdfExtractionEnabled=', pdfExtractionEnabled);
        }
        for (const a of atts) {
          if (process.env.DEBUG_SSOT === '1' || process.env.DEBUG_SSOT === 'true') {
            console.log('DEBUG_SSOT: attachment has buffer?', Boolean(a && a._buffer), 'filename=', a?.filename);
          }
          if (a && a._buffer) {
            try {
              const { buildUnitContextAndPrompt } = await import('@/lib/ssot');
              const res = await buildUnitContextAndPrompt(a._buffer as Buffer, wantedUnit, { maxChars: 8000 });
              if (process.env.DEBUG_SSOT === '1' || process.env.DEBUG_SSOT === 'true') {
                console.log('DEBUG_SSOT: buildUnitContextAndPrompt returned context length=', res?.context?.length ?? 0);
              }
              if (res && res.context && res.context.length > 50) {
                // Replace prompt with an instructioned prompt that uses the unit context
                const userQuestion = (last && last.content) ? String(last.content) : '';
                prompt = `You are given the following authoritative excerpt from a user's textbook (Unit ${wantedUnit}). Use only this text to answer the user's question.\n\nContext:\n${res.context}\n\nQuestion: ${userQuestion}`;
                break;
              }
            } catch {
              if (process.env.DEBUG_SSOT === '1' || process.env.DEBUG_SSOT === 'true') console.log('DEBUG_SSOT: buildUnitContextAndPrompt failed for', a?.filename);
              // ignore per-attachment ssot failures
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // Map only prior messages to Gemini roles
    const history = msgs.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content ?? "") }],
    }));

    // Ensure history starts with a user role per Gemini requirement
    while (history.length && history[0].role !== "user") history.shift();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction,
    });

    // Start chat with sanitized history and send the last user content as the prompt
    const chat = model.startChat({ history });

    // Debug: print prompt before sending when DEBUG_SSOT is enabled
    if (process.env.DEBUG_SSOT === '1' || process.env.DEBUG_SSOT === 'true') {
      try {
        console.log('DEBUG_SSOT: sending prompt length=', String(prompt).length);
        console.log('DEBUG_SSOT: prompt snippet:\n', String(prompt).slice(0, 4000));
  } catch {}
    }

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
                text: `Provide a concise, friendly 1-3 sentence introduction for this lesson for the chat panel. Do not include JSON or code blocks.\n\nTitle: ${
                  blueprint.title ?? "Lesson"
                }`,
              },
            ],
          },
        ],
      });
      const briefText = brief.response.text();

      // Persist lesson and chat record
      try {
        const db = await getDb();
        const lessons = db.collection("lessons");
        const chats = db.collection("chats");
        const lessonDoc = {
          userId,
          blueprint: blueprint as LessonBlueprint,
          createdAt: new Date(),
        };
        const lessonResult = await lessons.insertOne(lessonDoc);
        await chats.insertOne({
          userId,
          type: "blueprint",
          lessonId: lessonResult.insertedId,
          messages,
          attachments: atts,
          chat: briefText,
          createdAt: new Date(),
        });
      } catch (persistErr) {
        console.error("Failed to persist lesson/chat:", persistErr);
      }

      return new Response(
        JSON.stringify({ type: "blueprint", blueprint, chat: briefText }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Fallback: normal assistant message
    // Persist plain assistant message chat
    try {
      const db = await getDb();
      const chats = db.collection("chats");
      await chats.insertOne({
        userId,
        type: "text",
        messages,
        attachments: atts,
        content: text,
        createdAt: new Date(),
      });
    } catch (persistErr) {
      console.error("Failed to persist chat:", persistErr);
    }

    return new Response(JSON.stringify({ role: "assistant", content: text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("/api/chat error", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
