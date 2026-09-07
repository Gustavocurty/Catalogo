"use client"

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Download, Mail, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { generateOrderPdf } from "@/lib/utils/generatePdf"
import {
  canUseNativeShare,
  mailtoOrderUrl,
  shareOrderNative,
} from "@/lib/utils/shareOrder"
import { cn } from "@/lib/utils"
import type { Order } from "@/lib/types"

interface OrderShareProps {
  order: Order
  compact?: boolean
  align?: "start" | "end"
  fullWidth?: boolean
}

export function OrderShare({ order, compact = false, align, fullWidth = false }: OrderShareProps) {
  const { toast } = useToast()
  const [generating, setGenerating] = useState(false)
  const [nativeShare, setNativeShare] = useState(false)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const size = compact ? "sm" : "default"
  const menuAlign = align ?? (compact ? "start" : "end")

  useEffect(() => {
    setNativeShare(canUseNativeShare())
  }, [])

  useLayoutEffect(() => {
    if (!open) return

    function placeMenu() {
      const button = buttonRef.current
      const menu = menuRef.current
      if (!button) return
      const rect = button.getBoundingClientRect()
      const width = fullWidth ? rect.width : Math.min(18 * 16, window.innerWidth - 16)
      const height = menu?.offsetHeight ?? 180
      const gap = 4
      const spaceBelow = window.innerHeight - rect.bottom - 12
      const openUp = spaceBelow < height && rect.top > height + gap
      const top = openUp ? rect.top - height - gap : rect.bottom + gap
      const preferredLeft = menuAlign === "end" ? rect.right - width : rect.left
      const left = Math.max(8, Math.min(preferredLeft, window.innerWidth - width - 8))
      setCoords({ top, left, width })
    }

    placeMenu()
    const frame = requestAnimationFrame(placeMenu)
    window.addEventListener("resize", placeMenu)
    window.addEventListener("scroll", placeMenu, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", placeMenu)
      window.removeEventListener("scroll", placeMenu, true)
    }
  }, [open, fullWidth, menuAlign, nativeShare])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  async function pdfFile() {
    const pdf = await generateOrderPdf(order)
    const blob = pdf.output("blob")
    return new File([blob], `pedido-${order.number}.pdf`, { type: "application/pdf" })
  }

  async function handleNativeShare() {
    setOpen(false)
    setGenerating(true)
    try {
      let file: File | undefined
      try {
        file = await pdfFile()
      } catch {
        file = undefined
      }
      if (canUseNativeShare()) {
        await shareOrderNative(order, file)
        return
      }
      const pdf = await generateOrderPdf(order)
      pdf.save(`pedido-${order.number}.pdf`)
      toast("PDF baixado. Envie pelo app que preferir.")
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return
      try {
        const pdf = await generateOrderPdf(order)
        pdf.save(`pedido-${order.number}.pdf`)
        toast("PDF baixado. Envie pelo app que preferir.")
      } catch {
        toast(cause instanceof Error ? cause.message : "Não foi possível compartilhar o pedido.", "info")
      }
    } finally {
      setGenerating(false)
    }
  }

  async function handlePdf() {
    setOpen(false)
    setGenerating(true)
    try {
      const pdf = await generateOrderPdf(order)
      pdf.save(`pedido-${order.number}.pdf`)
      toast("PDF gerado com sucesso!")
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Não foi possível gerar o PDF.", "info")
    } finally {
      setGenerating(false)
    }
  }

  function openShare(url: string, label: string) {
    setOpen(false)
    window.open(url, "_blank", "noopener,noreferrer")
    toast(`Abrindo ${label}...`)
  }

  const menu = open ? (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-label="Opções de compartilhamento"
      style={{ top: coords.top, left: coords.left, width: coords.width }}
      className={cn(
        "fixed z-[60] overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg",
        coords.width <= 0 && "invisible",
      )}
    >
      <ShareMenuItem onClick={handleNativeShare} disabled={generating}>
        <Share2 />
        Outros apps
      </ShareMenuItem>
      <ShareMenuItem onClick={() => openShare(mailtoOrderUrl(order), "e-mail")}>
        <Mail />
        E-mail
      </ShareMenuItem>
      <ShareMenuItem onClick={handlePdf} disabled={generating}>
        <Download />
        {generating ? "Gerando PDF..." : "Baixar PDF"}
      </ShareMenuItem>
    </div>
  ) : null

  return (
    <div ref={rootRef} className={cn("relative", fullWidth && "w-full")}>
      <Button
        ref={buttonRef}
        variant="action"
        size={size}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`Compartilhar pedido ${order.number}`}
        disabled={generating}
        className={cn(fullWidth && "w-full")}
        onClick={() => setOpen((current) => !current)}
      >
        <Share2 />
        {generating ? "Preparando..." : "Compartilhar"}
        <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
      </Button>
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </div>
  )
}

function ShareMenuItem({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-popover-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0"
    >
      {children}
    </button>
  )
}
