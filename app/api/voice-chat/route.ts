import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthSession } from "@/lib/auth";

/**
 * Optimized API Route for Voice Chat
 * Uses faster model and simplified prompt for real-time conversation
 */

const VOICE_MODEL_NAME = process.env.GEMINI_VOICE_MODEL_NAME || "gemini-2.5-flash"; // Use available model
const VOICE_SYSTEM_INSTRUCTION = `
You are a helpful AI assistant for real-time voice conversation. Keep responses:

- CONCISE: 1-2 sentences maximum
- CONVERSATIONAL: Natural, friendly tone
- DIRECT: Answer the question directly
- QUICK: No lengthy explanations unless specifically requested

TEACHING DETECTION:
If the user asks to "teach", "show me", "explain in detail", "create a lesson", or "generate content", respond with "TEACHING_REQUEST:" followed by a brief acknowledgment.

Examples:
- User: "Teach me about photosynthesis" 
- You: "TEACHING_REQUEST: I'll create a detailed lesson about photosynthesis for you."

- User: "Show me how to solve equations"
- You: "TEACHING_REQUEST: I'll generate a comprehensive lesson on solving equations."

- User: "What is gravity?"
- You: "Gravity is the force that pulls objects toward each other."

For voice chat, prioritize speed over detail. If the user asks for detailed explanations, suggest they ask "Can you explain that in detail?" for a longer response.

Keep it brief and conversational for voice interaction.
`;

export async function POST(req: NextRequest) {
  try {
    // Require authenticated user
    const session = await getAuthSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_GENERATIVE_AI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid payload: expected { messages: Array }" },
        { status: 400 }
      );
    }

    // Use only the last few messages for context (faster processing)
    const recentMessages = messages.slice(-4); // Last 2 exchanges for speed

    // Map messages to Gemini format
    const history = recentMessages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content ?? "") }],
    }));

    // Ensure history starts with a user role
    while (history.length && history[0].role !== "user") history.shift();

    const startTime = Date.now();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: VOICE_MODEL_NAME, // Use available model
      systemInstruction: VOICE_SYSTEM_INSTRUCTION,
      generationConfig: {
        maxOutputTokens: 100, // Shorter responses for speed
        temperature: 0.6, // Slightly more focused
        topP: 0.9, // Focus on most likely tokens
        topK: 20, // Slightly more vocabulary
      },
    });

    // Get the last user message
    const lastMessage = recentMessages[recentMessages.length - 1];
    const prompt = lastMessage?.content ?? "";

    // Start chat with limited history for speed
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const text = response.text();

    // Check if this is a teaching request
    if (text.trim().startsWith("TEACHING_REQUEST:")) {
      const teachingAck = text.replace(/^TEACHING_REQUEST:\s*/i, "").trim();
      
      return NextResponse.json({ 
        role: "assistant", 
        content: teachingAck,
        model: VOICE_MODEL_NAME,
        optimized: true,
        responseTime: Date.now() - startTime,
        teachingRequest: true,
        originalPrompt: prompt
      });
    }

    return NextResponse.json({ 
      role: "assistant", 
      content: text,
      model: VOICE_MODEL_NAME,
      optimized: true,
      responseTime: Date.now() - startTime
    });

  } catch (err: unknown) {
    console.error("/api/voice-chat error", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
