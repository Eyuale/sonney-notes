/**
 * Voice Chat Utility Functions
 * - Speech-to-Text using OpenAI Whisper API
 * - Text-to-Speech using ElevenLabs API
 */

// Speech-to-Text using OpenAI Whisper
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-1");
  formData.append("language", "en"); // Can be made dynamic

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Transcription failed: ${error.error || response.statusText}`);
  }

  const data = await response.json();
  return data.text || "";
}

// Text-to-Speech using ElevenLabs API
export async function generateSpeech(text: string, voiceId?: string): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }

  // Default voice ID (Rachel - a natural sounding female voice)
  // You can get voice IDs from: https://api.elevenlabs.io/v1/voices
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
    throw new Error(`TTS failed: ${error.detail || response.statusText}`);
  }

  return await response.arrayBuffer();
}

