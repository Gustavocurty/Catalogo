"use client"

import { Check, ChevronRight } from "lucide-react"
import {
  ORDER_PIPELINE,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_SHORT,
  nextPipelineStatus,
  pipelineIndex,
} from "@/lib/config/orders"
import { cn } from "@/lib/utils"
import type { OrderStatus } from "@/lib/types"

interface OrderTimelineProps {
  status: OrderStatus
  interactive?: boolean
  busy?: boolean
  compact?: boolean
  onAdvance?: (status: OrderStatus) => void
}

export function OrderTimeline({ status, interactive = false, busy = false, compact = false, onAdvance }: OrderTimelineProps) {
  const current = pipelineIndex(status)
  const cancelled = status === "CANCELLED"
  const next = nextPipelineStatus(status)

  return (
    <div>
      <p className="mb-3 text-sm">
        <span className="text-muted-foreground">Etapa atual: </span>
        <span className={cn("font-semibold", cancelled ? "text-destructive" : "text-foreground")}>
          {ORDER_STATUS_LABELS[status]}
        </span>
      </p>
      {cancelled ? (
        <p className="mb-3 text-sm font-medium text-destructive">Pedido cancelado. A linha do tempo foi encerrada.</p>
      ) : null}
      <ol className="flex items-start">
        {ORDER_PIPELINE.map((step, index) => {
          const done = !cancelled && current > index
          const active = !cancelled && current === index
          const upcoming = cancelled || current < index
          const canAdvance = interactive && !busy && !cancelled && next === step
          const last = index === ORDER_PIPELINE.length - 1
          const label = compact ? ORDER_STATUS_SHORT[step] : ORDER_STATUS_LABELS[step]

          return (
            <li key={step} className="flex min-w-0 flex-1 items-start">
              <div className="flex min-w-0 flex-1 flex-col items-center">
                {canAdvance ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onAdvance?.(step)}
                    aria-label={`Avançar para ${ORDER_STATUS_LABELS[step]}`}
                    className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-accent bg-background text-[0.65rem] font-semibold text-accent hover:bg-accent hover:text-accent-foreground sm:size-8 sm:text-xs"
                  >
                    {index + 1}
                  </button>
                ) : (
                  <span
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[0.65rem] font-semibold sm:size-8 sm:text-xs",
                      done && "border-transparent bg-brand-gradient text-white",
                      active && "border-accent bg-accent text-accent-foreground shadow",
                      upcoming && "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                  </span>
                )}
                <p
                  className={cn(
                    "mt-1.5 max-w-full px-0.5 text-center font-medium leading-tight text-pretty",
                    compact ? "text-[0.65rem] sm:text-[0.7rem]" : "text-[0.65rem] sm:text-xs",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="sm:hidden">{ORDER_STATUS_SHORT[step]}</span>
                  <span className="hidden sm:inline">{label}</span>
                </p>
              </div>
              {!last ? (
                <ChevronRight
                  aria-hidden="true"
                  className={cn(
                    "-mx-0.5 mt-1.5 size-4 shrink-0 sm:mt-2 sm:size-5",
                    done || active ? "text-accent" : "text-muted-foreground/50",
                  )}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
      {interactive && next ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Toque na próxima etapa para avançar para <span className="font-medium text-foreground">{ORDER_STATUS_LABELS[next]}</span>.
        </p>
      ) : null}
    </div>
  )
}
