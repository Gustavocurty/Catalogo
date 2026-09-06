"use client"

import { useCartStore } from "@/lib/store/cartStore"
import { useOrder } from "@/lib/hooks/useOrder"
import { useSeller } from "@/lib/hooks/useSeller"
import { normalizeQuantity } from "@/lib/utils/quantity"
import type { Product } from "@/lib/types"

export function useCart() {
  const items = useCartStore((s) => s.items)
  const storeAddItem = useCartStore((s) => s.addItem)
  const removeOne = useCartStore((s) => s.removeOne)
  const storeSetQuantity = useCartStore((s) => s.setQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clear = useCartStore((s) => s.clear)
  const getQuantity = useCartStore((s) => s.getQuantity)

  const { customer } = useOrder()
  const { seller } = useSeller()
  const canAdd = !!seller && seller.role !== "OPERATIONS" && !!customer.id && customer.active !== false

  function addItem(product: Product) {
    if (canAdd) storeAddItem(product)
  }

  function setQuantity(productId: string, quantity: number) {
    if (canAdd || quantity <= getQuantity(productId)) storeSetQuantity(productId, quantity)
  }

  const totalItems = normalizeQuantity(items.reduce((sum, i) => sum + i.quantity, 0))
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)

  return { items, addItem, removeOne, setQuantity, removeItem, clear, getQuantity, totalItems, subtotal }
}
