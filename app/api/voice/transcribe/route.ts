import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

/**
 * API Route: Speech-to-Text Transcription
 * Receives audio data and returns transcribed text using OpenAI Whisper
 */
export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const session = await getAuthSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Get audio data from request
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Forward to OpenAI Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append("file", audioFile);
    whisperFormData.append("model", "whisper-1");
    whisperFormData.append("language", "en");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: whisperFormData,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("Whisper API error:", error);
      return NextResponse.json(
        { error: `Transcription failed: ${error.error || response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ text: data.text || "" });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcription failed" },
      { status: 500 }
    );
  }
}

