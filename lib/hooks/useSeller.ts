"use client"

import { useSellerStore } from "@/lib/store/sellerStore"

export function useSeller() {
  const seller = useSellerStore((s) => s.seller)
  const setSeller = useSellerStore((s) => s.setSeller)
  const clearSeller = useSellerStore((s) => s.clearSeller)
  return { seller, setSeller, clearSeller }
}
