"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { FilePlus2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrderNote } from "@/components/domain/OrderNote"
import { OrderShare } from "@/components/domain/OrderShare"
import { useOrder } from "@/lib/hooks/useOrder"
import { useCart } from "@/lib/hooks/useCart"
import { useSeller } from "@/lib/hooks/useSeller"
import { useHydrated } from "@/lib/hooks/useHydrated"
import { useToast } from "@/components/ui/toast"

export function OrderView() {
  const router = useRouter()
  const { toast } = useToast()
  const { seller } = useSeller()
  const { lastOrder, resetOrderForm } = useOrder()
  const { clear } = useCart()
  const hydrated = useHydrated()
  useEffect(() => {
    if (hydrated && !seller) router.replace("/")
    else if (hydrated && !lastOrder) router.replace("/perfil")
  }, [hydrated, seller, lastOrder, router])

  if (!hydrated || !seller || !lastOrder) return null

  function handleNewOrder() {
    clear()
    resetOrderForm()
    toast("Pronto para um novo pedido!")
    router.push("/catalogo")
  }

  return (
    <div className="mx-auto max-w-5xl space-y-3 px-3 py-4 pb-28 sm:space-y-4 sm:px-4 sm:py-5">
      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        <OrderShare order={lastOrder} fullWidth />
        <Button variant="outline" size="lg" className="w-full" onClick={handleNewOrder}>
          <FilePlus2 />
          Novo pedido
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <OrderNote order={lastOrder} />
        </div>
      </div>
    </div>
  )
}
