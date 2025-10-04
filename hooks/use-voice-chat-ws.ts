import { useState, useRef, useCallback, useEffect } from "react";

export type VoiceState = "idle" | "recording" | "processing" | "speaking" | "error" | "listening";

interface UseVoiceChatWSOptions {
  onTranscript?: (text: string) => void;
  onResponse?: (text: string) => void;
  onError?: (error: string) => void;
  onTeachingRequest?: (originalPrompt: string) => void;
  useBrowserSpeechAPI?: boolean;
  continuousMode?: boolean;
}

export function useVoiceChatWS(options: UseVoiceChatWSOptions = {}) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [ttsQueue, setTtsQueue] = useState<string[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messageHistoryRef = useRef<Array<{role: string, content: string}>>([]);
  const lastTranscriptRef = useRef<string>('');
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Default to browser API (free)
  const useBrowserAPI = options.useBrowserSpeechAPI !== false;
  const continuousMode = options.continuousMode !== false;
  
  // VAD settings
  const SILENCE_THRESHOLD = 10;
  const SILENCE_DURATION = 1500;

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    try {
      // For now, simulate WebSocket connection
      // In production, use Socket.io or similar
      console.log('🔌 Simulating WebSocket connection (using HTTP fallback)');
      setIsConnected(true);
      setError(null);
    } catch (error) {
      console.error('WebSocket simulation error:', error);
      // Still set as connected since we're using HTTP fallback
      setIsConnected(true);
      setError(null);
    }
  }, []);

  // Initialize WebSocket connection (simulated)
  useEffect(() => {
    try {
      connectWebSocket();
    } catch (error) {
      console.error('Failed to initialize WebSocket simulation:', error);
      // Still set as connected since we're using HTTP fallback
      setIsConnected(true);
      setError(null);
    }
    
    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (error) {
          console.error('Error closing WebSocket:', error);
        }
      }
    };
  }, [connectWebSocket]);

  // Process TTS queue
  const processTtsQueue = useCallback(async () => {
    if (isPlayingAudio || ttsQueue.length === 0) {
      return;
    }
    
    const nextText = ttsQueue[0];
    setTtsQueue(prev => prev.slice(1));
    
    await speakResponseInternal(nextText);
  }, [isPlayingAudio, ttsQueue, continuousMode]);

  // Internal TTS function that actually plays audio
  const speakResponseInternal = useCallback(async (text: string, onProgress?: (progress: number) => void) => {
    try {
      // Validate text input
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        console.log('⚠️ Empty or invalid text provided for TTS');
        return;
      }
      
      setIsPlayingAudio(true);
      setVoiceState("speaking");
      
       // Stop speech recognition to prevent feedback loop
       if (recognitionRef.current) {
         try {
           console.log('🛑 Stopping speech recognition to prevent AI voice detection');
           recognitionRef.current.stop();
           setIsListening(false);
           setVoiceState("speaking");
           console.log('✅ Speech recognition stopped successfully');
         } catch (error) {
           console.log('🎤 Speech recognition already stopped or error:', error);
         }
       }
       
       // Also stop VAD to prevent any audio analysis during TTS
       if (animationFrameRef.current) {
         cancelAnimationFrame(animationFrameRef.current);
         animationFrameRef.current = null;
         console.log('🛑 VAD stopped to prevent AI voice detection');
       }
       
       // Clear any pending silence timeout
       if (silenceTimeoutRef.current) {
         clearTimeout(silenceTimeoutRef.current);
         silenceTimeoutRef.current = null;
         console.log('🛑 Silence timeout cleared');
       }
      
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
         
         // Remove all event listeners first to prevent conflicts
         existingAudio.oncanplaythrough = null;
         existingAudio.onloadeddata = null;
         existingAudio.onloadstart = null;
         existingAudio.oncanplay = null;
         existingAudio.onerror = null;
         existingAudio.onabort = null;
         existingAudio.onstalled = null;
         existingAudio.onplay = null;
         existingAudio.onended = null;
         existingAudio.onpause = null;
         existingAudio.onload = null;
         
         // Pause and reset existing audio synchronously
         try {
           if (!existingAudio.paused) {
             existingAudio.pause();
           }
           existingAudio.currentTime = 0;
           existingAudio.src = '';
           existingAudio.load();
           console.log('✅ Existing audio cleaned up successfully');
         } catch (cleanupError) {
           console.log('⚠️ Error cleaning up existing audio:', cleanupError);
         }
         
         // Clear reference immediately to prevent conflicts
         audioElementRef.current = null;
         
         // Wait a moment for cleanup to complete
         await new Promise(resolve => setTimeout(resolve, 50));
       }
      
      const response = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('TTS API error:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`TTS request failed: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      
      // Validate audio blob
      if (audioBlob.size === 0) {
        throw new Error('Received empty audio data from TTS API');
      }
      
      // Check if blob is valid audio
      if (!audioBlob.type.includes('audio')) {
        console.warn('⚠️ Received non-audio blob:', audioBlob.type);
      }
      
      console.log('Audio blob received:', {
        size: audioBlob.size,
        type: audioBlob.type,
        isValidAudio: audioBlob.type.includes('audio')
      });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Test if the URL is accessible
      try {
        const testResponse = await fetch(audioUrl);
        if (!testResponse.ok) {
          throw new Error(`Audio URL not accessible: ${testResponse.status}`);
        }
        console.log('✅ Audio URL is accessible');
      } catch (urlError) {
        console.error('❌ Audio URL test failed:', urlError);
        throw new Error('Audio URL is not accessible');
      }
      
      // Test if the URL is valid
      console.log('🔊 Created audio URL:', {
        url: audioUrl,
        blobSize: audioBlob.size,
        blobType: audioBlob.type
      });
      
      const audio = new Audio();
      audioElementRef.current = audio;
      
      // Configure audio element for better compatibility
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      
      // Set the src after configuring the element
      audio.src = audioUrl;
      
      console.log('🔊 Audio element created:', {
        src: audio.src,
        preload: audio.preload,
        crossOrigin: audio.crossOrigin,
        readyState: audio.readyState,
        networkState: audio.networkState
      });
      
      // Verify src was set correctly
      if (!audio.src || audio.src === '') {
        throw new Error('Failed to set audio src');
      }
      
      // Track audio progress for synchronization
      let progressInterval: NodeJS.Timeout;
      let isPlaying = false;
      
       // Start playing immediately without waiting for full load
       console.log('🔊 Starting audio playback immediately...');
       
       // Set up event listeners for better control
       audio.oncanplay = () => {
         console.log('🔊 Audio can play', {
           duration: audio.duration,
           readyState: audio.readyState
         });
       };
       
       audio.onloadeddata = () => {
         console.log('🔊 Audio data loaded', {
           duration: audio.duration,
           readyState: audio.readyState
         });
       };
       
       audio.onloadstart = () => {
         console.log('🔊 Audio loading started');
       };
       
       audio.onerror = (err) => {
         console.error('Audio loading error:', {
           error: err,
           audioError: audio.error,
           readyState: audio.readyState,
           networkState: audio.networkState,
           src: audio.src,
           currentTime: audio.currentTime,
           duration: audio.duration,
           srcEmpty: !audio.src || audio.src === '',
           srcCleared: audio.src === ''
         });
         
         // If src was cleared, try to restore it
         if (!audio.src || audio.src === '') {
           console.log('🔄 Attempting to restore audio src...');
           audio.src = audioUrl;
           if (audio.src) {
             console.log('✅ Audio src restored, retrying...');
             return; // Don't reject, let it try again
           }
         }
       };
       
       audio.onabort = () => {
         console.log('🔊 Audio loading aborted');
       };
       
       audio.onstalled = () => {
         console.log('🔊 Audio loading stalled');
       };
      
       // Start progress tracking when audio starts playing
       audio.onplay = () => {
         console.log('🔊 Audio playback started');
         isPlaying = true;
         
         // Clear any existing interval
         if (progressInterval) {
           clearInterval(progressInterval);
         }
         
         // Start progress tracking immediately
         progressInterval = setInterval(() => {
           if (audio.duration > 0 && isPlaying && !audio.paused) {
             const progress = (audio.currentTime / audio.duration) * 100;
             onProgress?.(progress);
           }
         }, 50); // Faster updates for better synchronization
       };
      
      audio.onended = () => {
        console.log('🔊 Audio playback completed');
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        URL.revokeObjectURL(audioUrl);
        setVoiceState("idle");
        setIsPlayingAudio(false);
        isPlaying = false;
        
        // Clean up audio element properly
        if (audioElementRef.current === audio) {
          audioElementRef.current = null;
        }
        
        onProgress?.(100); // Ensure final progress
        
        // Process next item in queue if any
        setTimeout(() => {
          processTtsQueue();
        }, 100);
        
         // Restart speech recognition after TTS completes
         if (continuousMode) {
           setTimeout(() => {
             console.log('🔄 Restarting speech recognition after TTS completion...');
             try {
               // Clear any existing recognition first
               if (recognitionRef.current) {
                 try {
                   recognitionRef.current.stop();
                 } catch (e) {
                   // Already stopped
                 }
                 recognitionRef.current = null;
               }
               
               // Always recreate recognition to ensure clean state
               console.log('🔄 Recreating speech recognition for continuous mode...');
               startRecordingBrowser();
             } catch (error) {
               console.log('🎤 Speech recognition restart failed:', error);
               // Try to restart the entire recording process
               setTimeout(() => {
                 console.log('🔄 Retrying speech recognition restart...');
                 try {
                   startRecordingBrowser();
                 } catch (retryError) {
                   console.error('🎤 Speech recognition restart retry failed:', retryError);
                 }
               }, 1000);
             }
           }, 1000); // Reduced delay to 1 second for faster response
         }
      };
      
      audio.onerror = (err) => {
        console.error('Audio playback error:', {
          error: err,
          audioSrc: audio.src,
          audioReadyState: audio.readyState,
          audioNetworkState: audio.networkState,
          audioError: audio.error
        });
        
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        URL.revokeObjectURL(audioUrl);
        setVoiceState("idle");
        setIsPlayingAudio(false);
        isPlaying = false;
        
        // Clean up audio element properly
        if (audioElementRef.current === audio) {
          audioElementRef.current = null;
        }
        
         // Restart speech recognition even on error
         if (continuousMode) {
           setTimeout(() => {
             try {
               // Clear any existing recognition first
               if (recognitionRef.current) {
                 try {
                   recognitionRef.current.stop();
                 } catch (e) {
                   // Already stopped
                 }
                 recognitionRef.current = null;
               }
               
               console.log('🔄 Recreating speech recognition after TTS error...');
               startRecordingBrowser();
             } catch (error) {
               console.log('🎤 Speech recognition restart failed after error:', error);
               // Try to restart the entire recording process
               setTimeout(() => {
                 console.log('🔄 Retrying speech recognition restart after error...');
                 try {
                   startRecordingBrowser();
                 } catch (retryError) {
                   console.error('🎤 Speech recognition restart retry failed after error:', retryError);
                 }
               }, 1000);
             }
           }, 1000); // Reduced delay to 1 second
         }
      };
      
       // Start audio playback with proper error handling
       try {
         console.log('🔊 Attempting to play audio...', {
           readyState: audio.readyState,
           networkState: audio.networkState,
           duration: audio.duration,
           src: audio.src
         });
         
         // Wait for audio to be ready before playing
         await new Promise<void>((resolve, reject) => {
           const timeout = setTimeout(() => {
             reject(new Error('Audio loading timeout'));
           }, 5000);
           
           const onCanPlay = () => {
             clearTimeout(timeout);
             audio.removeEventListener('canplay', onCanPlay);
             audio.removeEventListener('error', onError);
             resolve();
           };
           
           const onError = (err: Event) => {
             clearTimeout(timeout);
             audio.removeEventListener('canplay', onCanPlay);
             audio.removeEventListener('error', onError);
             reject(err);
           };
           
           if (audio.readyState >= 3) {
             // Audio is already ready
             clearTimeout(timeout);
             resolve();
           } else {
             audio.addEventListener('canplay', onCanPlay);
             audio.addEventListener('error', onError);
           }
         });
         
         // Now try to play with retry logic for AbortError
         let retryCount = 0;
         const maxRetries = 3;
         
         while (retryCount < maxRetries) {
           try {
             console.log(`🔊 Attempting to play audio (attempt ${retryCount + 1})...`);
             await audio.play();
             console.log('🔊 Audio play() succeeded');
             break;
           } catch (playError: unknown) {
             retryCount++;
             console.error(`Audio play() failed (attempt ${retryCount}):`, playError);
             
             if (playError instanceof Error && playError.name === 'AbortError') {
               console.log('🛑 Audio play was aborted, retrying...');
               if (retryCount < maxRetries) {
                 // Wait a bit before retrying
                 await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
                 continue;
               }
             }
             
             // Try to resume audio context if it's suspended
             if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
               console.log('🔊 Attempting to resume audio context...');
               try {
                 await audioContextRef.current.resume();
                 console.log('🔊 Audio context resumed, retrying play...');
                 await audio.play();
                 console.log('🔊 Audio play() succeeded after context resume');
                 break;
               } catch (resumeError) {
                 console.error('Audio context resume failed:', resumeError);
               }
             }
             
             if (retryCount >= maxRetries) {
               throw new Error('Audio play failed after all retries, will try browser TTS');
             }
           }
         }
         
       } catch (playError) {
         console.error('Audio play() failed:', playError);
         // Try fallback to browser speech synthesis
         console.log('🔊 Audio play failed, trying browser TTS fallback...');
         throw new Error('Audio play failed, will try browser TTS');
       }
      
    } catch (err) {
      console.error('TTS error:', err);
      
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
               // Clear any existing recognition first
               if (recognitionRef.current) {
                 try {
                   recognitionRef.current.stop();
                 } catch (e) {
                   // Already stopped
                 }
                 recognitionRef.current = null;
               }
               
               console.log('🔄 Recreating speech recognition after browser TTS...');
               startRecordingBrowser();
             } catch (error) {
               console.log('🎤 Speech recognition restart failed:', error);
               setTimeout(() => {
                 console.log('🔄 Retrying speech recognition restart...');
                 try {
                   startRecordingBrowser();
                 } catch (retryError) {
                   console.error('🎤 Speech recognition restart retry failed:', retryError);
                 }
               }, 1000);
             }
           }, 1000); // Reduced delay to 1 second
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
               // Clear any existing recognition first
               if (recognitionRef.current) {
                 try {
                   recognitionRef.current.stop();
                 } catch (e) {
                   // Already stopped
                 }
                 recognitionRef.current = null;
               }
               
               console.log('🔄 Recreating speech recognition after fallback TTS error...');
               startRecordingBrowser();
             } catch (error) {
               console.log('🎤 Speech recognition restart failed:', error);
               setTimeout(() => {
                 console.log('🔄 Retrying speech recognition restart...');
                 try {
                   startRecordingBrowser();
                 } catch (retryError) {
                   console.error('🎤 Speech recognition restart retry failed:', retryError);
                 }
               }, 1000);
             }
           }, 1000); // Reduced delay to 1 second
         }
      }
    }
  }, [continuousMode, isPlayingAudio, processTtsQueue]);

  // Public speakResponse function that adds to queue
  const speakResponse = useCallback(async (text: string, onProgress?: (progress: number) => void) => {
    // Validate text input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.log('⚠️ Empty or invalid text provided for TTS');
      return;
    }
    
    // Prevent duplicate text from being added to queue
    setTtsQueue(prev => {
      // Check if this text is already in the queue
      if (prev.includes(text)) {
        console.log('⚠️ Text already in TTS queue, skipping duplicate');
        return prev;
      }
      return [...prev, text];
    });
    
    // Process queue if not currently playing
    if (!isPlayingAudio) {
      processTtsQueue();
    }
  }, [isPlayingAudio, processTtsQueue]);

  // Send message via HTTP (WebSocket fallback)
  const sendVoiceMessage = useCallback(async (message: string) => {
    try {
      console.log('📤 Sending voice message:', message);
      setVoiceState("processing");
      
      // Check if this is a follow-up question after a lesson was generated
      // If so, use the full chat API for better context
      const hasRecentLesson = messageHistoryRef.current.some(msg => 
        msg.role === 'assistant' && 
        (msg.content.includes('lesson') || msg.content.includes('created') || msg.content.includes('generated'))
      );
      
      let response;
      if (hasRecentLesson) {
        console.log('📚 Detected follow-up question after lesson, using full chat API');
        // Use full chat API for better context
        const messagesToSend = [
          ...messageHistoryRef.current,
          { role: 'user', content: message }
        ];
        
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            messages: messagesToSend
          }),
        });
      } else {
        // Use voice chat API for regular questions
        const messagesToSend = [
          ...messageHistoryRef.current,
          { role: 'user', content: message }
        ];
        
        console.log('📤 Sending messages to voice API:', messagesToSend);
        
        response = await fetch('/api/voice-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            messages: messagesToSend
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`Voice chat request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle response with proper TTS synchronization
      let responseText;
      if (hasRecentLesson) {
        // Full chat API response format
        responseText = data.content || data.message || 'No response received';
      } else {
        // Voice chat API response format
        responseText = data.content;
      }
      
      // Start TTS first, then sync text display with voice progress
      const ttsPromise = speakResponseInternal(responseText, (progress) => {
        // Calculate how many words should be visible based on TTS progress
        const words = responseText.split(' ');
        const targetWordIndex = Math.floor((progress / 100) * words.length);
        
        // Update text to match TTS progress - show progressively more text
        if (targetWordIndex > 0) {
          const currentText = words.slice(0, targetWordIndex).join(' ');
          options.onResponse?.(currentText);
        }
      });
      
      // Wait for TTS to complete before showing full text
      await ttsPromise;
      
      // Display the complete response text after TTS finishes
      options.onResponse?.(responseText);
      
      // Add to message history
      messageHistoryRef.current.push(
        { role: 'user', content: message },
        { role: 'assistant', content: data.content }
      );
      
      // Keep only last 10 messages
      if (messageHistoryRef.current.length > 10) {
        messageHistoryRef.current = messageHistoryRef.current.slice(-10);
      }
      
      // Handle teaching requests (only for voice chat API)
      if (!hasRecentLesson && data.teachingRequest && data.originalPrompt) {
        console.log('📚 Teaching request detected via HTTP:', data.originalPrompt);
        options.onTeachingRequest?.(data.originalPrompt);
      }
      
    } catch (error) {
      console.error('Voice message error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send voice message';
      setError(errorMessage);
      setVoiceState("error");
      options.onError?.(errorMessage);
    }
  }, [options, speakResponseInternal, continuousMode]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current.src = '';
      audioElementRef.current.load();
      audioElementRef.current = null;
    }
    setIsPlayingAudio(false);
    audioChunksRef.current = [];
  }, []);

  // Start recording using Browser Web Speech API (FREE!)
  const startRecordingBrowser = useCallback(async () => {
    try {
      setError(null);
      setVoiceState("recording");
      setIsListening(true);

      // Check if browser supports Web Speech API
      const SpeechRecognition = (window as Window & {SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition}).SpeechRecognition || (window as Window & {webkitSpeechRecognition?: typeof SpeechRecognition}).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        throw new Error("Your browser doesn't support the free voice recognition. Please use Chrome or Edge, or add an OpenAI API key for the paid version.");
      }

      // Request microphone permission first
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        throw new Error("Microphone access denied. Please allow microphone permissions in your browser settings.");
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      console.log('🎤 Voice recognition started...', continuousMode ? '(continuous mode)' : '(single mode)');

      // Configuration for best results
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      // Store transcript as it comes in
      let finalTranscript = '';
      let interimTranscript = '';
      let hasDetectedSpeech = false;
      let isProcessing = false;
      
      // Setup Voice Activity Detection (VAD) for auto-stop
      const setupVAD = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const audioContext = new AudioContext();
          const analyser = audioContext.createAnalyser();
          const microphone = audioContext.createMediaStreamSource(stream);
          
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.8;
          microphone.connect(analyser);
          
          audioContextRef.current = audioContext;
          analyserRef.current = analyser;
          
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          // Monitor audio levels
          const checkAudioLevel = () => {
            if (!analyserRef.current || !recognitionRef.current) return;
            
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;
            
            // Detect speech
            if (average > SILENCE_THRESHOLD) {
              hasDetectedSpeech = true;
              // Clear silence timeout - user is still speaking
              if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = null;
              }
              console.log('🗣️ Speech detected, level:', Math.round(average));
            } else if (hasDetectedSpeech && !isProcessing) {
              // Silence detected after speech started
              if (!silenceTimeoutRef.current) {
                console.log('🔇 Silence detected, waiting 1.5s...');
                silenceTimeoutRef.current = setTimeout(() => {
                  console.log('⏱️ 1.5s of silence - processing transcript');
                  const fullTranscript = (finalTranscript + interimTranscript).trim();
                  
                  if (fullTranscript) {
                    console.log('📝 Processing transcript in continuous mode:', fullTranscript);
                    isProcessing = true;
                    setVoiceState("processing");
                    options.onTranscript?.(fullTranscript);
                    sendVoiceMessage(fullTranscript);
                    
                     if (continuousMode) {
                       // In continuous mode, keep recording after processing
                       console.log('🔄 Continuous mode - processing complete, keeping microphone active');
                       finalTranscript = '';
                       interimTranscript = '';
                       lastTranscriptRef.current = '';
                       if (transcriptTimeoutRef.current) {
                         clearTimeout(transcriptTimeoutRef.current);
                         transcriptTimeoutRef.current = null;
                       }
                       hasDetectedSpeech = false;
                       isProcessing = false;
                       setVoiceState("recording"); // Keep recording state for continuous mode
                       
                       // Ensure recognition continues running
                       console.log('🎤 Continuous mode - ensuring recognition stays active');
                       // Don't restart here - let it continue naturally
                     } else {
                       // Single mode - stop recording
                       if (recognitionRef.current) {
                         recognitionRef.current.stop();
                       }
                     }
                  }
                }, SILENCE_DURATION);
              }
            }
            
            animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
          };
          
          checkAudioLevel();
        } catch (err) {
          console.error('VAD setup failed:', err);
        }
      };
      
      setupVAD();

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Process all results
        interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Show interim results in real-time with debouncing
        const currentText = (finalTranscript + interimTranscript).trim();
        console.log('🔍 Current text:', currentText, 'Last text:', lastTranscriptRef.current);
        
        if (currentText && currentText !== lastTranscriptRef.current) {
          console.log('✅ Text changed, updating UI');
          lastTranscriptRef.current = currentText;
          
          // Clear any existing timeout
          if (transcriptTimeoutRef.current) {
            clearTimeout(transcriptTimeoutRef.current);
          }
          
          // Debounce the transcript update to prevent rapid duplicates
          transcriptTimeoutRef.current = setTimeout(() => {
            options.onTranscript?.(currentText);
          }, 50); // 50ms debounce
        } else {
          console.log('⏭️ Text unchanged, skipping update');
        }
        
        console.log('📝 Final transcript:', finalTranscript);
        console.log('📝 Interim transcript:', interimTranscript);
      };

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
      };

      recognition.onspeechstart = () => {
        console.log('🗣️ Speech started');
      };

      recognition.onspeechend = () => {
        console.log('🔇 Speech ended');
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // Ignore 'no-speech' and 'aborted' errors in continuous mode
        if (continuousMode && (event.error === 'no-speech' || event.error === 'aborted')) {
          console.log('🎤 Ignoring expected error in continuous mode:', event.error);
          return;
        }
        
        // Log other errors but don't show them as critical
        if (event.error === 'no-speech') {
          console.log('🎤 No speech detected, continuing to listen...');
          return;
        }
        
        console.error('Speech recognition error:', event.error);
        
        let errorMsg = '';
        switch (event.error) {
          case 'audio-capture':
            errorMsg = 'No microphone found. Please check your microphone connection.';
            break;
          case 'not-allowed':
            errorMsg = 'Microphone access denied. Please allow microphone permissions.';
            break;
          case 'network':
            errorMsg = 'Network error. Please check your internet connection.';
            break;
          default:
            errorMsg = `Speech recognition error: ${event.error}`;
        }
        
        setError(errorMsg);
        setVoiceState("error");
        setIsListening(false);
        options.onError?.(errorMsg);
      };

      recognition.onend = () => {
        console.log('🛑 Speech recognition ended');
        setIsListening(false);
        
        // Cleanup VAD
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        
         // In continuous mode, don't restart here - let audio.onended handle it
         if (!continuousMode) {
          // Only process final transcript if not in continuous mode or if manually stopped
          const fullTranscript = (finalTranscript + interimTranscript).trim();
          
          console.log('📝 Full transcript:', fullTranscript || '(empty)');
          
          if (fullTranscript) {
            setVoiceState("idle");
            options.onTranscript?.(fullTranscript);
            sendVoiceMessage(fullTranscript);
          } else if (hasDetectedSpeech) {
            // Had speech but couldn't transcribe
            setVoiceState("error");
            setError("Could not transcribe speech. Please speak more clearly and try again.");
            options.onError?.("Could not transcribe speech. Please speak more clearly and try again.");
          } else {
            // No speech detected at all
            setVoiceState("error");
            const errorMsg = "No speech detected. Please make sure your microphone is selected and working.";
            setError(errorMsg);
            options.onError?.(errorMsg);
          }
        }
      };

      recognition.start();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to start voice recognition";
      setError(errorMsg);
      setVoiceState("error");
      setIsListening(false);
      options.onError?.(errorMsg);
    }
  }, [options, continuousMode, sendVoiceMessage]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isListening) {
      cleanup();
      setIsListening(false);
      setVoiceState("idle");
    } else {
      if (useBrowserAPI) {
        startRecordingBrowser();
      } else {
        // Fallback to API method if needed
        console.log('API method not implemented for WebSocket version');
      }
    }
  }, [isListening, cleanup, useBrowserAPI, startRecordingBrowser]);

  // Process TTS queue when it changes
  useEffect(() => {
    if (ttsQueue.length > 0 && !isPlayingAudio) {
      processTtsQueue();
    }
  }, [ttsQueue, isPlayingAudio, processTtsQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    voiceState,
    error,
    isListening,
    isConnected,
    toggleRecording,
    speakResponse,
    cleanup,
  };
}
