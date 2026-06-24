"use client"

import { useOrderStore } from "@/lib/store/orderStore"

export function useOrder() {
  const customer = useOrderStore((s) => s.customer)
  const notes = useOrderStore((s) => s.notes)
  const discountPercent = useOrderStore((s) => s.discountPercent)
  const lastOrder = useOrderStore((s) => s.lastOrder)
  const setCustomer = useOrderStore((s) => s.setCustomer)
  const setNotes = useOrderStore((s) => s.setNotes)
  const setDiscountPercent = useOrderStore((s) => s.setDiscountPercent)
  const setLastOrder = useOrderStore((s) => s.setLastOrder)
  const resetOrderForm = useOrderStore((s) => s.resetOrderForm)

  return {
    customer,
    notes,
    discountPercent,
    lastOrder,
    setCustomer,
    setNotes,
    setDiscountPercent,
    setLastOrder,
    resetOrderForm,
  }
}
