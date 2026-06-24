"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, FilePlus2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrderNote } from "@/components/domain/OrderNote"
import { useOrder } from "@/lib/hooks/useOrder"
import { useCart } from "@/lib/hooks/useCart"
import { useSeller } from "@/lib/hooks/useSeller"
import { useHydrated } from "@/lib/hooks/useHydrated"
import { useToast } from "@/components/ui/toast"
import { generateOrderPdf } from "@/lib/utils/generatePdf"

export function OrderView() {
  const router = useRouter()
  const { toast } = useToast()
  const { seller } = useSeller()
  const { lastOrder, resetOrderForm } = useOrder()
  const { clear } = useCart()
  const hydrated = useHydrated()
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (hydrated && !seller) router.replace("/")
    else if (hydrated && !lastOrder) router.replace("/catalogo")
  }, [hydrated, seller, lastOrder, router])

  if (!hydrated || !seller || !lastOrder) return null

  async function handleDownload() {
    setGenerating(true)
    try {
      const pdf = await generateOrderPdf(lastOrder!)
      pdf.save(`${lastOrder!.id}.pdf`)
      toast("PDF gerado com sucesso!")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[v0] Erro ao gerar PDF:", message)
      toast(`Não foi possível gerar o PDF. ${message}`, "info")
    } finally {
      setGenerating(false)
    }
  }

  function handleNewOrder() {
    clear()
    resetOrderForm()
    toast("Pronto para um novo pedido!")
    router.push("/catalogo")
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 pb-28">
      {/* Ações */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Button variant="action" size="lg" onClick={handleDownload} disabled={generating}>
          <Download />
          {generating ? "Gerando PDF..." : "Baixar PDF"}
        </Button>
        <Button variant="outline" size="lg" onClick={handleNewOrder}>
          <FilePlus2 />
          Novo Pedido
        </Button>
      </div>

      {/* Nota imprimível */}
      <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
        <OrderNote order={lastOrder} />
      </div>
    </div>
  )
}
