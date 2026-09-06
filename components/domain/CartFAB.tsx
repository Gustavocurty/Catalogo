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
        "hover-lift fixed right-4 z-30 flex max-w-[calc(100vw-2.5rem)] flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-3xl bg-brand-gradient px-4 py-3 text-white shadow-xl hover:brightness-110 active:scale-95 lg:right-5",
        "bottom-[calc(var(--bottom-nav-h,0px)+0.75rem)] lg:bottom-5",
        bump && "-translate-y-1",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <ShoppingCart className="size-6 shrink-0" aria-hidden="true" />
        <span className="min-w-5 break-all rounded-full bg-white px-2 text-center text-xs font-bold tabular-nums text-accent">
          {String(count).replace(".", ",")}
        </span>
      </span>
      <span className="min-w-0 break-all text-xs font-semibold sm:text-sm">{formatCurrency(subtotal)}</span>
    </button>
  )
}
