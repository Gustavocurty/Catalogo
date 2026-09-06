"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Package, Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label, Textarea } from "@/components/ui/input"
import { useSeller } from "@/lib/hooks/useSeller"
import { ApiError } from "@/lib/local/errors"
import { productService } from "@/lib/services/productService"
import type { Product, StockMovement } from "@/lib/types"
import { ProductForm } from "./ProductForm"

const quantity = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 })
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

function StockPanel({ product, onSaved, onClose, onReload }: {
  product: Product
  onSaved: (product: Product) => void
  onClose: () => void
  onReload: () => void
}) {
  const { seller } = useSeller()
  const canAdjust = seller?.role === "ADMIN" || seller?.role === "OPERATIONS"
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [historyError, setHistoryError] = useState("")
  const [reload, setReload] = useState(0)
  const [delta, setDelta] = useState("")
  const [reason, setReason] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [conflict, setConflict] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setHistoryError("")
    productService.listStock(product.id)
      .then((data) => { if (!controller.signal.aborted) setMovements(data) })
      .catch((cause) => { if (!controller.signal.aborted) setHistoryError(cause instanceof Error ? cause.message : "Nao foi possivel carregar o historico.") })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [product.id, product.version, reload])

  const parsedDelta = Number(delta)
  const validDelta = delta.trim() !== "" && Number.isFinite(parsedDelta) && parsedDelta !== 0
  const physicalAfter = product.physicalStock == null ? null : Number((product.physicalStock + parsedDelta).toFixed(3))
  const availableAfter = Number((product.stock + parsedDelta).toFixed(3))

  async function adjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || conflict || !canAdjust) return
    setNotice("")
    if (product.version == null) {
      setConflict(true)
      setError("Produto sem revisao. Recarregue os produtos antes de ajustar o estoque.")
      return
    }
    if (!validDelta || !reason.trim()) {
      setError("Informe uma quantidade diferente de zero e o motivo do ajuste.")
      return
    }
    if (availableAfter < 0 || (physicalAfter != null && physicalAfter < 0)) {
      setError("A retirada nao pode deixar saldo negativo nem consumir o estoque reservado.")
      return
    }
    if (!window.confirm(`Confirmar ${parsedDelta > 0 ? "entrada" : "saida"} de ${quantity.format(Math.abs(parsedDelta))} ${product.unit} de ${product.name}? Disponivel previsto: ${quantity.format(availableAfter)} ${product.unit}. Motivo: ${reason.trim()}. Revisao: ${product.version}.`)) return
    setPending(true)
    setError("")
    try {
      const updated = await productService.adjustStock(product.id, {
        delta: parsedDelta,
        reason: reason.trim(),
        version: product.version!,
      }, seller?.name ?? "Administrador")
      onSaved(updated)
      setDelta("")
      setReason("")
      setNotice("Ajuste registrado. Os saldos abaixo refletem a resposta do servidor.")
      setReload((value) => value + 1)
    } catch (cause) {
      const stale = cause instanceof ApiError && cause.status === 409
      setConflict(stale)
      setError(stale
        ? `${cause.message} Recarregue os produtos, confira os saldos e refaca o ajuste com a revisao atual.`
        : cause instanceof Error ? cause.message : "Nao foi possivel registrar o ajuste. Tente novamente.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="space-y-5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="break-words text-lg font-semibold">Estoque: {product.name}</h2><p className="text-sm text-muted-foreground">{product.sku} | Revisao {product.version ?? "indisponivel"}</p></div>
        <Button variant="outline" disabled={pending} onClick={onClose}>Fechar</Button>
      </div>
      {notice && <p role="status" className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">{notice}</p>}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([["Fisico", product.physicalStock], ["Reservado", product.reservedStock], ["Disponivel", product.stock], ["Minimo", product.minimumStock]] as const).map(([label, value]) => (
          <div key={label} className="rounded-lg bg-secondary p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-semibold">{value == null ? "Nao informado" : `${quantity.format(value)} ${product.unit}`}</dd></div>
        ))}
      </dl>
      {canAdjust && <form onSubmit={adjust} className="space-y-3 border-t border-border pt-4" aria-busy={pending}>
        <h3 className="font-semibold">Ajustar estoque</h3>
        <p className="text-sm text-muted-foreground">Use valor positivo para entrada ou negativo para saida. O estoque reservado nao pode ser retirado.</p>
        <fieldset disabled={pending || conflict} className="grid min-w-0 gap-3 sm:grid-cols-[180px_1fr]">
          <div><Label htmlFor="stock-delta">Quantidade (+ / -)</Label><Input id="stock-delta" type="number" min="-1000000000" max="1000000000" step="0.001" required value={delta} onChange={(event) => setDelta(event.target.value)} placeholder="Ex.: 10 ou -2" /></div>
          <div><Label htmlFor="stock-reason">Motivo obrigatorio</Label><Textarea id="stock-reason" required maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: recebimento de mercadoria, avaria, inventario..." /></div>
        </fieldset>
        {validDelta && <p className="rounded-lg bg-muted p-3 text-sm">Conferencia: {physicalAfter == null ? "" : `fisico previsto ${quantity.format(physicalAfter)} ${product.unit}; `}disponivel previsto {quantity.format(availableAfter)} {product.unit}. Revisao {product.version ?? "indisponivel"}.</p>}
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2"><Button type="submit" variant="action" disabled={pending || conflict || !validDelta || !reason.trim()}>{pending ? "Registrando..." : "Revisar e confirmar ajuste"}</Button>
          {conflict && <Button variant="outline" disabled={pending} onClick={onReload}>Recarregar produtos</Button>}
        </div>
      </form>}
      <section className="space-y-3 border-t border-border pt-4" aria-label="Historico de movimentacoes">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Historico de movimentacoes</h3><Button size="sm" variant="outline" disabled={loading || pending} onClick={() => setReload((value) => value + 1)}>Atualizar historico</Button></div>
        {loading ? <p role="status" className="text-sm text-muted-foreground">Carregando movimentacoes...</p> : historyError ? <div className="space-y-2"><p role="alert" className="text-sm text-destructive">{historyError}</p><Button variant="outline" disabled={pending} onClick={() => setReload((value) => value + 1)}>Tentar novamente</Button></div> : movements.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma movimentacao registrada.</p> :
          <ul className="max-h-96 space-y-2 overflow-y-auto">{movements.map((movement) => <li key={movement.id} className="rounded-lg border border-border bg-background p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{({ INITIAL: "Saldo inicial", ADJUSTMENT: "Ajuste", RESERVATION: "Reserva", RELEASE: "Liberacao de reserva", SHIPMENT: "Expedicao" } as Record<string, string>)[movement.kind] ?? movement.kind}: {quantity.format(movement.quantity)} {product.unit}</span><time dateTime={movement.createdAt} className="text-muted-foreground">{new Date(movement.createdAt).toLocaleString("pt-BR")}</time></div>
            <p className="mt-1 whitespace-pre-wrap break-words">{movement.reason || "Sem motivo informado"}</p><p className="mt-1 text-xs text-muted-foreground">Responsavel: {movement.actorName}</p>
          </li>)}</ul>}
      </section>
    </Card>
  )
}

export function ProductManagement() {
  const { seller } = useSeller()
  const canEdit = seller?.role === "ADMIN"
  const canAdjust = canEdit || seller?.role === "OPERATIONS"
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [reload, setReload] = useState(0)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [stock, setStock] = useState("all")
  const [panel, setPanel] = useState<{ mode: "edit" | "stock"; product: Product } | "new" | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError("")
    productService.getAll(true)
      .then((data) => { if (!controller.signal.aborted) setProducts(data) })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Nao foi possivel carregar os produtos.") })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])

  function refresh() {
    if (panel && !window.confirm("Recarregar descarta as alteracoes nao salvas deste painel. Continuar?")) return
    setPanel(null)
    setNotice("")
    setReload((value) => value + 1)
  }

  function saveProduct(saved: Product) {
    setProducts((current) => panel === "new" ? [saved, ...current] : current.map((item) => item.id === saved.id ? saved : item))
    if (panel && panel !== "new" && panel.mode === "stock") {
      setPanel({ mode: "stock", product: saved })
    } else {
      setPanel(null)
      setNotice(`Produto ${saved.name} salvo.`)
    }
  }

  const term = search.trim().toLocaleLowerCase("pt-BR")
  const filtered = products.filter((product) =>
    [product.sku, product.name, product.category, product.description].some((value) => value.toLocaleLowerCase("pt-BR").includes(term)) &&
    (status === "all" || (status === "active" ? product.active !== false : product.active === false)) &&
    (stock === "all" || (stock === "empty" ? product.stock <= 0 : product.stock > 0 && product.stock <= (product.minimumStock ?? 0))),
  )

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-5 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Gestao de produtos</h2><p className="mt-1 text-sm text-muted-foreground">{canEdit ? "Cadastros, precos e controle de estoque em um so lugar." : "Consulte os produtos e registre movimentacoes de estoque."}</p></div>
        {canEdit && <Button variant="action" disabled={loading || !!error || !!panel} onClick={() => { setNotice(""); setPanel("new") }}><Plus />Novo produto</Button>}
      </div>
      {notice && <p role="status" className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">{notice}</p>}
      {canEdit && (panel === "new" || panel?.mode === "edit") && <ProductForm key={panel === "new" ? "new" : panel.product.id} product={panel === "new" ? undefined : panel.product} onSaved={saveProduct} onCancel={() => setPanel(null)} onReload={refresh} />}
      {canAdjust && panel && panel !== "new" && panel.mode === "stock" && <StockPanel key={panel.product.id} product={panel.product} onSaved={saveProduct} onClose={() => setPanel(null)} onReload={refresh} />}
      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_140px_160px_auto] lg:items-end">
        <div><Label htmlFor="product-search">Buscar produtos</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground" /><Input id="product-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, SKU, categoria..." className="pl-10" /></div></div>
        <div><Label htmlFor="product-status">Situacao</Label><select id="product-status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-ring"><option value="all">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></div>
        <div><Label htmlFor="product-stock">Disponibilidade</Label><select id="product-stock" value={stock} onChange={(event) => setStock(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-ring"><option value="all">Todos os saldos</option><option value="low">Estoque baixo</option><option value="empty">Esgotados</option></select></div>
        <Button variant="outline" disabled={loading || !!panel} onClick={refresh}>Atualizar</Button>
      </Card>
      {error && <Card className="space-y-3 border-destructive/30 p-4"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" disabled={loading || !!panel} onClick={refresh}>Tentar novamente</Button></Card>}
      {loading ? <p role="status" className="py-8 text-center text-muted-foreground">Carregando produtos...</p> : !error && <>
        <p className="text-sm text-muted-foreground">{filtered.length} produto(s) encontrado(s). Estoque baixo: disponivel positivo ate o minimo cadastrado.</p>
        {filtered.length === 0 ? <Card className="p-8 text-center"><Package className="mx-auto size-10 text-muted-foreground" /><p className="mt-3 font-medium">Nenhum produto encontrado</p><p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros{canEdit ? " ou cadastre um produto" : ""}.</p></Card> :
          <div className="grid gap-3 sm:grid-cols-2">{filtered.map((product) => <Card key={product.id} className="hover-lift flex min-w-0 flex-col p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" className="size-full object-contain" /> : <Package className="size-6 text-muted-foreground" />}</div>
              <div className="min-w-0 flex-1"><p className="break-words text-xs text-muted-foreground">{product.sku} | {product.category}</p><h3 className="mt-1 break-words font-semibold">{product.name}</h3><p className="mt-1 font-semibold text-primary">{currency.format(product.price)} <span className="text-xs font-normal text-muted-foreground">/ {product.unit}</span></p></div>
            </div>
            <div className="my-3 flex flex-wrap gap-2"><Badge className={product.active === false ? "bg-muted text-muted-foreground" : "bg-secondary text-secondary-foreground"}>{product.active === false ? "Inativo" : "Ativo"}</Badge>
              {product.saleBlocked && <Badge className="bg-destructive/10 text-destructive">Venda bloqueada</Badge>}
              {product.stock <= 0 ? <Badge className="bg-destructive/10 text-destructive">Esgotado</Badge> : product.stock <= (product.minimumStock ?? 0) && <Badge className="bg-secondary text-secondary-foreground">Estoque baixo</Badge>}
            </div>
            {product.description && <p className="mb-3 line-clamp-2 break-words text-sm text-muted-foreground">{product.description}</p>}
            <dl className="grid grid-cols-2 gap-2 text-sm"><div><dt className="text-muted-foreground">Disponivel</dt><dd className="font-medium">{quantity.format(product.stock)} {product.unit}</dd></div><div><dt className="text-muted-foreground">Fisico / reservado</dt><dd>{product.physicalStock == null ? "-" : quantity.format(product.physicalStock)} / {product.reservedStock == null ? "-" : quantity.format(product.reservedStock)} {product.unit}</dd></div><div><dt className="text-muted-foreground">Minimo</dt><dd>{quantity.format(product.minimumStock ?? 0)} {product.unit}</dd></div><div><dt className="text-muted-foreground">Multiplo de venda</dt><dd>{quantity.format(product.quantityStep ?? 1)} {product.unit}</dd></div></dl>
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              {canEdit && <Button variant="outline" disabled={!!panel} onClick={() => { setNotice(""); setPanel({ mode: "edit", product }); window.scrollTo({ top: 0, behavior: "smooth" }) }}>Editar produto</Button>}
              {canAdjust && <Button disabled={!!panel} onClick={() => { setNotice(""); setPanel({ mode: "stock", product }); window.scrollTo({ top: 0, behavior: "smooth" }) }}>Estoque / historico</Button>}
            </div>
          </Card>)}</div>}
      </>}
    </main>
  )
}
