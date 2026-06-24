"use client"

import { useEffect, useState } from "react"

// Evita mismatch de hidratação ao ler estados persistidos no localStorage.
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}
