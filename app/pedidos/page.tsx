"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { OrderDetail } from "@/components/domain/OrderDetail"
import { OrderList } from "@/components/domain/OrderList"

function OrdersScreen() {
  const id = useSearchParams().get("id")
  return id ? <OrderDetail orderId={id} /> : <OrderList />
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted-foreground" role="status">Carregando pedidos...</div>}>
      <OrdersScreen />
    </Suspense>
  )
}
