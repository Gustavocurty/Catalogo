"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/domain/AppHeader"
import { CatalogContent } from "@/components/domain/CatalogContent"
import { useSeller } from "@/lib/hooks/useSeller"
import { useHydrated } from "@/lib/hooks/useHydrated"

export default function CatalogPage() {
  const router = useRouter()
  const { seller } = useSeller()
  const hydrated = useHydrated()

  useEffect(() => {
    if (hydrated && !seller) router.replace("/")
  }, [hydrated, seller, router])

  if (!hydrated || !seller) return null

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader title="Catálogo de Produtos" />
      <CatalogContent />
    </div>
  )
}
