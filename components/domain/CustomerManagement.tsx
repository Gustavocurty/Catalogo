"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus, Search, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { useSeller } from "@/lib/hooks/useSeller"
import { customerService } from "@/lib/services/customerService"
import { useCartStore } from "@/lib/store/cartStore"
import { useOrderStore } from "@/lib/store/orderStore"
import type { Customer } from "@/lib/types"
import { CustomerForm } from "./CustomerForm"

export function CustomerManagement() {
  const router = useRouter()
  const params = useSearchParams()
  const { seller } = useSeller()
  const canEdit = seller?.role === "ADMIN" || seller?.role === "SELLER"
  const selecting = params.get("select") === "1"
  const creating = params.get("new") === "1"
  const returnTo = params.get("return") === "/carrinho" ? "/carrinho" : creating ? "/catalogo" : ""
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [reload, setReload] = useState(0)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("active")
  const [editor, setEditor] = useState<Customer | "new" | null>(creating ? "new" : null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (creating && canEdit) setEditor("new")
  }, [canEdit, creating])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError("")
    customerService.list(true)
      .then((data) => { if (!controller.signal.aborted) setCustomers(data) })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Nao foi possivel carregar os clientes.") })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])

  function refresh() {
    if (editor && !window.confirm("Recarregar descarta as alteracoes deste formulario. Continuar?")) return
    setEditor(null)
    setNotice("")
    setReload((value) => value + 1)
  }

  function startOrder(customer: Customer) {
    if (!canEdit || starting || !customer.id || customer.active === false) return
    if (useCartStore.getState().items.length > 0 && !window.confirm("Existe um rascunho com itens. Iniciar este pedido apagara os itens, observacoes e desconto do rascunho. Continuar?")) return
    setStarting(true)
    try {
      useOrderStore.getState().resetOrderForm()
      useCartStore.getState().clear()
      useOrderStore.getState().setCustomer(customer)
      router.push("/catalogo")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nao foi possivel iniciar o pedido.")
      setStarting(false)
    }
  }

  const term = search.trim().toLocaleLowerCase("pt-BR")
  const digits = term.replace(/\D/g, "")
  const filtered = customers.filter((customer) => {
    const matchesStatus = status === "all" || (status === "active" ? customer.active !== false : customer.active === false)
    const matchesSearch = [customer.companyName, customer.document, customer.phone, customer.contactName, customer.address]
      .some((value) => value.toLocaleLowerCase("pt-BR").includes(term))
      || (digits.length > 0 && /^[-\d\s./()+]+$/.test(term) && [customer.document, customer.phone].some((value) => value.replace(/\D/g, "").includes(digits)))
    return matchesStatus && matchesSearch
  })

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-5 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{creating ? "Novo cliente" : selecting ? "Selecione o cliente do pedido" : "Cadastro de clientes"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{creating ? "Cadastre o cliente e volte ao pedido com os itens atuais." : canEdit ? "Consulte, atualize os cadastros ou inicie um novo pedido." : "Consulta de clientes. Seu perfil possui acesso somente leitura."}</p>
        </div>
        {canEdit && <Button variant="action" disabled={loading || !!error || !!editor || starting} onClick={() => { setNotice(""); setEditor("new") }}><Plus />Novo cliente</Button>}
      </div>
      {notice && <p role="status" className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">{notice}</p>}
      {editor && canEdit && <CustomerForm key={editor === "new" ? "new" : editor.id} customer={editor === "new" ? undefined : editor}
        onCancel={() => {
          setEditor(null)
          if (creating && returnTo) router.push(returnTo)
        }} onReload={refresh} onSaved={(saved) => {
          setCustomers((current) => editor === "new" ? [saved, ...current] : current.map((item) => item.id === saved.id ? saved : item))
          setEditor(null)
          setNotice(`Cliente ${saved.companyName} salvo${saved.active === false ? " como inativo" : ""}.`)
          if (creating && saved.active !== false) {
            useOrderStore.getState().setCustomer(saved)
            router.push(returnTo || "/catalogo")
          }
        }} />}
      <Card className="grid gap-3 p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <div>
          <Label htmlFor="customer-search">Buscar clientes</Label>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground" />
            <Input id="customer-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, documento, contato..." className="pl-10" />
          </div>
        </div>
        <div>
          <Label htmlFor="customer-status">Situacao</Label>
          <select id="customer-status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-ring">
            <option value="active">Ativos</option><option value="inactive">Inativos</option><option value="all">Todos</option>
          </select>
        </div>
        <Button variant="outline" disabled={loading || !!editor || starting} onClick={refresh}>Atualizar</Button>
      </Card>
      {error && <Card className="space-y-3 border-destructive/30 p-4"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" disabled={loading || !!editor} onClick={refresh}>Tentar novamente</Button></Card>}
      {loading ? <p role="status" className="py-8 text-center text-muted-foreground">Carregando clientes...</p> : !error && <>
        <p className="text-sm text-muted-foreground">{filtered.length} cliente(s) encontrado(s)</p>
        {filtered.length === 0 ? <Card className="p-8 text-center"><Users className="mx-auto size-10 text-muted-foreground" /><p className="mt-3 font-medium">Nenhum cliente encontrado</p><p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou cadastre um cliente.</p></Card> :
          <div className="grid gap-3 sm:grid-cols-2">{filtered.map((customer) => <Card key={customer.id} className="hover-lift flex min-w-0 flex-col p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words font-semibold">{customer.companyName}</h3><Badge className={customer.active === false ? "bg-muted text-muted-foreground" : "bg-secondary text-secondary-foreground"}>{customer.active === false ? "Inativo" : "Ativo"}</Badge></div>
            <p className="mt-1 text-sm text-muted-foreground">{customer.document}</p>
            <dl className="my-4 space-y-2 break-words text-sm">
              <div><dt className="text-muted-foreground">Contato / telefone</dt><dd>{customer.contactName || "Nao informado"} / {customer.phone || "Nao informado"}</dd></div>
              <div><dt className="text-muted-foreground">Endereco</dt><dd>{customer.address || "Nao informado"}</dd></div>
            </dl>
            {canEdit && <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <Button variant={selecting ? "action" : "default"} disabled={customer.active === false || !customer.id || !!editor || starting} onClick={() => startOrder(customer)}>{starting ? "Abrindo pedido..." : "Iniciar pedido"}</Button>
              <Button variant="outline" disabled={!!editor || starting} onClick={() => { setNotice(""); setEditor(customer); window.scrollTo({ top: 0, behavior: "smooth" }) }}>Editar / status</Button>
            </div>}
          </Card>)}</div>}
      </>}
    </main>
  )
}
