"use client"

import React, { useState, useRef, useEffect } from "react"
import "./chat-panel.scss"
import { IconArrowUp, IconMicrophone, IconPaperclip } from "@tabler/icons-react"
import { tryParseBlueprint, blueprintToTiptapDoc, type TiptapDoc, type LessonBlueprint } from "@/lib/lesson-mapper"

export function ChatPanel({ onLessonDoc }: { onLessonDoc?: (doc: TiptapDoc) => void }) {
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string }>>([
    { id: "m1", role: "assistant", content: "Hi! I can help you generate interactive lessons. Ask me to add a graph, quiz, or simulation to the canvas." },
  ])
  const [input, setInput] = useState("")
  const endRef = useRef<HTMLDivElement | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  async function send() {
    const text = input.trim()
    if (!text) return
    setError(null)
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput("")
    setIsTyping(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      })
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
        | { role: "assistant"; content: string }

      const data: ChatAPIResponse = await res.json()

      if ("type" in data && data.type === "blueprint") {
        // Server provided a structured blueprint and a friendly chat summary
        const doc = blueprintToTiptapDoc(data.blueprint)
        onLessonDoc?.(doc)
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "assistant" as const, content: data.chat },
        ])
      } else if ("content" in data) {
        // Fallback: server returned plain assistant text; try to parse blueprint client-side
        const blueprint = tryParseBlueprint(data.content)
        if (blueprint) {
          const doc = blueprintToTiptapDoc(blueprint)
          onLessonDoc?.(doc)
          setMessages((m) => [
            ...m,
            { id: crypto.randomUUID(), role: "assistant" as const, content: "Lesson generated and added to the canvas." },
          ])
        } else {
          setMessages((m) => [
            ...m,
            { id: crypto.randomUUID(), role: "assistant" as const, content: data.content },
          ])
        }
      } else {
        // Unexpected shape; be defensive
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "assistant" as const, content: "Sorry, I couldn't understand the server response." },
        ])
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
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <aside className="chat-panel" aria-label="AI chat panel">
      <div className="chat-scroll">
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.role}`}>
            <div className="bubble">{m.content}</div>
          </div>
        ))}
        {isTyping && (
          <div className="chat-msg assistant">
            <div className="bubble">Typing…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="chat-input-bar">
        <div className="input-shell">
          <button className="icon-btn" title="Attach">
            <IconPaperclip size={16}/>
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Learn something new"
            aria-label="Chat prompt"
          />
          <button className="icon-btn" title="Voice">
            <IconMicrophone size={16}/>
          </button>
          <button className="send-btn" onClick={send} aria-label="Send" disabled={isTyping}>
            <IconArrowUp size={16}/>
          </button>
        </div>
        {error && (
          <div role="status" aria-live="polite" className="chat-error">
            {error}
          </div>
        )}
      </div>
    </aside>
  )
}

