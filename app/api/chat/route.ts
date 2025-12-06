import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { presignGetUrl } from "@/lib/gcs";
import { getAuthSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import type { LessonBlueprint } from "@/lib/lesson-mapper";
import { answerQuestionWithRAG, shouldUseRAG } from "@/lib/rag-service";
import { isChromaAvailable } from "@/lib/rag-vector-store";
import { processDocumentForRAG } from "@/lib/rag-document-processor";
import { addDocumentsToVectorStore } from "@/lib/rag-vector-store";

// Ensure you set GOOGLE_GENERATIVE_AI_API_KEY in your environment
// For local dev: create a .env.local with: GOOGLE_GENERATIVE_AI_API_KEY=your_key_here

const MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-1.5-pro";

// Instruction to prefer structured JSON blueprints for lessons and Markdown for general answers
const systemInstruction = `
you are an assistant embedded in a lesson builder app.

IMPORTANT CONTEXT:
- This app has TWO panels: a CHAT PANEL (where we're talking) and a CANVAS/EDITOR (a Tiptap editor for displaying content)
- When users say "canvas", "canva", or "editor", they are referring to the Tiptap editor in THIS app, NOT the external Canva.com website
- You DO have the ability to display content on the canvas/editor - never say you cannot access it
- The canvas/editor is part of this application and is where lessons and document content are displayed

DECISION LOGIC - READ CAREFULLY:

1. **LESSON BLUEPRINT**: If the user explicitly asks to "create a lesson", "generate a lesson", "make a quiz", or "teach me about [x]" with interactive elements like quizzes, graphs, or simulations.
   -> Output: JSON only (as defined below).

2. **EDITOR CONTENT**: If the user asks to "start the lesson", "explain this document", "summarize", "show me the notes", or asks a complex question requiring a long explanation from the document.
   -> Output: Start with "EDITOR_CONTENT:" followed by Markdown.

3. **CHAT ANSWER**: For short clarifications, greetings, or questions about how to use the app.
   -> Output: Plain Markdown.

LESSON GENERATION (JSON BLUEPRINT):
Respond with ONLY a JSON blueprint. No backticks.
Schema:
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

SUMMARIES AND DOCUMENT CONTENT (EDITOR_CONTENT):
If the user wants to see content on the canvas/editor (e.g., "put this on the canvas", "summarize", "explain fully"):
1. Start response with "EDITOR_CONTENT:"
2. Follow with comprehensive Markdown.
3. Use headers (#, ##), bold (**), and lists.
4. If using a document, EXTRACT information faithfully.

SINGLE SOURCE OF TRUTH PRINCIPLE:
- Uploaded documents are the SINGLE SOURCE OF TRUTH.
- Do not create facts not present in the document.
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
    const prompt = last?.content ?? "";
    const userQuestion = prompt;

    // ========================================
    // RAG-FIRST APPROACH FOR DOCUMENT QUERIES
    // ========================================

    // Step 1: Check if Chroma vector store is available
    const chromaAvailable = await isChromaAvailable();
    let documentIndexed = false;

    // Step 2: Download and index any attached documents
    if (chromaAvailable && atts.length > 0) {
      console.log(`Processing ${atts.length} attachment(s) for RAG indexing...`);

      for (const att of atts) {
        const contentType = typeof att?.contentType === "string" ? att.contentType : "";
        const filename = typeof att?.filename === "string" ? att.filename : "";
        const objectKey = typeof att?.objectKey === "string" ? att.objectKey : "";

        // Check if it's a supported document type
        const isDocument =
          contentType.includes("pdf") ||
          contentType.includes("wordprocessingml") || // DOCX
          contentType.includes("msword") || // DOC
          filename.endsWith(".pdf") ||
          filename.endsWith(".docx") ||
          filename.endsWith(".doc") ||
          filename.endsWith(".txt") ||
          filename.endsWith(".md");

        if (isDocument && objectKey) {
          try {
            // Download document from S3
            const url = await presignGetUrl({ key: objectKey });
            const response = await fetch(url);

            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);

              // Process and index the document using RAG
              console.log(`Indexing ${filename} (${contentType})...`);
              const processed = await processDocumentForRAG(buffer, filename);

              if (processed.chunks.length > 0) {
                await addDocumentsToVectorStore(
                  userId,
                  processed.chunks,
                  {
                    objectKey,
                    filename,
                    contentType,
                    uploadedAt: new Date().toISOString(),
                  }
                );
                console.log(`✓ Successfully indexed ${processed.chunks.length} chunks from ${filename}`);
                documentIndexed = true;
              } else {
                console.warn(`No chunks extracted from ${filename}`);
              }
            } else {
              console.warn(`Failed to download ${filename}: ${response.status}`);
            }
          } catch (indexErr) {
            console.error(`Failed to index ${filename}:`, indexErr);
            // Non-fatal - continue with other documents
          }
        }
      }
    }

    // Step 3: Use RAG to answer the question if we have documents or if it seems document-related
    const shouldTryRAG = chromaAvailable && (documentIndexed || shouldUseRAG(userQuestion));

    if (shouldTryRAG) {
      try {
        console.log(`Using RAG to answer: "${userQuestion.substring(0, 100)}..."`);

        // Query with RAG
        const ragResult = await answerQuestionWithRAG(userId, userQuestion, {
          k: 15, // Retrieve more chunks for comprehensive and detailed answers/summaries
          includeScores: true,
        });

        // If we found relevant sources, use the RAG answer
        if (ragResult.sources.length > 0) {
          const ragAnswer = ragResult.answer;

          // Check if RAG response is meant for the editor
          if (ragAnswer.trim().startsWith("EDITOR_CONTENT:")) {
            const editorContent = ragAnswer.replace(/^EDITOR_CONTENT:\s*/i, "").trim();
            const sourceInfo = `\n\n📚 *Based on ${ragResult.sources.length} section(s) from your uploaded document(s)*`;
            const fullContent = editorContent + sourceInfo;

            console.log(`✓ RAG answered successfully using ${ragResult.sources.length} sources (EDITOR mode)`);

            // Persist RAG-based editor content chat
            try {
              const db = await getDb();
              const chats = db.collection("chats");
              await chats.insertOne({
                userId,
                type: "editor",
                messages,
                attachments: atts.map(a => ({
                  filename: a.filename,
                  contentType: a.contentType,
                  objectKey: a.objectKey,
                })),
                content: fullContent,
                ragUsed: true,
                sourceCount: ragResult.sources.length,
                createdAt: new Date(),
              });
            } catch (persistErr) {
              console.error("Failed to persist RAG editor content chat:", persistErr);
            }

            return new Response(
              JSON.stringify({
                type: "editor",
                content: fullContent,
                chat: `Content has been added to the editor based on ${ragResult.sources.length} section(s) from your document(s).`,
                ragUsed: true,
                sourceCount: ragResult.sources.length,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          // Regular RAG answer for chat panel
          const sourceInfo = `\n\n📚 *Based on ${ragResult.sources.length} section(s) from your uploaded document(s)*`;
          const fullAnswer = ragAnswer + sourceInfo;

          console.log(`✓ RAG answered successfully using ${ragResult.sources.length} sources`);

          // Persist RAG-based chat
          try {
            const db = await getDb();
            const chats = db.collection("chats");
            await chats.insertOne({
              userId,
              type: "text",
              messages: [...messages, { role: "assistant", content: fullAnswer }],
              attachments: atts.map(a => ({
                filename: a.filename,
                contentType: a.contentType,
                objectKey: a.objectKey,
              })),
              content: fullAnswer,
              ragUsed: true,
              sourceCount: ragResult.sources.length,
              createdAt: new Date(),
            });
          } catch (persistErr) {
            console.error("Failed to persist RAG chat:", persistErr);
          }

          return new Response(
            JSON.stringify({
              role: "assistant",
              content: fullAnswer,
              ragUsed: true,
              sourceCount: ragResult.sources.length,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } else {
          console.log("RAG found no relevant sources, falling back to standard Gemini");
          // If documents were just uploaded/indexed but RAG found nothing, warn the user
          if (documentIndexed) {
            return new Response(
              JSON.stringify({
                role: "assistant",
                content: "⚠️ I couldn't find relevant information in your uploaded document(s) to answer this question. The document may not contain this information, or it may need to be rephrased. Please try:\n\n1. Asking about content that's actually in the document\n2. Using different keywords\n3. Being more specific about what section or topic you're interested in\n\nWhat would you like to know about your document?",
                ragUsed: true,
                sourceCount: 0,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
        }
      } catch (ragErr) {
        console.error('RAG query failed:', ragErr);
        // Fall through to standard Gemini
      }
    }

    // ========================================
    // FALLBACK: Standard Gemini (no RAG)
    // ========================================
    console.log("Using standard Gemini (RAG not used or unavailable)");

    // Warn if documents were uploaded but we're not using RAG
    if (atts.length > 0 && !chromaAvailable) {
      console.warn("Documents uploaded but Chroma is not available - cannot use as single source of truth");
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
      } catch { }
    }

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const text = response.text();

    // Check if response is meant for the editor (summaries, document content, etc.)
    if (text.trim().startsWith("EDITOR_CONTENT:")) {
      const editorContent = text.replace(/^EDITOR_CONTENT:\s*/i, "").trim();

      // Persist editor content chat
      try {
        const db = await getDb();
        const chats = db.collection("chats");
        await chats.insertOne({
          userId,
          type: "editor",
          messages,
          attachments: atts,
          content: editorContent,
          createdAt: new Date(),
        });
      } catch (persistErr) {
        console.error("Failed to persist editor content chat:", persistErr);
      }

      return new Response(
        JSON.stringify({
          type: "editor",
          content: editorContent,
          chat: "Content has been added to the editor."
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

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
                text: `Provide a concise, friendly 1-3 sentence introduction for this lesson for the chat panel. Do not include JSON or code blocks.\n\nTitle: ${blueprint.title ?? "Lesson"
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
