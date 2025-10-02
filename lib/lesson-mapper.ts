// Utility to parse LLM response into a lesson blueprint and map it to a Tiptap JSON document
// The mapping uses only core StarterKit-compatible nodes so it works before custom nodes exist.
// As you add custom nodes (QuizNode, GraphNode, SimulationNode), replace the placeholder
// structures with the actual node types and attributes.

export type LessonSection =
  | { type: "text"; content: string }
  | { type: "quiz"; question: string; options: string[]; answer?: string }
  | {
      type: "graph"
      expression: string
      title?: string
      xLabel?: string
      yLabel?: string
      domain?: { xMin: number; xMax: number }
      samples?: number
      params?: { name: string; default: number; min: number; max: number }[]
      color?: string
    }
  | { type: "simulation"; content: string }

export type LessonBlueprint = {
  title?: string
  sections: LessonSection[]
}

export type TiptapMark = { type: string; attrs?: Record<string, unknown> }

export type TiptapNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  text?: string
  marks?: TiptapMark[]
}

export type TiptapDoc = {
  type: "doc"
  content: TiptapNode[]
}

// Try to extract JSON from raw text content. Handles fenced code blocks and plain JSON.
export function tryParseBlueprint(text: string): LessonBlueprint | null {
  if (!text) return null
  const trimmed = text.trim()

  // Try fenced code block ```json ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\n([\s\S]*?)```/i)
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed

  try {
    const parsed = JSON.parse(candidate)
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.sections)) {
      return parsed as LessonBlueprint
    }
  } catch {
    // ignore
  }
  return null
}

// Map a LessonBlueprint to a minimal Tiptap JSON document (StarterKit-compatible)
export function blueprintToTiptapDoc(blueprint: LessonBlueprint): TiptapDoc {
  const nodes: TiptapNode[] = []

  if (blueprint.title) {
    nodes.push({ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: blueprint.title }] })
  }

  for (const section of blueprint.sections) {
    switch (section.type) {
      case "text": {
        nodes.push(...markdownToNodes(section.content))
        break
      }
      case "quiz": {
        // Use custom quiz node with question, options, and optional answer
        nodes.push({
          type: "quiz",
          attrs: {
            question: section.question,
            options: section.options,
            answer: section.answer ?? null,
            userAnswer: null,
          },
        })
        break
      }
      case "graph": {
        // Use custom graph node; copy optional attrs with defaults
        nodes.push({
          type: "graph",
          attrs: {
            expression: section.expression,
            title: section.title ?? null,
            xLabel: section.xLabel ?? null,
            yLabel: section.yLabel ?? null,
            domain: section.domain ?? { xMin: -10, xMax: 10 },
            samples: section.samples ?? 200,
            params: section.params ?? [],
            color: section.color ?? "#8884d8",
          },
        })
        break
      }
      case "simulation": {
        // Placeholder paragraph indicating a simulation slot
        nodes.push({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Simulation" }] })
        nodes.push({ type: "paragraph", content: [{ type: "text", text: section.content }] })
        break
      }
      default: {
        // Fallback to paragraph with raw JSON
        nodes.push({ type: "paragraph", content: [{ type: "text", text: JSON.stringify(section) }] })
      }
    }
  }

  return { type: "doc", content: nodes }
}

// Very small Markdown -> TipTap node converter for lesson text
// Supports: headings (#..), bullet/ordered lists (-, * and 1.), blockquotes (>), fenced code (```),
// and inline bold (**) and italics (*).
export function markdownToNodes(text: string): TiptapNode[] {
  const lines = String(text ?? "").split(/\r?\n/)
  if (lines.length === 0) return [{ type: "paragraph" }]

  const out: TiptapNode[] = []
  let i = 0
  let inCode = false
  let codeBuffer: string[] = []

  function flushParagraph(buf: string[]) {
    const content = inlineToTextNodes(buf.join(" ").trim())
    out.push({ type: "paragraph", content: content.length ? content : [{ type: "text", text: "" }] })
  }

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code blocks
    const fence = line.match(/^```(.*)?$/)
    if (fence) {
      if (!inCode) {
        inCode = true
        codeBuffer = []
      } else {
        inCode = false
        out.push({ type: "codeBlock", content: [{ type: "text", text: codeBuffer.join("\n") }] })
      }
      i++
      continue
    }
    if (inCode) {
      codeBuffer.push(line)
      i++
      continue
    }

    // Skip empty lines
    if (line.trim() === "") {
      i++
      continue
    }

    // Headings
    const h = line.match(/^\s*(#{1,6})\s+(.+)$/)
    if (h) {
      const level = h[1].length
      out.push({ type: "heading", attrs: { level }, content: inlineToTextNodes(h[2]) })
      i++
      continue
    }

    // Blockquote (single-line)
    const bq = line.match(/^\s*>\s*(.+)$/)
    if (bq) {
      out.push({ type: "blockquote", content: [{ type: "paragraph", content: inlineToTextNodes(bq[1]) }] })
      i++
      continue
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: TiptapNode[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const text = lines[i].replace(/^\s*[-*]\s+/, "")
        items.push({ type: "listItem", content: [{ type: "paragraph", content: inlineToTextNodes(text) }] })
        i++
      }
      out.push({ type: "bulletList", content: items })
      continue
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: TiptapNode[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const text = lines[i].replace(/^\s*\d+\.\s+/, "")
        items.push({ type: "listItem", content: [{ type: "paragraph", content: inlineToTextNodes(text) }] })
        i++
      }
      out.push({ type: "orderedList", content: items })
      continue
    }

    // Paragraph: gather until blank line or next block
    const buf: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() !== "" && !/^\s*(?:#{1,6}|[-*]|\d+\.|>|```)/.test(lines[i])) {
      buf.push(lines[i])
      i++
    }
    flushParagraph(buf)
  }

  return out.length ? out : [{ type: "paragraph" }]
}

function inlineToTextNodes(text: string): TiptapNode[] {
  const result: TiptapNode[] = []
  const remaining = text

  // Handle inline code first: `code`
  const parts = splitWithDelimiters(remaining, /`([^`]+)`/g)
  for (const part of parts) {
    if (part.type === "match") {
      const marks: TiptapMark[] = [{ type: "code" }]
      result.push({ type: "text", text: part.value, marks })
      continue
    }
    // For non-code segments, parse bold and italics
    const segs = parseBoldItalics(part.value)
    result.push(...segs)
  }

  return result.length ? result : [{ type: "text", text: "" }]
}

function parseBoldItalics(text: string): TiptapNode[] {
  const nodes: TiptapNode[] = []
  let i = 0
  while (i < text.length) {
    // Bold **text**
    const bold = text.slice(i).match(/^\*\*([^*]+)\*\*/)
    if (bold) {
      const marks: TiptapMark[] = [{ type: "bold" }]
      nodes.push({ type: "text", text: bold[1], marks })
      i += bold[0].length
      continue
    }
    // Italic *text*
    const italic = text.slice(i).match(/^\*([^*]+)\*/)
    if (italic) {
      const marks: TiptapMark[] = [{ type: "italic" }]
      nodes.push({ type: "text", text: italic[1], marks })
      i += italic[0].length
      continue
    }
    // Plain char
    nodes.push({ type: "text", text: text[i] })
    i++
  }
  return mergeAdjacentText(nodes)
}

function splitWithDelimiters(input: string, regex: RegExp): Array<{ type: "text" | "match"; value: string }> {
  const out: Array<{ type: "text" | "match"; value: string }> = []
  let lastIndex = 0
  let m: RegExpExecArray | null
  const r = new RegExp(regex)
  while ((m = r.exec(input)) !== null) {
    if (m.index > lastIndex) out.push({ type: "text", value: input.slice(lastIndex, m.index) })
    out.push({ type: "match", value: m[1] })
    lastIndex = r.lastIndex
  }
  if (lastIndex < input.length) out.push({ type: "text", value: input.slice(lastIndex) })
  return out
}

function mergeAdjacentText(nodes: TiptapNode[]): TiptapNode[] {
  const merged: TiptapNode[] = []
  for (const n of nodes) {
    const prev = merged[merged.length - 1]
    if (
      prev &&
      prev.type === "text" &&
      n.type === "text" &&
      JSON.stringify(prev.marks ?? null) === JSON.stringify(n.marks ?? null)
    ) {
      prev.text = (prev.text || "") + (n.text || "")
    } else {
      merged.push({ ...n })
    }
  }
  return merged
}
