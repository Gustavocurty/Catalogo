"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSeller } from "@/lib/hooks/useSeller"
import { useCart } from "@/lib/hooks/useCart"

interface AppHeaderProps {
  backHref?: string
  title?: string
}

export function AppHeader({ backHref, title }: AppHeaderProps) {
  const router = useRouter()
  const { seller, clearSeller } = useSeller()
  const { clear: clearCart } = useCart()
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (headerRef.current) {
      const h = headerRef.current.offsetHeight
      document.documentElement.style.setProperty("--header-h", `${h}px`)
    }
  })

  function handleLogout() {
    clearCart()
    clearSeller()
    router.push("/")
  }

  return (
      <header ref={headerRef} className="sticky top-0 z-30 bg-brand-gradient text-white shadow-md">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        {backHref ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Voltar"
            onClick={() => router.push(backHref)}
            className="text-white hover:bg-white/15 hover:text-white"
          >
            <ArrowLeft />
          </Button>
        ) : null}

        <Image
          src="/attivus-light.svg"
          alt="Catálogo Attivus"
          width={150}
          height={40}
          priority
          className="h-8 w-auto"
        />

        <div className="ml-auto flex items-center gap-3">
          {seller && (
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{seller.name}</p>
              <p className="text-xs text-white/75 leading-tight">Cód. {seller.code}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Sair"
            onClick={handleLogout}
            className="text-white hover:bg-white/15 hover:text-white"
          >
            <LogOut />
          </Button>
        </div>
      </div>
      {title ? (
        <div className="mx-auto max-w-5xl px-4 pb-3">
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
      ) : null}
    </header>
  )
}
