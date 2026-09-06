"use client"

import { Suspense, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppHeader } from "@/components/domain/AppHeader"
import { AuthGate } from "@/components/domain/AuthGate"
import { BottomNav } from "@/components/domain/BottomNav"

export function AppChrome({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname().replace(/\/$/, "") || "/"

  useEffect(() => {
    if (pathname === "/") return
    for (const href of ["/perfil", "/catalogo", "/clientes", "/pedidos", "/carrinho"]) {
      router.prefetch(href)
    }
  }, [pathname, router])

  if (pathname === "/") return <>{children}</>

  return (
    <div className="min-h-dvh">
      <Suspense fallback={<div className="h-14 bg-brand-gradient shadow-md lg:h-[6.75rem]" />}>
        <AppHeader />
      </Suspense>
      <AuthGate>
        <div key={pathname} className="page-enter pb-[calc(var(--bottom-nav-h,0px)+0.5rem)] lg:pb-0">
          {children}
        </div>
        <BottomNav />
      </AuthGate>
    </div>
  )
}
