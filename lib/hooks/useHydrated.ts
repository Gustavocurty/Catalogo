"use client"

import { useEffect, useState } from "react"
import { useCartStore } from "@/lib/store/cartStore"
import { useOrderStore } from "@/lib/store/orderStore"
import { useSellerStore } from "@/lib/store/sellerStore"

let appHydrated = false

function storesHydrated() {
  return (
    useSellerStore.persist.hasHydrated() &&
    useCartStore.persist.hasHydrated() &&
    useOrderStore.persist.hasHydrated()
  )
}

export function useHydrated() {
  const [hydrated, setHydrated] = useState(appHydrated)

  useEffect(() => {
    if (appHydrated) {
      setHydrated(true)
      return
    }

    const done = () => {
      if (!storesHydrated()) return
      appHydrated = true
      setHydrated(true)
    }

    const unsubs = [
      useSellerStore.persist.onFinishHydration(done),
      useCartStore.persist.onFinishHydration(done),
      useOrderStore.persist.onFinishHydration(done),
    ]
    done()
    return () => {
      unsubs.forEach((unsub) => unsub())
    }
  }, [])

  return hydrated
}
