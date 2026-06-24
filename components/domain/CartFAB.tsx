"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils/format"

interface CartFABProps {
  count: number
  subtotal: number
}

export function CartFAB({ count, subtotal }: CartFABProps) {
  const router = useRouter()
  const [bump, setBump] = useState(false)
  const prev = useRef(count)

  useEffect(() => {
    if (count !== prev.current) {
      setBump(true)
      const t = setTimeout(() => setBump(false), 300)
      prev.current = count
      return () => clearTimeout(t)
    }
  }, [count])

  if (count === 0) return null

  return (
    <button
      type="button"
      onClick={() => router.push("/carrinho")}
      aria-label={`Abrir carrinho com ${count} ${count === 1 ? "item" : "itens"}`}
      className={cn(
        "fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full bg-accent py-3 pl-4 pr-5 text-accent-foreground shadow-xl transition-transform hover:bg-accent/90 active:scale-95",
        bump && "scale-110",
      )}
    >
      <span className="relative">
        <ShoppingCart className="size-6" />
        <span className="absolute -right-2 -top-2 flex min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-accent">
          {count}
        </span>
      </span>
      <span className="text-sm font-semibold">{formatCurrency(subtotal)}</span>
    </button>
  )
}
