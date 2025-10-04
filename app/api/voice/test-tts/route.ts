import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

/**
 * Test TTS API Route: Simple test for TTS functionality
 * Returns a short test audio file
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

    // Use a simple test text
    const testText = "Hello, this is a test of the text to speech system.";

    // Default voice ID (Rachel - natural sounding female voice)
    const selectedVoiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

    console.log('Testing TTS with:', {
      text: testText,
      voiceId: selectedVoiceId,
      apiKeyLength: apiKey.length
    });

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
          text: testText,
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

    console.log('TTS API response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      console.error("ElevenLabs API error:", error);
      return NextResponse.json(
        { 
          error: `TTS test failed: ${error.detail || response.statusText}`,
          status: response.status,
          details: error
        },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    
    console.log('Audio buffer received:', {
      size: audioBuffer.byteLength,
      type: 'audio/mpeg'
    });

    // Return audio as response
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "no-cache"
      },
    });
  } catch (error) {
    console.error("TTS test error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "TTS test failed",
        details: error
      },
      { status: 500 }
    );
  }
}
