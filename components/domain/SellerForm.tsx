"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"
import { useHydrated } from "@/lib/hooks/useHydrated"
import { useSeller } from "@/lib/hooks/useSeller"
import { useToast } from "@/components/ui/toast"
import { SELLER_CODE_PLACEHOLDER, sellerFromCode } from "@/lib/mocks"

export function SellerForm() {
  const router = useRouter()
  const hydrated = useHydrated()
  const { seller, setSeller } = useSeller()
  const { toast } = useToast()
  const [code, setCode] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (hydrated && seller?.id) router.replace("/perfil")
  }, [hydrated, router, seller?.id])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) {
      setError("Informe o código de acesso.")
      return
    }
    const current = sellerFromCode(code)
    setSeller(current)
    toast(`Bem-vindo, ${current.name.split(" ")[0]}!`)
    router.push("/perfil")
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="seller-code">Código de acesso</Label>
        <Input
          id="seller-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setError("")
          }}
          placeholder={SELLER_CODE_PLACEHOLDER}
          autoComplete="username"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" variant="action" className="mt-1 w-full">
        Entrar
        <ArrowRight />
      </Button>
    </form>
  )
}
