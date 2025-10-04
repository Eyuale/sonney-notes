import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

/**
 * API Route: Text-to-Speech using ElevenLabs
 * Receives text and returns audio data
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

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY not configured" },
        { status: 500 }
      );
    }

    const { text, voiceId } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    // Default voice ID (Rachel - natural sounding female voice)
    const selectedVoiceId = voiceId || process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5", // Fastest model for low latency
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      console.error("ElevenLabs API error:", error);
      return NextResponse.json(
        { error: `TTS failed: ${error.detail || response.statusText}` },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    // Return audio as response
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TTS failed" },
      { status: 500 }
    );
  }
}

