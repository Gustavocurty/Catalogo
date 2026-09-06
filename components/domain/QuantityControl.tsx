"use client"

import { useId, useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MAX_QUANTITY, normalizeQuantity, parseQuantity, validateQuantity } from "@/lib/utils/quantity"

interface QuantityControlProps {
  value: number
  onChange: (quantity: number) => void
  min?: number
  max?: number
  step?: number
  label: string
  disabled?: boolean
  onIncrement?: () => void
  onDecrement?: () => void
}

export function QuantityControl({
  value, onChange, min = 1, max = MAX_QUANTITY, step = 1, label, disabled = false,
  onIncrement, onDecrement,
}: QuantityControlProps) {
  const id = useId()
  const [draft, setDraft] = useState<{ value: number; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const text = draft?.value === value ? draft.text : String(value).replace(".", ",")
  const next = normalizeQuantity(value + step)
  const previous = normalizeQuantity(value - step)

  function commit() {
    if (disabled || draft?.value !== value) return
    const quantity = parseQuantity(text, step)
    const message = validateQuantity(quantity, { min, max, step })
    setError(message)
    if (message) return
    setDraft(null)
    if (quantity !== value) onChange(normalizeQuantity(quantity))
  }

  function adjust(increase: boolean) {
    setDraft(null)
    setError(null)
    if (increase && onIncrement) onIncrement()
    else if (!increase && onDecrement) onDecrement()
    else onChange(increase ? next : previous)
  }

  return (
    <div className="min-w-0 w-full">
      <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7 text-primary hover:bg-background sm:size-9"
          aria-label={`Diminuir ${label}`}
          disabled={disabled || (!onDecrement && !!validateQuantity(previous, { min, max, step }))}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => adjust(false)}
        >
          <Minus />
        </Button>
        <input
          id={id}
          type="text"
          inputMode={step < 1 ? "decimal" : "numeric"}
          autoComplete="off"
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={disabled}
          value={text}
          onChange={(event) => {
            setDraft({ value, text: event.target.value })
            setError(null)
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              event.currentTarget.blur()
            } else if (event.key === "Escape") {
              event.preventDefault()
              setDraft(null)
              setError(null)
            }
          }}
          className="h-9 w-full min-w-0 flex-1 rounded border border-transparent bg-transparent px-0 text-center text-xs font-semibold tabular-nums text-foreground outline-none focus:border-ring focus:bg-background disabled:opacity-50 sm:text-sm"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7 text-primary hover:bg-background sm:size-9"
          aria-label={`Aumentar ${label}`}
          disabled={disabled || !!validateQuantity(next, { min, max, step })}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => adjust(true)}
        >
          <Plus />
        </Button>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
