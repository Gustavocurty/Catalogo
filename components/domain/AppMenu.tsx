"use client"

import type { RefObject } from "react"
import Link from "next/link"
import { LogOut, X, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ROLE_LABEL } from "@/lib/config/nav"
import { cn } from "@/lib/utils"
import type { Seller } from "@/lib/types"

export interface AppMenuLink {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
}

interface AppMenuProps {
  open: boolean
  seller: Seller
  links: AppMenuLink[]
  menuId: string
  closeRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onLogout: () => void
}

export function AppMenu({ open, seller, links, menuId, closeRef, onClose, onLogout }: AppMenuProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Fechar menu"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-label="Mais opções"
        className="absolute inset-y-0 right-0 flex w-[min(20rem,calc(100%-2.5rem))] flex-col bg-background text-foreground shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border bg-brand-gradient px-4 py-4 text-white">
          <div className="min-w-0">
            <p className="truncate font-semibold">{seller.name}</p>
            <p className="truncate text-sm text-white/80">
              {ROLE_LABEL[seller.role]} · Cód. {seller.code}
            </p>
          </div>
          <Button
            ref={closeRef}
            variant="ghost"
            size="icon-sm"
            aria-label="Fechar menu"
            onClick={onClose}
            className="shrink-0 text-white hover:bg-white/15 hover:text-white"
          >
            <X />
          </Button>
        </div>

        <nav aria-label="Outros módulos" className="flex-1 overflow-y-auto p-3">
          {links.length > 0 ? (
            <>
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Módulos</p>
              <ul className="space-y-1">
                {links.map((link) => {
                  const Icon = link.icon
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className={cn(
                          "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                          link.active ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-muted",
                        )}
                      >
                        <Icon className="size-5 shrink-0 text-accent" aria-hidden="true" />
                        <span className="flex-1">{link.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <p className="px-2 text-sm text-muted-foreground">Conta e opções da sessão.</p>
          )}
        </nav>

        <div className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" className="w-full min-h-11" onClick={onLogout}>
            <LogOut />
            Sair
          </Button>
        </div>
      </div>
    </div>
  )
}
