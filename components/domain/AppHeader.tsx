"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/domain/ThemeToggle"
import { BRAND } from "@/lib/config/brand"
import { navVisibility, pathMatches, ROLE_LABEL } from "@/lib/config/nav"
import { pageChrome } from "@/lib/config/pages"
import { useSeller } from "@/lib/hooks/useSeller"
import { useCart } from "@/lib/hooks/useCart"
import { cn } from "@/lib/utils"

export function AppHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const { title, backHref } = pageChrome(pathname, search)
  const { seller, clearSeller } = useSeller()
  const { clear: clearCart, totalItems } = useCart()
  const headerRef = useRef<HTMLElement>(null)
  const visible = navVisibility(seller)

  const links = [
    { href: "/perfil", label: "Perfil", show: visible.perfil, badge: 0 },
    { href: "/catalogo", label: "Catálogo", show: visible.catalogo, badge: 0 },
    { href: "/clientes", label: "Clientes", show: visible.clientes, badge: 0 },
    { href: "/pedidos", label: "Pedidos", show: visible.pedidos, badge: 0 },
    { href: "/produtos", label: "Produtos", show: visible.produtos, badge: 0 },
    { href: "/carrinho", label: "Carrinho", show: visible.carrinho, badge: totalItems },
  ].filter((link) => link.show)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const update = () => {
      document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function handleLogout() {
    clearCart()
    clearSeller()
    router.push("/")
  }

  return (
    <header ref={headerRef} className="sticky top-0 z-30 bg-brand-gradient text-white shadow-md">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        {backHref ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Voltar"
            onClick={() => router.push(backHref)}
            className="shrink-0 text-white hover:bg-white/15 hover:text-white"
          >
            <ArrowLeft />
          </Button>
        ) : null}

        <Link href={seller ? "/perfil" : "/"} className="shrink-0">
          <Image
            src={BRAND.logoLight}
            alt="Catálogo Attivus"
            width={150}
            height={40}
            priority
            className="h-7 w-auto sm:h-8"
          />
        </Link>

        {title ? (
          <div className="min-w-0 flex-1 border-l border-white/20 pl-2.5 sm:pl-3">
            <h1 className="truncate text-sm font-semibold leading-tight sm:text-base">{title}</h1>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {seller ? (
            <div className="hidden text-right xl:block">
              <p className="text-sm font-medium leading-tight">{seller.name}</p>
              <p className="text-xs leading-tight text-white/75">
                {ROLE_LABEL[seller.role]} · Cód. {seller.code}
              </p>
            </div>
          ) : null}
          <ThemeToggle onBrand />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Sair"
            onClick={handleLogout}
            className="hidden text-white hover:bg-white/15 hover:text-white lg:inline-flex"
          >
            <LogOut />
          </Button>
        </div>
      </div>

      {seller ? (
        <nav aria-label="Módulos" className="hidden border-t border-white/15 lg:block">
          <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {links.map((link) => {
              const active = pathMatches(pathname, link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                    active ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {link.label}
                  {link.badge > 0 ? (
                    <span className="rounded-full bg-white/25 px-1.5 text-[0.7rem] font-semibold tabular-nums">
                      {String(link.badge).replace(".", ",")}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </div>
        </nav>
      ) : null}
    </header>
  )
}
