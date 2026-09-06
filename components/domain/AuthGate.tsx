"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useHydrated } from "@/lib/hooks/useHydrated"
import { useSeller } from "@/lib/hooks/useSeller"
import type { Seller } from "@/lib/types"

interface AuthGateProps {
  children: React.ReactNode
  roles?: Seller["role"][]
}

export function AuthGate({ children, roles }: AuthGateProps) {
  const router = useRouter()
  const hydrated = useHydrated()
  const { seller } = useSeller()
  const allowedRoles = roles?.join(",") ?? ""
  const allowed = !!seller && (!allowedRoles || allowedRoles.split(",").includes(seller.role))

  useEffect(() => {
    if (!hydrated) return
    if (!seller) {
      router.replace("/")
      return
    }
    if (allowedRoles && !allowedRoles.split(",").includes(seller.role)) router.replace("/perfil")
  }, [allowedRoles, hydrated, router, seller])

  if (!hydrated || !allowed) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-6" role="status" aria-live="polite">
        <div className="h-8 w-52 animate-pulse rounded-lg bg-secondary" />
        <div className="h-32 animate-pulse rounded-xl bg-secondary" />
        <div className="h-32 animate-pulse rounded-xl bg-secondary" />
      </div>
    )
  }

  return <>{children}</>
}
