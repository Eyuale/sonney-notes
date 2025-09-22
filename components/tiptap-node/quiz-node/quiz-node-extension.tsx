"use client";

import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import * as React from "react"

export type QuizAttrs = {
  question: string
  options: string[]
  answer?: string
  userAnswer?: string | null
}

const QuizNodeComponent: React.FC<NodeViewProps> = ({ node, updateAttributes }) => {
  const attrs = (node?.attrs ?? {}) as QuizAttrs
  const [selected, setSelected] = React.useState<string | null>(attrs.userAnswer ?? null)
  const groupNameRef = React.useRef<string>(typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2))

  const onChange = (value: string) => {
    setSelected(value)
    updateAttributes({ userAnswer: value })
  }

  const isCorrect = attrs.answer && selected ? attrs.answer === selected : null

  return (
    <NodeViewWrapper as="div" className="tiptap-quiz-node" style={{ border: "1px solid var(--gray-300)", borderRadius: 8, padding: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Quiz</div>
      <div style={{ marginBottom: 8 }}>{attrs.question}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {Array.isArray(attrs.options) && attrs.options.map((opt, idx) => (
          <label key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="radio"
              name={`quiz-${groupNameRef.current}`}
              value={opt}
              checked={selected === opt}
              onChange={(e) => onChange(e.target.value)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      {isCorrect !== null && (
        <div style={{ marginTop: 8, fontSize: 12, color: isCorrect ? "#16a34a" : "#dc2626" }}>
          {isCorrect ? "Correct" : "Incorrect"}
        </div>
      )}
    </NodeViewWrapper>
  )
}

export const QuizNode = Node.create({
  name: "quiz",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      question: { default: "" },
      options: { default: [] },
      answer: { default: null },
      userAnswer: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: "quiz-node",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["quiz-node", mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuizNodeComponent)
  },
})
