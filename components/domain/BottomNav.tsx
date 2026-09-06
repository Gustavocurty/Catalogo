"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Boxes,
  Building2,
  ClipboardList,
  Ellipsis,
  LayoutGrid,
  ShoppingCart,
  UserRound,
} from "lucide-react"
import { AppMenu } from "@/components/domain/AppMenu"
import { activePrimaryTab, navVisibility, pathMatches } from "@/lib/config/nav"
import { useCart } from "@/lib/hooks/useCart"
import { useSeller } from "@/lib/hooks/useSeller"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { seller, clearSeller } = useSeller()
  const { clear: clearCart, totalItems } = useCart()
  const navRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const maisRef = useRef<HTMLButtonElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()
  const visible = navVisibility(seller)
  const tab = activePrimaryTab(pathname)

  const tabs = [
    { id: "perfil" as const, href: "/perfil", label: "Perfil", icon: UserRound, show: visible.perfil, badge: 0 },
    { id: "catalogo" as const, href: "/catalogo", label: "Catálogo", icon: LayoutGrid, show: visible.catalogo, badge: 0 },
    { id: "carrinho" as const, href: "/carrinho", label: "Carrinho", icon: ShoppingCart, show: visible.carrinho, badge: totalItems },
    { id: "pedidos" as const, href: "/pedidos", label: "Pedidos", icon: ClipboardList, show: visible.pedidos, badge: 0 },
  ].filter((item) => item.show)

  const moreLinks = [
    { href: "/clientes", label: "Clientes", icon: Building2, show: visible.clientes },
    { href: "/produtos", label: "Produtos", icon: Boxes, show: visible.produtos },
  ]
    .filter((item) => item.show)
    .map((item) => ({
      ...item,
      active: pathMatches(pathname, item.href),
    }))

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 64rem)")
    function onChange() {
      if (mq.matches) setMenuOpen(false)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    function applyHeight() {
      const hidden = window.matchMedia("(min-width: 64rem)").matches
      const height = hidden || !nav ? 0 : nav.offsetHeight
      document.documentElement.style.setProperty("--bottom-nav-h", `${height}px`)
    }

    applyHeight()
    const observer = new ResizeObserver(applyHeight)
    observer.observe(nav)
    window.addEventListener("resize", applyHeight)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", applyHeight)
      document.documentElement.style.setProperty("--bottom-nav-h", "0px")
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false)
        maisRef.current?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [menuOpen])

  if (!seller) return null

  function handleLogout() {
    setMenuOpen(false)
    clearCart()
    clearSeller()
    router.push("/")
  }

  function closeMenu() {
    setMenuOpen(false)
    maisRef.current?.focus()
  }

  const moreActive = tab === "more" || menuOpen

  return (
    <>
      <nav
        ref={navRef}
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 text-card-foreground shadow-[0_-8px_24px_-12px_rgb(107_63_160_/_28%)] backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-5xl items-stretch">
          {tabs.map((item) => {
            const Icon = item.icon
            const active = tab === item.id
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.7rem] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {active ? (
                  <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand-gradient" aria-hidden="true" />
                ) : null}
                <span className="relative">
                  <Icon
                    className="size-5"
                    aria-hidden="true"
                    strokeWidth={active ? 2.4 : 2}
                  />
                  {item.badge > 0 ? (
                    <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-brand-gradient px-1 text-center text-[0.6rem] font-semibold leading-4 text-white">
                      {String(item.badge).replace(".", ",")}
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            )
          })}
          <button
            ref={maisRef}
            type="button"
            aria-label={menuOpen ? "Fechar menu" : "Abrir mais opções"}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(
              "relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.7rem] font-medium",
              moreActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            {moreActive ? (
              <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand-gradient" aria-hidden="true" />
            ) : null}
            <Ellipsis
              className="size-5"
              aria-hidden="true"
              strokeWidth={moreActive ? 2.4 : 2}
            />
            <span>Mais</span>
          </button>
        </div>
      </nav>

      <AppMenu
        open={menuOpen}
        seller={seller}
        links={moreLinks}
        menuId={menuId}
        closeRef={closeRef}
        onClose={closeMenu}
        onLogout={handleLogout}
      />
    </>
  )
}
