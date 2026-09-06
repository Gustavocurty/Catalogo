"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useHydrated } from "@/lib/hooks/useHydrated"
import { useSeller } from "@/lib/hooks/useSeller"
import type { Seller } from "@/lib/types"

export function RoleGuard({ children, roles }: { children: React.ReactNode; roles: Seller["role"][] }) {
  const router = useRouter()
  const hydrated = useHydrated()
  const { seller } = useSeller()
  const allowed = !!seller && roles.includes(seller.role)

  useEffect(() => {
    if (hydrated && seller && !roles.includes(seller.role)) router.replace("/perfil")
  }, [hydrated, roles, router, seller])

  if (!hydrated || !allowed) {
    return <div className="mx-auto max-w-5xl px-4 py-8" role="status" aria-live="polite">Carregando...</div>
  }

  return <>{children}</>
}
