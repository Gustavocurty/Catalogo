"use client"

import { useMemo } from "react"
import { useCartStore } from "@/lib/store/cartStore"

export function useCart() {
  const items = useCartStore((s) => s.items)
  const addItem = useCartStore((s) => s.addItem)
  const removeOne = useCartStore((s) => s.removeOne)
  const setQuantity = useCartStore((s) => s.setQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clear = useCartStore((s) => s.clear)
  const getQuantity = useCartStore((s) => s.getQuantity)

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    [items],
  )

  return { items, addItem, removeOne, setQuantity, removeItem, clear, getQuantity, totalItems, subtotal }
}
