"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"
import { useSeller } from "@/lib/hooks/useSeller"
import { useToast } from "@/components/ui/toast"

export function SellerForm() {
  const router = useRouter()
  const { setSeller } = useSeller()
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !code.trim()) {
      setError("Preencha o nome e o código do vendedor.")
      return
    }
    setSeller({ name: name.trim(), code: code.trim() })
    toast(`Bem-vindo, ${name.trim().split(" ")[0]}!`)
    router.push("/catalogo")
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="seller-name">Nome do vendedor</Label>
        <Input
          id="seller-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError("")
          }}
          placeholder="Ex.: João da Silva"
          autoComplete="name"
        />
      </div>
      <div>
        <Label htmlFor="seller-code">Código do vendedor</Label>
        <Input
          id="seller-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setError("")
          }}
          placeholder="Ex.: VEND-042"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" variant="action" className="mt-1 w-full">
        Entrar no Catálogo
        <ArrowRight />
      </Button>
    </form>
  )
}
