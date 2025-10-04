"use client"

import React, { useState, useRef, useEffect } from "react"
import "./chat-panel.scss"
import { IconArrowUp, IconMicrophone, IconPaperclip } from "@tabler/icons-react"
import { FileUploader, type UploadedFile, type UploadProgress } from "@/components/file-uploader"
import { tryParseBlueprint, blueprintToTiptapDoc, markdownToNodes, type TiptapDoc, type LessonBlueprint } from "@/lib/lesson-mapper"
import AssistantMessage from "./AssistantMessage"
import { useVoiceChatWS } from "@/hooks/use-voice-chat-ws"

export function ChatPanel({ onLessonDoc }: { onLessonDoc?: (doc: TiptapDoc) => void }) {
  type ChatMsg = { id: string; role: "user" | "assistant"; content: string }
  type ChatListItem = {
    id: string
    type: "blueprint" | "text"
    chat: string
    lessonId?: string
    createdAt?: string | Date
  }

  const initialGreeting: ChatMsg = {
    id: "m1",
    role: "assistant",
    content:
      "Hi! I can help you generate interactive lessons. Ask me to add a graph, quiz, or simulation to the canvas.",
  }

  const [messages, setMessages] = useState<Array<ChatMsg>>([initialGreeting])
  const [input, setInput] = useState("")
  const endRef = useRef<HTMLDivElement | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<ChatListItem[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [openingChatId, setOpeningChatId] = useState<string | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState<string>("")
  const [attachments, setAttachments] = useState<UploadedFile[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<UploadProgress[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false)

  // Voice chat integration - WebSocket version for real-time
  const {
    voiceState,
    isListening,
    isConnected: isVoiceConnected,
    toggleRecording,
    speakResponse,
  } = useVoiceChatWS({
    continuousMode: true, // Enable continuous recording
    onTranscript: (text) => {
      // Update the last user message with real-time transcript
      setMessages((m) => {
        const lastMessage = m[m.length - 1];
        if (lastMessage && lastMessage.role === "user" && lastMessage.content.startsWith("🎤 ")) {
          // Update existing voice message
          return [
            ...m.slice(0, -1),
            { ...lastMessage, content: `🎤 ${text}` }
          ];
        } else {
          // Create new voice message
          return [
            ...m,
            { id: crypto.randomUUID(), role: "user" as const, content: `🎤 ${text}` },
          ];
        }
      });
      // Clear the input field since we're showing it as a message
      setInput("");
    },
    onResponse: (text) => {
      // Update the last assistant message with synchronized text
      setMessages((m) => {
        const lastMessage = m[m.length - 1];
        if (lastMessage && lastMessage.role === "assistant" && 
            (lastMessage.content.startsWith("🤖 ") || lastMessage.content.startsWith("🎤 "))) {
          // Update existing assistant message
          return [
            ...m.slice(0, -1),
            { ...lastMessage, content: `🤖 ${text}` }
          ];
        } else {
          // Create new assistant message
          return [
            ...m,
            { id: crypto.randomUUID(), role: "assistant" as const, content: `🤖 ${text}` },
          ];
        }
      });
    },
    onTeachingRequest: (originalPrompt) => {
      // Handle teaching request - send to full chat API
      console.log('📚 Teaching request detected, routing to editor:', originalPrompt);
      handleTeachingRequest(originalPrompt);
    },
    onError: (err) => {
      setError(err);
    },
  });

  const handleUploadProgress = (progress: UploadProgress) => {
    setUploadingFiles(prev => {
      const existing = prev.find(p => p.file.name === progress.file.name);
      if (existing) {
        return prev.map(p => p.file.name === progress.file.name ? progress : p);
      } else {
        return [...prev, progress];
      }
    });
  };

  const handleRemoveUpload = async (upload: UploadProgress, idx: number) => {
    // Cancel any ongoing upload
    if (upload.status === 'uploading') {
      // The upload is in progress, we should try to clean up
      try {
        // If the file was already uploaded to S3, we need to delete it
        if (upload.progress > 50) { // If past 50%, likely uploaded to S3
          await fetch('/api/files/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: upload.file.name,
              size: upload.file.size
            })
          });
        }
      } catch (error) {
        console.error('Failed to cleanup file:', error);
        // Continue anyway - we still want to remove from UI
      }
    }

    // Remove from local state
    setUploadingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveAttachment = async (attachment: UploadedFile, idx: number) => {
    try {
      // Clean up the file from storage if it exists
      await fetch('/api/files/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: attachment.filename,
          size: attachment.size
        })
      });
    } catch (error) {
      console.error('Failed to cleanup attachment:', error);
      // Continue anyway - we still want to remove from UI
    }

    // Remove from attachments state
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const fetchHistory = React.useCallback(async () => {
    try {
      setHistoryLoading(true)
      const res = await fetch("/api/chats")
      if (!res.ok) throw new Error(`Failed to load history (${res.status})`)
      const data = (await res.json()) as { items: ChatListItem[] }
      setHistory(data.items)
    } catch (e) {
      console.error(e)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    // Preload history on mount
    fetchHistory().catch(() => {})
  }, [fetchHistory])

  async function loadChat(chatId: string) {
    try {
      setChatLoading(true)
      setOpeningChatId(chatId)
      setError(null)
      const res = await fetch(`/api/chats/${chatId}`)
      if (!res.ok) throw new Error(`Failed to load chat (${res.status})`)
      const data = (await res.json()) as {
        id: string
        type: "blueprint" | "text"
        chat?: string
        messages?: Array<{ role: "user" | "assistant"; content: string; id?: string }>
      }

      const loaded: ChatMsg[] = Array.isArray(data.messages) && data.messages.length
        ? data.messages.map((m, i) => ({ id: m.id ?? `m${i}`, role: m.role, content: String(m.content ?? "") }))
        : data.chat
          ? [{ id: "m0", role: "assistant", content: data.chat }]
          : [initialGreeting]

      setMessages(loaded)
      setCurrentChatId(data.id)
      setHistoryOpen(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not open chat"
      setError(msg)
    } finally {
      setChatLoading(false)
      setOpeningChatId(null)
    }
  }

  function newChat() {
    setMessages([initialGreeting])
    setInput("")
    setAttachments([])
    setUploadingFiles([])
    setCurrentChatId(null)
    // Clear the canvas/editor by sending an empty Tiptap document
    const emptyDoc: TiptapDoc = { type: "doc", content: [{ type: "paragraph" }] }
    onLessonDoc?.(emptyDoc)
  }

  async function send() {
    const text = input.trim()
    if (!text) return
    await sendMessage(text)
  }

  // Helper function for sending messages (used by both text and voice)
  async function sendMessage(text: string, isVoiceChat = false, skipTTS = false) {
    setError(null)
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput("")
    setIsTyping(true)

    try {
      // Use optimized voice chat endpoint for voice interactions
      const endpoint = isVoiceChat ? "/api/voice-chat" : "/api/chat";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, attachments }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError("Please sign in with Google to use the AI chat.")
          setMessages((m) => [
            ...m,
            { id: crypto.randomUUID(), role: "assistant" as const, content: "You need to sign in (top-right) to chat and save lessons." },
          ])
          return
        }
        const data = await res.json().catch(() => ({}))
        const errMsg = data?.error || `Request failed with status ${res.status}`
        throw new Error(errMsg)
      }
      type ChatAPIResponse =
        | { type: "blueprint"; blueprint: LessonBlueprint; chat: string }
        | { type: "editor"; content: string; chat: string }
        | { role: "assistant"; content: string }

      const data: ChatAPIResponse = await res.json()

      let assistantResponse = "";

      if ("type" in data && data.type === "blueprint") {
        // Server provided a structured blueprint and a friendly chat summary
        const doc = blueprintToTiptapDoc(data.blueprint)
        onLessonDoc?.(doc)
        assistantResponse = data.chat;
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "assistant" as const, content: assistantResponse },
        ])
        // refresh history silently
        fetchHistory().catch(() => {})
      } else if ("type" in data && data.type === "editor") {
        // Server provided markdown content for the editor (summaries, document content, etc.)
        const nodes = markdownToNodes(data.content)
        const doc: TiptapDoc = { type: "doc", content: nodes }
        onLessonDoc?.(doc)
        assistantResponse = data.chat;
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "assistant" as const, content: assistantResponse },
        ])
        // refresh history silently
        fetchHistory().catch(() => {})
      } else if ("content" in data) {
        // Fallback: server returned plain assistant text; try to parse blueprint client-side
        const blueprint = tryParseBlueprint(data.content)
        if (blueprint) {
          const doc = blueprintToTiptapDoc(blueprint)
          onLessonDoc?.(doc)
          assistantResponse = "Lesson generated and added to the canvas.";
          setMessages((m) => [
            ...m,
            { id: crypto.randomUUID(), role: "assistant" as const, content: assistantResponse },
          ])
          fetchHistory().catch(() => {})
        } else {
          assistantResponse = data.content;
          setMessages((m) => [
            ...m,
            { id: crypto.randomUUID(), role: "assistant" as const, content: assistantResponse },
          ])
          fetchHistory().catch(() => {})
        }
      } else {
        // Unexpected shape; be defensive
        assistantResponse = "Sorry, I couldn't understand the server response.";
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "assistant" as const, content: assistantResponse },
        ])
      }

      // Check if this is a teaching request from voice chat
      if ('teachingRequest' in data && data.teachingRequest && 'originalPrompt' in data && data.originalPrompt) {
        // Handle teaching request - send to full chat API
        console.log('📚 Teaching request detected, routing to editor:', data.originalPrompt);
        setTimeout(() => {
          handleTeachingRequest(String(data.originalPrompt));
        }, 1000); // Small delay to let user see the acknowledgment
      }

      // Always speak the response using TTS (voice + text on screen) unless skipped
      if (assistantResponse && !skipTTS) {
        speakResponse(assistantResponse);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong"
      setError(msg)
      const assistantMsg = {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        content: `⚠️ Error: ${msg}`,
      }
      setMessages((m) => [...m, assistantMsg])
    } finally {
      setIsTyping(false)
      // Clear attachments and uploading files after sending
      setAttachments([])
      setUploadingFiles([])
    }
  }

  // Send message with transcript (triggered by voice) - WebSocket handles this automatically
  // This function is kept for compatibility but not used in WebSocket version
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function sendWithTranscript(text: string) {
    console.log('📝 Voice transcript (WebSocket handled):', text);
  }

  // Handle teaching requests from voice chat
  async function handleTeachingRequest(originalPrompt: string) {
    setIsGeneratingLesson(true);
    try {
      // First, speak an introduction about what we're creating
      const introText = `I'm creating a comprehensive lesson about ${extractTopicFromPrompt(originalPrompt)}. This will appear in the editor for you to study.`;
      speakResponse(introText);
      
      // Wait a moment for the introduction to start playing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Send the original prompt to the full chat API for detailed teaching
      // Don't speak the lesson content - it's too long and causes repetition
      await sendMessage(originalPrompt, false, true); // Use full chat endpoint, skip TTS
      
      // Add a message to the chat history so the voice system knows about the lesson
      const lessonAckMessage = {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        content: `I've created a comprehensive lesson about ${extractTopicFromPrompt(originalPrompt)}. You can now ask me questions about it!`
      };
      setMessages((m) => [...m, lessonAckMessage]);
      
    } finally {
      setIsGeneratingLesson(false);
    }
  }
  
  // Helper function to extract topic from prompt
  function extractTopicFromPrompt(prompt: string): string {
    // Remove common teaching phrases to get the core topic
    const cleaned = prompt
      .replace(/^(teach me about|show me|explain|create a lesson about|generate content about)\s+/i, '')
      .replace(/\s+(please|in detail|comprehensively)$/i, '')
      .trim();
    
    return cleaned || 'this topic';
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  async function startRename(item: ChatListItem) {
    setRenamingId(item.id)
    setRenameText(item.chat || "")
  }

  async function confirmRename() {
    if (!renamingId) return
    const newText = renameText.trim()
    if (!newText) {
      setRenamingId(null)
      return
    }
    try {
      const res = await fetch(`/api/chats/${renamingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat: newText }),
      })
      if (!res.ok) throw new Error(`Rename failed (${res.status})`)
      await fetchHistory()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not rename chat"
      setError(msg)
    } finally {
      setRenamingId(null)
    }
  }

  function cancelRename() {
    setRenamingId(null)
  }

  async function deleteChat(id: string) {
    try {
      setDeletingId(id)
      const res = await fetch(`/api/chats/${id}`, { method: "DELETE" })
      if (res.status !== 204) {
        const data = await res.json().catch(() => ({}))
        const msg = (data && (data.error as string)) || `Delete failed (${res.status})`
        throw new Error(msg)
      }
      await fetchHistory()
      if (currentChatId === id) {
        newChat()
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not delete chat"
      setError(msg)
    } finally {
      setDeletingId(null)
    }
  }

  async function openLesson(lessonId: string) {
    try {
      setError(null)
      const res = await fetch(`/api/lessons/${lessonId}`)
      if (!res.ok) throw new Error(`Failed to load lesson (${res.status})`)
      const data = (await res.json()) as { blueprint: LessonBlueprint }
      const doc = blueprintToTiptapDoc(data.blueprint)
      onLessonDoc?.(doc)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not open lesson"
      setError(msg)
    }
  }

  // When clicking a history card, open the chat and, if present, load the lesson onto the canvas
  async function openChatAndMaybeLesson(item: ChatListItem) {
    await loadChat(item.id)
    if (item.lessonId) {
      await openLesson(item.lessonId)
    }
  }

  function FilePreview({ file, progress, onRemove }: {
    file: File | UploadedFile,
    progress?: UploadProgress,
    onRemove: () => void
  }) {
    const isUploading = progress && progress.status !== 'completed' && progress.status !== 'error';
    const hasError = progress?.status === 'error';

    return (
      <div className="file-preview" style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 8px',
        margin: '2px 4px',
        border: '1px solid var(--card-border)',
        borderRadius: '6px',
        background: 'var(--card-bg)',
        fontSize: '12px'
      }}>
        <div style={{ marginRight: '6px' }}>
          {isUploading ? (
            <div style={{ width: '12px', height: '12px', border: '2px solid var(--tt-gray-light-a-200)', borderTop: '2px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          ) : hasError ? (
            <div style={{ width: '12px', height: '12px', background: 'var(--tt-color-text-red)', borderRadius: '50%' }} />
          ) : (
            <div style={{ width: '12px', height: '12px', background: 'var(--tt-color-text-green)', borderRadius: '50%' }} />
          )}
        </div>
        <span style={{ marginRight: '6px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {('filename' in file ? file.filename : file.name) || 'Unknown file'}
        </span>
        {isUploading && (
          <span style={{ marginRight: '6px', fontSize: '10px', color: 'var(--tt-color-text-gray)' }}>
            {progress?.progress || 0}%
          </span>
        )}
        {hasError && (
          <span style={{ marginRight: '6px', fontSize: '10px', color: 'var(--tt-color-text-red)' }}>
            Error
          </span>
        )}
        <button
          onClick={onRemove}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: 'var(--tt-color-text-gray-contrast)',
            padding: '0',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <aside className="chat-panel" aria-label="AI chat panel">
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div className="chat-card">
      <div className="chat-header">
        <button className="chip" onClick={() => setHistoryOpen((v) => !v)} aria-expanded={historyOpen}>
          history
        </button>
        <div className="spacer" />
        <button className="chip" onClick={newChat} title="Start a new chat">new</button>
      </div>

      {historyOpen && (
        <div className="chat-history-drawer">
          <div className="drawer-head">
            <strong>Recent chats</strong>
            <button className="chip" onClick={fetchHistory} disabled={historyLoading}>
              {historyLoading ? "…" : "refresh"}
            </button>
          </div>
          <div className="drawer-list" role="list">
            {(history ?? []).map((item) => {
              const isOpening = openingChatId === item.id && chatLoading
              const isDeleting = deletingId === item.id
              const isRenaming = renamingId === item.id
              return (
                <div key={item.id} className={`drawer-item${currentChatId === item.id ? " active" : ""}`} role="listitem">
                  {isRenaming ? (
                    <div className="rename-row">
                      <input
                        className="rename-input"
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmRename()
                          if (e.key === "Escape") cancelRename()
                        }}
                        autoFocus
                      />
                      <button className="chip" onClick={confirmRename}>save</button>
                      <button className="chip" onClick={cancelRename}>cancel</button>
                    </div>
                  ) : (
                    <>
                      <button
                        className="row-main"
                        onClick={() => openChatAndMaybeLesson(item)}
                        disabled={chatLoading}
                        title={item.chat}
                      >
                        <div className="title-line">
                          {isOpening ? "opening…" : (item.chat || (item.type === "blueprint" ? "Lesson" : "Chat"))}
                        </div>
                        {item.createdAt && (
                          <div className="meta-line">{new Date(item.createdAt).toLocaleString()}</div>
                        )}
                      </button>
                      <div className="row-actions">
                        <button className="chip" onClick={() => startRename(item)}>rename</button>
                        <button className="chip" onClick={() => deleteChat(item.id)} disabled={isDeleting}>
                          {isDeleting ? "deleting…" : "delete"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
            {!historyLoading && (history?.length ?? 0) === 0 && (
              <div className="empty">No chats yet</div>
            )}
          </div>
        </div>
      )}

      <div className="chat-scroll">
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.role}`}>
            <div className="bubble">
              {m.role === "assistant" ? (
                <AssistantMessage content={m.content} />
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat-msg assistant">
            <div className="bubble">Typing…</div>
          </div>
        )}
        {/* Voice status indicators */}
        {!isVoiceConnected && (
          <div className="chat-msg assistant">
            <div className="bubble voice-status">
              🔌 Connecting to voice chat...
            </div>
          </div>
        )}
        {isListening && voiceState !== "speaking" && (
          <div className="chat-msg assistant">
            <div className="bubble voice-status">
              🎤 Continuous listening... Speak anytime (auto-processes after 1.5s silence)
            </div>
          </div>
        )}
        {isListening && voiceState === "speaking" && (
          <div className="chat-msg assistant">
            <div className="bubble voice-status">
              🎤 Listening paused... (AI is speaking to prevent feedback)
            </div>
          </div>
        )}
        {voiceState === "processing" && (
          <div className="chat-msg assistant">
            <div className="bubble voice-status">
              ⚡ Processing audio... (real-time)
            </div>
          </div>
        )}
        {voiceState === "speaking" && (
          <div className="chat-msg assistant">
            <div className="bubble voice-status">
              🔊 Speaking... (Microphone muted to prevent feedback)
            </div>
          </div>
        )}
        {isGeneratingLesson && (
          <div className="chat-msg assistant">
            <div className="bubble voice-status">
              📚 Generating detailed lesson... This will appear in the editor
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="chat-input-bar">
          {/* File Previews in Input Area */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            minHeight: '20px',
            padding: '4px 8px',
            gap: '4px',
            // overflowX: 'auto',
          }}>
            {uploadingFiles.map((upload, idx) => (
              <FilePreview
                key={`upload-${upload.file.name}-${idx}`}
                file={upload.file}
                progress={upload}
                onRemove={() => handleRemoveUpload(upload, idx)}
              />
            ))}
            {attachments.map((attachment, idx) => (
              <FilePreview
                key={`attachment-${attachment.objectKey}-${idx}`}
                file={attachment}
                onRemove={() => handleRemoveAttachment(attachment, idx)}
              />
            ))}
          </div>
        <div className="input-shell">
          {/* Clear attachments button when there are attachments */}
          {attachments.length > 0 && (
            <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--card-border)' }}>
              <button
                onClick={() => setAttachments([])}
                style={{
                  background: 'none',
                  border: '1px solid var(--card-border)',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  color: 'var(--tt-color-text-gray)',
                  cursor: 'pointer'
                }}
              >
                Clear files
              </button>
            </div>
          )}
          


          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              isListening 
                ? "🎤 Listening... Speak now" 
                : attachments.length > 0 
                  ? "Add your message..." 
                  : "Learn something new"
            }
            aria-label="Chat prompt"
            style={{ flex: 1 }}
            disabled={isListening}
          />
          <div className="chat-panel-input-button-groups">
            <FileUploader
              onUploaded={(file) => {
                // Ask user if they want to add to existing files or replace
                if (attachments.length > 0) {
                  const shouldReplace = confirm("Add this file to existing attachments? Click OK to add, Cancel to replace.");
                  if (shouldReplace) {
                    setAttachments(prev => [...prev, file]);
                  } else {
                    setAttachments([file]);
                  }
                } else {
                  setAttachments([file]);
                }
                setUploadingFiles(prev => prev.filter(p => p.file.name !== file.filename));
              }}
              onProgress={handleUploadProgress}
            >
              <button className="icon-btn" title="Attach">
                <IconPaperclip size={16}/>
              </button>
            </FileUploader>
            <div className="senders">
              {/* Voice button - always visible when not typing */}
              {!isTyping && (
                <button 
                  className={`send-btn ${isListening ? 'recording' : ''}`}
                  onClick={toggleRecording} 
                  aria-label={isListening ? "Stop continuous recording" : "Start voice input"}
                  disabled={uploadingFiles.length > 0 || voiceState === "processing" || voiceState === "speaking"}
                  title={isListening ? "Stop continuous recording" : "Start continuous voice input"}
                >
                  <IconMicrophone size={16}/>
                </button>
              )}
              
              {/* Send button - only when there's text and not listening */}
              {input.trim().length > 0 && !isListening && (
                <button 
                  className="send-btn" 
                  onClick={send} 
                  aria-label="Send" 
                  disabled={isTyping || uploadingFiles.length > 0}
                  title="Send message"
                >
                  <IconArrowUp size={16}/>
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div role="status" aria-live="polite" className="chat-error">
            {error}
          </div>
        )}
      </div>
      </div>
    </aside>
  )
}


