"use client";

import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import { ChatPanel } from "@/components/chat/ChatPanel"
import { ResizableSplit } from "@/components/layout/ResizableSplit"
import * as React from "react"
import type { Editor } from "@tiptap/core"

export default function Home() {
  const [editor, setEditor] = React.useState<Editor | null>(null)

  function handleLessonInsert(text: string) {
    // Insert assistant lesson content at the end of the document
    if (!editor) return
    editor.commands.focus("end")
    editor.commands.insertContent(text)
  }

  return (
    <ResizableSplit
      left={
        <>
          <div className="split-actions">
            <button className="chip" title="Share">share</button>
            <button className="chip" title="Save">save</button>
          </div>
          <SimpleEditor onEditorReady={setEditor} />
        </>
      }
      right={<ChatPanel onLesson={handleLessonInsert} />}
      defaultRightWidth={420}
      minRightWidth={360}
      maxRightWidth={560}
    />
  )
}