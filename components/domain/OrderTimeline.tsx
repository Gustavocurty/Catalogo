"use client"

import { Check } from "lucide-react"
import {
  ORDER_PIPELINE,
  ORDER_STATUS_HINTS,
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
      <ol className={cn("flex", compact ? "items-start" : "flex-col sm:flex-row sm:items-start")}>
        {ORDER_PIPELINE.map((step, index) => {
          const done = !cancelled && current > index
          const active = !cancelled && current === index
          const upcoming = cancelled || current < index
          const canAdvance = interactive && !busy && !cancelled && next === step
          const label = compact ? ORDER_STATUS_SHORT[step] : ORDER_STATUS_LABELS[step]
          const last = index === ORDER_PIPELINE.length - 1

          return (
            <li
              key={step}
              className={cn(
                "relative flex",
                compact ? "min-w-0 flex-1 flex-col items-center" : "sm:min-w-0 sm:flex-1 sm:flex-col sm:items-center",
              )}
            >
              {!compact && !last ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-[15px] top-8 h-[calc(100%-0.5rem)] w-0.5 sm:hidden",
                    done ? "bg-brand-gradient" : "bg-border",
                  )}
                />
              ) : null}
              <div className={cn("flex items-center", compact ? "w-full" : "sm:w-full")}>
                {index > 0 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      compact ? "h-0.5 flex-1" : "hidden h-0.5 flex-1 sm:block",
                      done || active ? "bg-brand-gradient" : "bg-border",
                    )}
                  />
                ) : (
                  <span className={cn(compact ? "flex-1" : "hidden flex-1 sm:block")} />
                )}
                {canAdvance ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onAdvance?.(step)}
                    aria-label={`Avançar para ${ORDER_STATUS_LABELS[step]}`}
                    className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-accent bg-background text-xs font-semibold text-accent hover:bg-accent hover:text-accent-foreground sm:size-9"
                  >
                    {index + 1}
                  </button>
                ) : (
                  <span
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold sm:size-9",
                      done && "border-transparent bg-brand-gradient text-white",
                      active && "border-accent bg-accent text-accent-foreground shadow",
                      upcoming && "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
                  </span>
                )}
                {!last ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      compact ? "h-0.5 flex-1" : "hidden h-0.5 flex-1 sm:block",
                      done ? "bg-brand-gradient" : "bg-border",
                    )}
                  />
                ) : (
                  <span className={cn(compact ? "flex-1" : "hidden flex-1 sm:block")} />
                )}
              </div>
              <div className={cn("min-w-0 px-0.5 text-center", compact ? "mt-2" : "ml-3 mt-0 pb-5 sm:ml-0 sm:mt-2 sm:pb-0")}>
                <p className={cn(
                  "font-medium leading-tight text-pretty",
                  compact ? "text-[0.65rem] sm:text-[0.7rem]" : "text-sm",
                  active ? "text-foreground" : "text-muted-foreground",
                )}>
                  {label}
                </p>
                {!compact ? (
                  <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{ORDER_STATUS_HINTS[step]}</p>
                ) : null}
              </div>
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
