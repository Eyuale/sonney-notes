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

export type TiptapNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  text?: string
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
        nodes.push(...paragraphsFromText(section.content))
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

function paragraphsFromText(text: string): TiptapNode[] {
  const lines = text.split(/\n\n+/).map((x) => x.trim()).filter(Boolean)
  if (lines.length === 0) return [{ type: "paragraph" }]
  return lines.map((para) => ({ type: "paragraph", content: [{ type: "text", text: para }] }))
}
