"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { ChevronDown, Download, Mail, MessageCircle, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { generateOrderPdf } from "@/lib/utils/generatePdf"
import {
  canUseNativeShare,
  mailtoOrderUrl,
  shareOrderNative,
  whatsappOrderUrl,
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
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const size = compact ? "sm" : "default"
  const menuAlign = align ?? (compact ? "start" : "end")

  useEffect(() => {
    setNativeShare(canUseNativeShare())
  }, [])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
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
      await shareOrderNative(order, file)
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return
      window.open(whatsappOrderUrl(order), "_blank", "noopener,noreferrer")
      toast("Abrindo WhatsApp...", "info")
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

  return (
    <div ref={rootRef} className={cn("relative", fullWidth && "w-full")}>
      <Button
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
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Opções de compartilhamento"
          className={cn(
            "absolute z-40 mt-1 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg",
            fullWidth ? "inset-x-0 w-auto min-w-0" : "w-[min(18rem,calc(100vw-2rem))]",
            !fullWidth && (menuAlign === "end" ? "right-0" : "left-0"),
          )}
        >
          {nativeShare ? (
            <ShareMenuItem onClick={handleNativeShare} disabled={generating}>
              <Share2 />
              Outros apps
            </ShareMenuItem>
          ) : null}
          <ShareMenuItem onClick={() => openShare(whatsappOrderUrl(order), "WhatsApp")}>
            <MessageCircle />
            WhatsApp
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
      ) : null}
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
