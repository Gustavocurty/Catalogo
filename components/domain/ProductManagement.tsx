"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Package, Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label, Textarea } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useSeller } from "@/lib/hooks/useSeller"
import { ApiError } from "@/lib/local/errors"
import { productService } from "@/lib/services/productService"
import type { Product, StockMovement } from "@/lib/types"
import { ProductForm } from "./ProductForm"

const LIST_HREF = "/produtos/"

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
  const router = useRouter()
  const params = useSearchParams()
  const { toast } = useToast()
  const { seller } = useSeller()
  const canEdit = seller?.role === "ADMIN"
  const canAdjust = canEdit || seller?.role === "OPERATIONS"
  const isNew = params.get("new") === "1"
  const editId = isNew ? null : params.get("id")
  const stockId = isNew || editId ? null : params.get("stock")
  const dedicated = isNew || !!editId || !!stockId
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [stock, setStock] = useState("all")

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError("")
    productService.getAll(true)
      .then((data) => { if (!controller.signal.aborted) setProducts(data) })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os produtos.") })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])

  function goList() {
    router.push(LIST_HREF)
  }

  function refresh() {
    if (dedicated && !window.confirm("Recarregar descarta as alterações não salvas desta tela. Continuar?")) return
    setReload((value) => value + 1)
  }

  function saveProduct(saved: Product, stayOnStock = false) {
    setProducts((current) => current.some((item) => item.id === saved.id)
      ? current.map((item) => item.id === saved.id ? saved : item)
      : [saved, ...current])
    if (stayOnStock) return
    toast(`Produto ${saved.name} salvo.`)
    goList()
  }

  const focusedId = editId || stockId
  const focused = focusedId ? products.find((product) => product.id === focusedId) : undefined
  const term = search.trim().toLocaleLowerCase("pt-BR")
  const filtered = products.filter((product) =>
    [product.sku, product.name, product.category, product.description].some((value) => value.toLocaleLowerCase("pt-BR").includes(term)) &&
    (status === "all" || (status === "active" ? product.active !== false : product.active === false)) &&
    (stock === "all" || (stock === "empty" ? product.stock <= 0 : product.stock > 0 && product.stock <= (product.minimumStock ?? 0))),
  )

  if (dedicated) {
    const waitingForProduct = !!focusedId && loading
    const missing = !loading && !error && !!focusedId && !focused
    return (
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-5 pb-12">
        {error && <Card className="space-y-3 border-destructive/30 p-4"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={refresh}>Tentar novamente</Button></Card>}
        {waitingForProduct && <p role="status" className="py-8 text-center text-muted-foreground">Carregando produto...</p>}
        {missing && (
          <Card className="space-y-3 p-4">
            <p role="alert" className="text-sm text-destructive">Produto não encontrado. Ele pode ter sido removido ou o endereço está incompleto.</p>
            <Button variant="outline" onClick={goList}>Voltar à lista</Button>
          </Card>
        )}
        {isNew && canEdit && (
          <ProductForm key="new" onSaved={(saved) => saveProduct(saved)} onCancel={goList} onReload={refresh} />
        )}
        {!loading && !error && isNew && !canEdit && (
          <Card className="space-y-3 p-4">
            <p role="alert" className="text-sm text-destructive">Seu perfil não pode cadastrar produtos.</p>
            <Button variant="outline" onClick={goList}>Voltar à lista</Button>
          </Card>
        )}
        {!loading && !error && focused && editId && canEdit && (
          <ProductForm
            key={focused.id}
            product={focused}
            stockHref={`${LIST_HREF}?stock=${encodeURIComponent(focused.id)}`}
            onSaved={(saved) => saveProduct(saved)}
            onCancel={goList}
            onReload={refresh}
          />
        )}
        {!loading && !error && focused && editId && !canEdit && (
          <Card className="space-y-3 p-4">
            <p role="alert" className="text-sm text-destructive">Seu perfil não pode editar o cadastro deste produto.</p>
            <Button variant="outline" onClick={goList}>Voltar à lista</Button>
          </Card>
        )}
        {!loading && !error && focused && stockId && canAdjust && (
          <StockPanel
            key={focused.id}
            product={focused}
            onSaved={(saved) => saveProduct(saved, true)}
            onClose={goList}
            onReload={refresh}
          />
        )}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-5 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Gestão de produtos</h2>
          <p className="mt-1 text-sm text-muted-foreground">{canEdit ? "Cadastros, preços e controle de estoque em um só lugar." : "Consulte os produtos e registre movimentações de estoque."}</p>
        </div>
        {canEdit && <Button variant="action" disabled={loading || !!error} onClick={() => router.push(`${LIST_HREF}?new=1`)}><Plus />Novo produto</Button>}
      </div>
      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_140px_160px_auto] lg:items-end">
        <div><Label htmlFor="product-search">Buscar produtos</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground" /><Input id="product-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, SKU, categoria..." className="pl-10" /></div></div>
        <div><Label htmlFor="product-status">Situação</Label><select id="product-status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-ring"><option value="all">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></div>
        <div><Label htmlFor="product-stock">Disponibilidade</Label><select id="product-stock" value={stock} onChange={(event) => setStock(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-ring"><option value="all">Todos os saldos</option><option value="low">Estoque baixo</option><option value="empty">Esgotados</option></select></div>
        <Button variant="outline" disabled={loading} onClick={refresh}>Atualizar</Button>
      </Card>
      {error && <Card className="space-y-3 border-destructive/30 p-4"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" disabled={loading} onClick={refresh}>Tentar novamente</Button></Card>}
      {loading ? <p role="status" className="py-8 text-center text-muted-foreground">Carregando produtos...</p> : !error && <>
        <p className="text-sm text-muted-foreground">{filtered.length} produto(s) encontrado(s). Estoque baixo: disponível positivo até o mínimo cadastrado.</p>
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
            <dl className="grid grid-cols-2 gap-2 text-sm"><div><dt className="text-muted-foreground">Disponível</dt><dd className="font-medium">{quantity.format(product.stock)} {product.unit}</dd></div><div><dt className="text-muted-foreground">Físico / reservado</dt><dd>{product.physicalStock == null ? "-" : quantity.format(product.physicalStock)} / {product.reservedStock == null ? "-" : quantity.format(product.reservedStock)} {product.unit}</dd></div><div><dt className="text-muted-foreground">Mínimo</dt><dd>{quantity.format(product.minimumStock ?? 0)} {product.unit}</dd></div><div><dt className="text-muted-foreground">Múltiplo de venda</dt><dd>{quantity.format(product.quantityStep ?? 1)} {product.unit}</dd></div></dl>
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              {canEdit && <Button variant="outline" onClick={() => router.push(`${LIST_HREF}?id=${encodeURIComponent(product.id)}`)}>Editar produto</Button>}
              {canAdjust && <Button onClick={() => router.push(`${LIST_HREF}?stock=${encodeURIComponent(product.id)}`)}>Estoque / histórico</Button>}
            </div>
          </Card>)}</div>}
      </>}
    </main>
  )
}
