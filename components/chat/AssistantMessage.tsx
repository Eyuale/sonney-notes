"use client"

import React, { useEffect } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

/**
 * Read-only TipTap renderer for assistant messages.
 * Renders plain text content inside TipTap to get consistent styling/marks.
 */
export default function AssistantMessage({ content }: { content: string }) {
  // Convert Markdown to safe HTML for TipTap (bold, italics, lists, code, headings, links)
  const html = React.useMemo(() => {
    const raw = String(content ?? "")

    // Basic HTML escape first
    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

    // Handle fenced code blocks ```lang\n...\n```
    let inCode = false
    const codeBlocks: string[] = []
    const codePlaceholder = (idx: number) => `__CODE_BLOCK_${idx}__`

    const lines = raw.split(/\r?\n/)
    const processed: string[] = []
    let currentCode: string[] = []

    for (const line of lines) {
      const fenceMatch = line.match(/^```(.*)?$/)
      if (fenceMatch) {
        if (!inCode) {
          inCode = true
          currentCode = []
        } else {
          // end of code block
          inCode = false
          const codeInner = escapeHtml(currentCode.join("\n"))
          const blockHtml = `<pre><code>${codeInner}</code></pre>`
          const idx = codeBlocks.push(blockHtml) - 1
          processed.push(codePlaceholder(idx))
        }
        continue
      }

      if (inCode) {
        currentCode.push(line)
      } else {
        processed.push(line)
      }
    }

    // Group lists and convert inline markdown
    const toInlineHtml = (text: string) => {
      let t = escapeHtml(text)
      // links: [text](url)
      t = t.replace(/\[(.+?)\]\((.+?)\)/g, (_m, g1, g2) => {
        const href = g2
        return `<a href="${href}" target="_blank" rel="noreferrer noopener">${g1}</a>`
      })
      // bold: **text**
      t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // italics: *text*
      t = t.replace(/(^|\W)\*(?!\*)([^*]+)\*(?=\W|$)/g, "$1<em>$2</em>")
      // inline code: `code`
      t = t.replace(/`([^`]+)`/g, "<code>$1</code>")
      return t
    }

    const out: string[] = []
    let i = 0
    while (i < processed.length) {
      const line = processed[i]
      if (line.trim() === "") {
        i++
        continue
      }

      // Headings
      const h = line.match(/^\s*(#{1,6})\s+(.+)$/)
      if (h) {
        const level = h[1].length
        out.push(`<h${level}>${toInlineHtml(h[2])}</h${level}>`)
        i++
        continue
      }

      // Unordered list
      if (/^\s*[-*]\s+/.test(line)) {
        const items: string[] = []
        while (i < processed.length && /^\s*[-*]\s+/.test(processed[i])) {
          const item = processed[i].replace(/^\s*[-*]\s+/, "")
          items.push(`<li>${toInlineHtml(item)}</li>`)
          i++
        }
        out.push(`<ul>${items.join("")}</ul>`) 
        continue
      }

      // Ordered list
      if (/^\s*\d+\.\s+/.test(line)) {
        const items: string[] = []
        while (i < processed.length && /^\s*\d+\.\s+/.test(processed[i])) {
          const item = processed[i].replace(/^\s*\d+\.\s+/, "")
          items.push(`<li>${toInlineHtml(item)}</li>`)
          i++
        }
        out.push(`<ol>${items.join("")}</ol>`) 
        continue
      }

      // Blockquote
      const bq = line.match(/^\s*>\s*(.+)$/)
      if (bq) {
        out.push(`<blockquote>${toInlineHtml(bq[1])}</blockquote>`)
        i++
        continue
      }

      // Paragraph
      out.push(`<p>${toInlineHtml(line)}</p>`)
      i++
    }

    // Re-insert code blocks
    let htmlOut = out.join("\n")
    codeBlocks.forEach((block, idx) => {
      htmlOut = htmlOut.replace(codePlaceholder(idx), block)
    })

    // Ensure at least a paragraph exists
    if (!htmlOut.trim()) htmlOut = "<p>\u00A0</p>"
    return htmlOut
  }, [content])

  const editor = useEditor({
    extensions: [StarterKit],
    content: html,
    editable: false,
    immediatelyRender: false, // avoid SSR hydration mismatch
  })

  // Update content if it changes after mount
  useEffect(() => {
    if (editor && html) {
      editor.commands.setContent(html)
    }
  }, [editor, html])

  return <EditorContent editor={editor} />
}
