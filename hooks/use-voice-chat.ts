import { useState, useRef, useCallback, useEffect } from "react";

export type VoiceState = "idle" | "recording" | "processing" | "speaking" | "error" | "listening";

interface UseVoiceChatOptions {
  onTranscript?: (text: string) => void;
  onResponse?: (text: string) => void;
  onError?: (error: string) => void;
  useBrowserSpeechAPI?: boolean; // Use free browser API (default: true)
  continuousMode?: boolean; // Keep recording even during AI responses
}

export function useVoiceChat(options: UseVoiceChatOptions = {}) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Default to browser API (free)
  const useBrowserAPI = options.useBrowserSpeechAPI !== false;
  const continuousMode = options.continuousMode !== false;
  
  // VAD settings
  const SILENCE_THRESHOLD = 10; // Volume threshold for silence detection
  const SILENCE_DURATION = 1500; // 1.5 seconds of silence before auto-stop
  
  // Continuous recording state (for future use)
  // const [isContinuousRecording, setIsContinuousRecording] = useState(false);

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
      audioElementRef.current = null;
    }
    audioChunksRef.current = [];
  }, []);

  // Start recording using Browser Web Speech API (FREE!)
  const startRecordingBrowser = useCallback(async () => {
    try {
      setError(null);
      setVoiceState("recording");
      setIsListening(true);
      // setIsContinuousRecording(continuousMode);

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
                    isProcessing = true;
                    setVoiceState("processing");
                    options.onTranscript?.(fullTranscript);
                    
                    if (continuousMode) {
                      // In continuous mode, keep recording after processing
                      console.log('🔄 Continuous mode - keeping microphone active');
                      finalTranscript = '';
                      interimTranscript = '';
                      hasDetectedSpeech = false;
                      isProcessing = false;
                      setVoiceState("recording");
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
            console.log('✅ Final transcript:', transcript);
          } else {
            interimTranscript += transcript;
            console.log('⏳ Interim transcript:', transcript);
          }
        }
        
        // Don't stop automatically - wait for user to click stop
        // This prevents the "no speech" error
      };
      
      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
      };
      
      recognition.onspeechstart = () => {
        console.log('🗣️ Speech detected');
      };
      
      recognition.onspeechend = () => {
        console.log('🔇 Speech ended');
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // Ignore 'no-speech' error since we're using continuous mode
        if (event.error === 'no-speech') {
          // This is normal - user might be thinking, just keep listening
          console.log('Waiting for speech...');
          return;
        }
        
        // Ignore 'aborted' error (happens when user stops manually)
        if (event.error === 'aborted') {
          return;
        }
        
        const errorMsg = event.error === 'audio-capture'
          ? "Microphone not available. Please check permissions."
          : event.error === 'not-allowed'
          ? "Microphone permission denied. Please allow microphone access."
          : event.error === 'network'
          ? "Network error. Speech recognition requires internet connection."
          : `Speech recognition error: ${event.error}`;
        
        setError(errorMsg);
        setVoiceState("error");
        setIsListening(false);
        options.onError?.(errorMsg);
      };

      recognition.onend = () => {
        console.log('🛑 Speech recognition ended');
        setIsListening(false);
        // setIsContinuousRecording(false);
        
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
        
        // Only process final transcript if not in continuous mode or if manually stopped
        if (!continuousMode) {
          const fullTranscript = (finalTranscript + interimTranscript).trim();
          
          console.log('📝 Full transcript:', fullTranscript || '(empty)');
          
          if (fullTranscript) {
            setVoiceState("idle");
            options.onTranscript?.(fullTranscript);
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
  }, [options, continuousMode]);

  // Start recording using MediaRecorder + API (paid, more accurate)
  const startRecordingAPI = useCallback(async () => {
    try {
      setError(null);
      setVoiceState("recording");
      setIsListening(true);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await transcribeAudioInternal(audioBlob);
      };

      mediaRecorder.start();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to start recording";
      setError(errorMsg);
      setVoiceState("error");
      setIsListening(false);
      options.onError?.(errorMsg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  // Start recording (chooses method based on useBrowserAPI)
  const startRecording = useCallback(async () => {
    if (useBrowserAPI) {
      await startRecordingBrowser();
    } else {
      await startRecordingAPI();
    }
  }, [useBrowserAPI, startRecordingBrowser, startRecordingAPI]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (useBrowserAPI && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
      setIsListening(false);
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setIsListening(false);
      mediaRecorderRef.current.stop();
    }
  }, [useBrowserAPI, setIsListening]);

  // Transcribe audio (internal function)
  const transcribeAudioInternal = async (audioBlob: Blob) => {
    try {
      setVoiceState("processing");

      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");

      const response = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Transcription failed" }));
        throw new Error(data.error || "Transcription failed");
      }

      const data = await response.json();
      const transcript = data.text || "";

      options.onTranscript?.(transcript);
      setVoiceState("idle");
      
      return transcript;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Transcription failed";
      setError(errorMsg);
      setVoiceState("error");
      options.onError?.(errorMsg);
      return null;
    }
  };

  // Play AI response using ElevenLabs TTS
  const speakResponse = useCallback(async (text: string) => {
    try {
      setVoiceState("speaking");
      setError(null);

      // Clean up any existing audio first
      if (audioElementRef.current) {
        const existingAudio = audioElementRef.current;
        try {
          if (!existingAudio.paused) {
            existingAudio.pause();
          }
          existingAudio.currentTime = 0;
          existingAudio.src = '';
          existingAudio.load();
        } catch (cleanupError) {
          console.log('⚠️ Error cleaning up existing audio:', cleanupError);
        }
        audioElementRef.current = null;
      }

      const response = await fetch("/api/voice/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "TTS failed" }));
        throw new Error(data.error || "TTS failed");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio element
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;

      audio.onended = () => {
        setVoiceState("idle");
        URL.revokeObjectURL(audioUrl);
        audioElementRef.current = null;
      };

      audio.onerror = () => {
        setVoiceState("error");
        setError("Failed to play audio");
        URL.revokeObjectURL(audioUrl);
        audioElementRef.current = null;
      };

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
          clearTimeout(timeout);
          resolve();
        } else {
          audio.addEventListener('canplay', onCanPlay);
          audio.addEventListener('error', onError);
        }
      });

      // Try to play with retry logic for AbortError
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          await audio.play();
          break;
        } catch (playError: any) {
          retryCount++;
          if (playError.name === 'AbortError' && retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
            continue;
          }
          throw playError;
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "TTS failed";
      setError(errorMsg);
      setVoiceState("error");
      options.onError?.(errorMsg);
    }
  }, [options]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
      setVoiceState("idle");
    }
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isListening, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    voiceState,
    isListening,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    speakResponse,
    stopSpeaking,
  };
}

