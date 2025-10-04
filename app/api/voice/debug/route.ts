import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

/**
 * Debug API Route: Check voice chat configuration
 * Helps diagnose TTS and voice chat issues
 */
export async function GET(req: NextRequest) {
  try {
    // Require authentication
    const session = await getAuthSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        elevenlabsApiKey: {
          exists: !!process.env.ELEVENLABS_API_KEY,
          length: process.env.ELEVENLABS_API_KEY?.length || 0,
          preview: process.env.ELEVENLABS_API_KEY ? 
            `${process.env.ELEVENLABS_API_KEY.substring(0, 8)}...` : 'MISSING'
        },
        elevenlabsVoiceId: {
          exists: !!process.env.ELEVENLABS_VOICE_ID,
          value: process.env.ELEVENLABS_VOICE_ID || 'DEFAULT (Rachel)'
        },
        openaiApiKey: {
          exists: !!process.env.OPENAI_API_KEY,
          length: process.env.OPENAI_API_KEY?.length || 0,
          preview: process.env.OPENAI_API_KEY ? 
            `${process.env.OPENAI_API_KEY.substring(0, 8)}...` : 'MISSING'
        }
      },
      browser: {
        userAgent: req.headers.get('user-agent') || 'Unknown',
        acceptLanguage: req.headers.get('accept-language') || 'Unknown'
      }
    };

    // Test ElevenLabs API if key exists
    if (process.env.ELEVENLABS_API_KEY) {
      try {
        const testResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"}`,
          {
            method: "POST",
            headers: {
              Accept: "audio/mpeg",
              "Content-Type": "application/json",
              "xi-api-key": process.env.ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
              text: "Test",
              model_id: "eleven_turbo_v2_5",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true,
              },
            }),
          }
        );

        diagnostics.elevenlabsTest = {
          status: testResponse.status,
          statusText: testResponse.statusText,
          success: testResponse.ok,
          contentType: testResponse.headers.get('content-type'),
          contentLength: testResponse.headers.get('content-length')
        };

        if (!testResponse.ok) {
          const errorText = await testResponse.text().catch(() => 'Unknown error');
          diagnostics.elevenlabsTest.error = errorText;
        }
      } catch (error) {
        diagnostics.elevenlabsTest = {
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        };
      }
    } else {
      diagnostics.elevenlabsTest = {
        error: 'No API key configured',
        success: false
      };
    }

    return NextResponse.json(diagnostics, { status: 200 });

  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Debug failed",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
