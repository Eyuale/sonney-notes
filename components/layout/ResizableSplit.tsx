"use client"

import React from "react"

type Props = {
  left: React.ReactNode
  right: React.ReactNode
  defaultRightWidth?: number // px
  minRightWidth?: number // px
  maxRightWidth?: number // px
}

export function ResizableSplit({
  left,
  right,
  defaultRightWidth = 420,
  minRightWidth = 360,
  maxRightWidth = 560,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [chatWidth, setChatWidth] = React.useState(defaultRightWidth)
  const draggingRef = React.useRef(false)

  React.useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!draggingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const clientX = (e as MouseEvent).clientX ?? (e as TouchEvent).touches?.[0]?.clientX
      if (typeof clientX !== "number") return
      // Calculate width of the right panel from the container's right edge
      const raw = rect.right - clientX
      const next = Math.min(maxRightWidth, Math.max(minRightWidth, raw))
      setChatWidth(next)
    }

    function onUp() {
      draggingRef.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    window.addEventListener("touchmove", onMove)
    window.addEventListener("touchend", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("touchend", onUp)
    }
  }, [minRightWidth, maxRightWidth])

  function startDrag() {
    draggingRef.current = true
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

  return (
    <main
      className="split-shell"
      ref={containerRef}
      style={
        ({ "--chat-width": `${chatWidth}px` } as React.CSSProperties & {
          "--chat-width": string
        })
      }
    >
      <section className="split-left">{left}</section>
      <div
        className="split-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize chat panel"
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        <div className="handle" />
      </div>
      <section className="split-right">{right}</section>
    </main>
  )
}

export default ResizableSplit
