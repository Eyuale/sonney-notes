"use client"

import * as React from "react"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { MoonStarIcon } from "@/components/tiptap-icons/moon-star-icon"
import { SunIcon } from "@/components/tiptap-icons/sun-icon"

export function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = React.useState<boolean | null>(null)

  // Run only on client to detect system preference
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem("theme")
      if (stored === "dark") {
        setIsDarkMode(true)
        return
      }
      if (stored === "light") {
        setIsDarkMode(false)
        return
      }
    } catch {
      // ignore
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setIsDarkMode(prefersDark)
  }, [])

  // Apply/remove the dark class
  React.useEffect(() => {
    if (isDarkMode === null) return // avoid running on first render
    const root = document.documentElement
    if (isDarkMode) {
      root.classList.add("dark")
      try { window.localStorage.setItem("theme", "dark") } catch {}
    } else {
      root.classList.remove("dark")
      try { window.localStorage.setItem("theme", "light") } catch {}
    }
    // Debug: log current classes and computed colors
    try {
      const bg = getComputedStyle(document.body).getPropertyValue("background").trim()
      const fg = getComputedStyle(document.body).getPropertyValue("color").trim()
      console.log("[ThemeToggle] isDarkMode=", isDarkMode, "html.class=", root.className, { bg, fg })
    } catch {}
  }, [isDarkMode])

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev)

  if (isDarkMode === null) {
    // Optional: prevent rendering until client decides
    return null
  }

  return (
    <Button
      onClick={toggleDarkMode}
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      data-style="ghost"
    >
      {isDarkMode ? (
        <MoonStarIcon className="tiptap-button-icon" />
      ) : (
        <SunIcon className="tiptap-button-icon" />
      )}
    </Button>
  )
}
