"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function RedirectTo({ href }: { href: string }) {
  const router = useRouter()

  useEffect(() => {
    router.replace(href)
  }, [href, router])

  return <p className="p-6 text-sm text-muted-foreground" role="status">Redirecionando...</p>
}
