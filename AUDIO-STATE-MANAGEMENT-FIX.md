# Audio State Management Fix

## Issues Fixed

### 1. Audio play() Interrupted by pause() Error
**Problem**: The `play()` request was being interrupted by a call to `pause()` because multiple audio elements were trying to play simultaneously.

**Solution**: 
- **Proper cleanup of existing audio** before starting new audio
- **Synchronous audio management** to prevent overlapping playback
- **Better error handling** for AbortError cases
- **Retry mechanism** for interrupted audio playback

## Key Changes Made

### Proper Audio Cleanup
```typescript
// Clean up any existing audio completely before starting new one
if (audioElementRef.current) {
  const existingAudio = audioElementRef.current;
  console.log('🛑 Stopping and cleaning up existing audio', {
    src: existingAudio.src,
    readyState: existingAudio.readyState,
    networkState: existingAudio.networkState,
    paused: existingAudio.paused,
    currentTime: existingAudio.currentTime
  });
  
  // Remove all event listeners first
  existingAudio.oncanplaythrough = null;
  existingAudio.onloadeddata = null;
  existingAudio.onloadstart = null;
  existingAudio.oncanplay = null;
  existingAudio.onerror = null;
  existingAudio.onabort = null;
  existingAudio.onstalled = null;
  existingAudio.onplay = null;
  existingAudio.onended = null;
  
  // Pause and reset existing audio
  try {
    existingAudio.pause();
    existingAudio.currentTime = 0;
    existingAudio.src = '';
    existingAudio.load();
    console.log('✅ Existing audio cleaned up successfully');
  } catch (cleanupError) {
    console.log('⚠️ Error cleaning up existing audio:', cleanupError);
  }
  
  // Clear reference immediately
  audioElementRef.current = null;
}
```

### Improved Audio Playback
```typescript
// Start audio playback with proper state management
try {
  console.log('🔊 Attempting to play audio...', {
    readyState: audio.readyState,
    networkState: audio.networkState,
    duration: audio.duration,
    src: audio.src
  });
  
  // Wait a moment for audio to be ready, then play
  setTimeout(async () => {
    try {
      console.log('🔊 Starting audio playback...');
      await audio.play();
      console.log('🔊 Audio play() succeeded');
    } catch (playError) {
      console.error('Audio play() failed:', playError);
      
      // If it's an abort error, the audio was interrupted
      if (playError.name === 'AbortError') {
        console.log('🛑 Audio play was aborts, trying again...');
        // Try once more after a brief delay
        setTimeout(async () => {
          try {
            await audio.play();
            console.log('🔊 Audio play() succeeded on retry');
          } catch (retryError) {
            console.error('Audio play() failed on retry:', retryError);
            throw new Error('Audio play failed, will try browser TTS');
          }
        }, 100);
      } else {
        throw new Error('Audio play failed, will try browser TTS');
      }
    }
  }, 100); // Small delay to ensure audio is ready
  
} catch (setupError) {
  console.error('Audio setup failed:', setupError);
  throw new Error('Audio setup failed, will try browser TTS');
}
```

### Better Error Handling
```typescript
// Try fallback to browser speech synthesis
try {
  console.log('🔄 Attempting fallback to browser speech synthesis...');
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  utterance.onstart = () => {
    console.log('🔊 Browser TTS started');
    setVoiceState("speaking");
  };
  
  utterance.onend = () => {
    console.log('🔊 Browser TTS completed');
    setVoiceState("idle");
    setIsPlayingAudio(false);
    
    // Restart speech recognition after TTS completes
    if (continuousMode) {
      setTimeout(() => {
        try {
          console.log('🔄 Recreating speech recognition after browser TTS...');
          startRecordingBrowser();
        } catch (error) {
          console.log('🎤 Speech recognition restart failed:', error);
          setTimeout(() => {
            console.log('🔄 Retrying speech recognition restart...');
            startRecordingBrowser();
          }, 1000);
        }
      }, 2000); // Increased delay to 2 seconds
    }
  };
  
  utterance.onerror = (event) => {
    console.error('Browser TTS error:', event);
    setVoiceState("idle");
    setIsPlayingAudio(false);
  };
  
  speechSynthesis.speak(utterance);
  
} catch (fallbackErr) {
  console.error('Fallback TTS also failed:', fallbackErr);
  setVoiceState("idle");
  setIsPlayingAudio(false);
  
  // Restart speech recognition on error
  if (continuousMode) {
    setTimeout(() => {
      try {
        console.log('🔄 Recreating speech recognition after fallback TTS error...');
        startRecordingBrowser();
      } catch (error) {
        console.log('🎤 Speech recognition restart failed:', error);
        setTimeout(() => {
          console.log('🔄 Retrying speech recognition restart...');
          startRecordingBrowser();
        }, 1000);
      }
    }, 2000); // Increased delay to 2 seconds
  }
}
```

## How It Works Now

1. **Audio Cleanup**: Existing audio is properly paused and cleaned up
2. **State Management**: Only one audio element plays at a time
3. **Error Handling**: AbortError is caught and handled with retry
4. **Fallback**: Browser TTS is used if audio fails
5. **Timing**: Proper delays prevent overlapping audio

## Testing

The system should now:
- ✅ **Not show AbortError** for audio playback
- ✅ **Properly manage audio state** with single audio element
- ✅ **Handle audio interruptions** gracefully
- ✅ **Fallback to browser TTS** when needed
- ✅ **Maintain synchronization** between voice and text

## Console Logs to Watch

- `🛑 Stopping and cleaning up existing audio`
- `✅ Existing audio cleaned up successfully`
- `🔊 Starting audio playback...`
- `🔊 Audio play() succeeded`
- `🛑 Audio play was aborted, trying again...`
- `🔊 Audio play() succeeded on retry`

These logs confirm the audio state management fixes are working properly.
