# Voice Chat Setup Guide

This guide will help you configure the real-time voice chat feature for the E-learning platform.

## Overview

The voice chat feature provides:
- 🎤 **Real-time voice input** using OpenAI Whisper for speech-to-text
- 🤖 **AI processing** of voice queries
- 🔊 **Text-to-speech responses** using ElevenLabs API
- ⚡ **Low latency** communication for natural conversations

## Requirements

You'll need API keys from:
1. **OpenAI** (for Whisper speech-to-text)
2. **ElevenLabs** (for text-to-speech)

## Step 1: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click **"Create new secret key"**
4. Copy the API key (starts with `sk-`)
5. **Important**: Save it securely - you won't see it again!

**Cost**: Whisper API is very affordable (~$0.006 per minute of audio)

## Step 2: Get ElevenLabs API Key

1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Sign up for an account (free tier available)
3. Go to your [Profile Settings](https://elevenlabs.io/app/settings/api)
4. Copy your API key

**Free Tier**: 10,000 characters per month (enough for ~300-400 voice responses)

### Optional: Choose a Different Voice

By default, the app uses Rachel's voice. To use a different voice:

1. Go to [ElevenLabs Voice Library](https://elevenlabs.io/app/voice-library)
2. Choose a voice you like
3. Copy the Voice ID
4. Add it to your `.env.local` (see below)

## Step 3: Configure Environment Variables

Open your `.env.local` file in the project root and add:

```bash
# OpenAI API Key (for Whisper speech-to-text)
OPENAI_API_KEY=sk-your_openai_key_here

# ElevenLabs API Key (for text-to-speech)
ELEVENLABS_API_KEY=your_elevenlabs_key_here

# Optional: Custom Voice ID (default: Rachel)
# Get voice IDs from: https://elevenlabs.io/app/voice-library
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

**Important Notes:**
- No quotes around values
- No spaces before or after `=`
- File must be named exactly `.env.local`
- File must be in the project root (same folder as `package.json`)

## Step 4: Restart Your Development Server

After adding the environment variables:

```bash
# Stop the server (Ctrl+C or Cmd+C)
# Then restart:
npm run dev
```

## Step 5: Test the Voice Chat

1. Open the app in your browser
2. Make sure the input field is **empty**
3. You should see a **microphone icon** 🎤
4. Click it to start recording
5. Speak your question
6. Click again to stop recording
7. The app will:
   - Transcribe your speech
   - Send it to the AI
   - Speak the response back to you

## How It Works

### Toggle Button Logic

The circular button in the chat panel has two modes:

- **Empty input field** → 🎤 Microphone Icon (Voice Mode)
  - Click to start/stop voice recording
  - Red pulsing animation when recording
  
- **Text present** → ⬆️ Arrow Icon (Send Mode)
  - Click to send the typed message

### Voice Input Workflow

1. **User clicks microphone** → Recording starts
2. **User speaks** → Audio is captured
3. **User clicks again** → Recording stops
4. **Transcription** → Audio sent to OpenAI Whisper API
5. **AI Processing** → Transcribed text sent to Gemini
6. **TTS** → AI response piped to ElevenLabs API
7. **Playback** → Audio response plays automatically

## Visual Feedback

The app provides real-time status indicators:

- 🎤 **Listening...** - Recording your voice
- ⚙️ **Processing audio...** - Transcribing speech
- 🔊 **Speaking...** - Playing AI response
- **Red pulsing button** - Active recording

## Troubleshooting

### "OPENAI_API_KEY not configured"

**Solution:**
1. Check `.env.local` exists in project root
2. Verify key name is exactly `OPENAI_API_KEY`
3. Restart development server
4. Clear browser cache

### "ELEVENLABS_API_KEY not configured"

**Solution:**
1. Check `.env.local` has `ELEVENLABS_API_KEY`
2. Verify you copied the full API key
3. Restart development server

### Microphone not working

**Solution:**
1. Check browser permissions (allow microphone access)
2. Try HTTPS (microphone requires secure context)
3. Test in Chrome/Edge (best browser support)

### No audio playback

**Solution:**
1. Check browser audio isn't muted
2. Verify ElevenLabs API key is correct
3. Check browser console for errors

### Slow transcription

This is normal! Speech-to-text processing takes a few seconds:
- Short phrases: 1-3 seconds
- Longer audio: 3-7 seconds

The app uses the fastest models available for low latency.

## Browser Compatibility

- ✅ **Chrome/Edge** - Best support
- ✅ **Firefox** - Good support
- ⚠️ **Safari** - Limited support (may require HTTPS)
- ❌ **IE** - Not supported

## API Costs

### OpenAI Whisper
- **$0.006 per minute** of audio
- Example: 1000 voice queries (~30 sec each) = ~$3

### ElevenLabs
- **Free tier**: 10,000 characters/month
- **Starter**: $5/month for 30,000 characters
- Example: ~300-400 voice responses per month (free)

## Security Notes

- API keys are used server-side only
- Never expose keys in client code
- Add `.env.local` to `.gitignore` (already done)
- Rotate keys periodically

## Performance Optimization

The implementation uses:
- **Whisper-1** - OpenAI's fastest STT model
- **eleven_turbo_v2_5** - ElevenLabs' fastest TTS model
- **WebM/Opus codec** - Efficient audio compression
- **Direct API calls** - No unnecessary middleware

Typical latency:
- Speech-to-text: 1-3 seconds
- AI processing: 1-2 seconds  
- Text-to-speech: 1-2 seconds
- **Total**: ~3-7 seconds end-to-end

## Alternative Voice Providers (Optional)

If you prefer a different TTS provider, you can modify `lib/voice-utils.ts`:

- **Google Cloud TTS** - Good quality, competitive pricing
- **Amazon Polly** - Good integration with AWS
- **Microsoft Azure TTS** - Neural voices, good pricing
- **Browser Web Speech API** - Free, offline, limited voices

## Example `.env.local` File

```bash
# Authentication
AUTH_SECRET=your_random_secret_string
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Gemini API (for answer generation)
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyAbc123def456ghi789jkl

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true

# Voice Chat (NEW)
OPENAI_API_KEY=sk-proj-abc123def456
ELEVENLABS_API_KEY=abc123def456
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Optional
GEMINI_MODEL_NAME=gemini-1.5-pro
MONGODB_DB=tiptap_app
```

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all environment variables are set
3. Ensure APIs have sufficient credits
4. Test microphone in other apps

Enjoy natural voice conversations with your AI tutor! 🎉

