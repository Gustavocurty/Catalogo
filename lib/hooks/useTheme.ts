"use client"

import { useEffect, useState } from "react"

export type Theme = "light" | "dark"

export const THEME_STORAGE_KEY = "attivus-theme"

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.classList.toggle("light", theme === "light")
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    const next: Theme = stored === "dark" ? "dark" : "light"
    applyTheme(next)
    setThemeState(next)
    setReady(true)
  }, [])

  function setTheme(next: Theme) {
    applyTheme(next)
    window.localStorage.setItem(THEME_STORAGE_KEY, next)
    setThemeState(next)
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return { theme, setTheme, toggleTheme, ready }
}
