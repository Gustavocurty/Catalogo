"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/domain/AppHeader"
import { CartContent } from "@/components/domain/CartContent"
import { useSeller } from "@/lib/hooks/useSeller"
import { useHydrated } from "@/lib/hooks/useHydrated"

export default function CartPage() {
  const router = useRouter()
  const { seller } = useSeller()
  const hydrated = useHydrated()

  useEffect(() => {
    if (hydrated && !seller) router.replace("/")
  }, [hydrated, seller, router])

  if (!hydrated || !seller) return null

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader title="Revisão do Pedido" backHref="/catalogo" />
      <CartContent />
    </div>
  )
}
