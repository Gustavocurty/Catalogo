"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/domain/AppHeader"
import { OrderView } from "@/components/domain/OrderView"
import { useSeller } from "@/lib/hooks/useSeller"
import { useOrder } from "@/lib/hooks/useOrder"
import { useHydrated } from "@/lib/hooks/useHydrated"

export default function OrderPage() {
  const router = useRouter()
  const { seller } = useSeller()
  const { lastOrder } = useOrder()
  const hydrated = useHydrated()

  useEffect(() => {
    if (hydrated && !seller) router.replace("/")
    else if (hydrated && !lastOrder) router.replace("/catalogo")
  }, [hydrated, seller, lastOrder, router])

  if (!hydrated || !seller || !lastOrder) return null

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader title="Nota do Pedido" backHref="/carrinho" />
      <OrderView />
    </div>
  )
}
