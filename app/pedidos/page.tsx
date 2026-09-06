"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { OrderDetail } from "@/components/domain/OrderDetail"
import { OrderList } from "@/components/domain/OrderList"

function OrdersScreen() {
  const search = useSearchParams()
  const id = search.get("id")
  const status = search.get("status") ?? ""
  return id ? <OrderDetail orderId={id} /> : <OrderList initialStatus={status} />
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted-foreground" role="status">Carregando pedidos...</div>}>
      <OrdersScreen />
    </Suspense>
  )
}
