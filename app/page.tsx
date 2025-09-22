"use client";

import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import { ChatPanel } from "@/components/chat/ChatPanel"
import { ResizableSplit } from "@/components/layout/ResizableSplit"
import * as React from "react"
import type { Editor } from "@tiptap/core"
import type { TiptapDoc } from "@/lib/lesson-mapper"

export default function Home() {
  const [editor, setEditor] = React.useState<Editor | null>(null)

  function handleLessonDocInsert(doc: TiptapDoc) {
    if (!editor) return
    // Replace the entire document with the generated lesson blueprint
    editor.commands.setContent(doc, { emitUpdate: false })
    editor.commands.focus("start")
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
      right={<ChatPanel onLessonDoc={handleLessonDocInsert} />}
      defaultRightWidth={420}
      minRightWidth={360}
      maxRightWidth={560}
    />
  )
}