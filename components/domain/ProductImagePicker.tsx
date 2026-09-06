"use client"

import { useEffect, useId, useState } from "react"
import { ImagePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"
import { useSeller } from "@/lib/hooks/useSeller"

interface ProductImagePickerProps {
  value: string | null
  onChange: (imageUrl: string | null) => void
  onPendingChange: (pending: boolean) => void
  disabled?: boolean
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem."))
    reader.readAsDataURL(file)
  })
}

export function ProductImagePicker({ value, onChange, onPendingChange, disabled }: ProductImagePickerProps) {
  const { seller } = useSeller()
  const id = useId()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const locked = disabled || pending || seller?.role !== "ADMIN"

  useEffect(() => () => onPendingChange(false), [onPendingChange])

  async function upload(image: File) {
    if (locked) return
    setError("")
    if (!["image/jpeg", "image/png", "image/webp"].includes(image.type) || image.size > 1024 * 1024 || image.size === 0) {
      setError("Escolha uma imagem JPEG, PNG ou WebP de ate 1 MB.")
      return
    }
    setPending(true)
    onPendingChange(true)
    try {
      onChange(await readFile(image))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nao foi possivel carregar a imagem.")
    } finally {
      setPending(false)
      onPendingChange(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3" aria-busy={pending}>
      <Label htmlFor={id}>Foto do produto</Label>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
          {value ? <img src={value} alt="Previa da foto do produto" className="size-full object-contain" /> : <ImagePlus className="size-8 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={locked}
            className="h-auto py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-secondary-foreground"
            aria-describedby={`${id}-help`}
            onChange={(event) => {
              const selected = event.target.files?.[0]
              event.target.value = ""
              if (selected) void upload(selected)
            }}
          />
          <p id={`${id}-help`} className="text-xs text-muted-foreground">
            JPEG, PNG ou WebP ate 1 MB. A foto fica no cache do navegador. Salve o produto para confirmar.
          </p>
          {value && (
            <Button size="sm" variant="outline" disabled={locked} onClick={() => { onChange(null); setError("") }}>
              Remover foto
            </Button>
          )}
        </div>
      </div>
      {pending && <p role="status" className="text-sm text-muted-foreground">Carregando foto...</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
