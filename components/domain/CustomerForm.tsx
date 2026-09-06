"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { useSeller } from "@/lib/hooks/useSeller"
import { ApiError } from "@/lib/local/errors"
import { customerService } from "@/lib/services/customerService"
import type { Customer } from "@/lib/types"

interface CustomerFormProps {
  customer?: Customer
  onSaved: (customer: Customer) => void
  onCancel: () => void
  onReload: () => void
}

export function CustomerForm({ customer, onSaved, onCancel, onReload }: CustomerFormProps) {
  const { seller } = useSeller()
  const [values, setValues] = useState({
    companyName: customer?.companyName ?? "",
    document: customer?.document ?? "",
    address: customer?.address ?? "",
    phone: customer?.phone ?? "",
    contactName: customer?.contactName ?? "",
    active: customer?.active ?? true,
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [conflict, setConflict] = useState(false)
  const canEdit = seller?.role === "ADMIN" || seller?.role === "SELLER"

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || conflict || !canEdit) return
    if (customer && (!customer.id || customer.version == null)) {
      setError("Cadastro sem identificador ou revisao. Recarregue os clientes antes de editar.")
      setConflict(true)
      return
    }
    if (!values.companyName.trim()) {
      setError("Informe a razao social ou o nome do cliente.")
      return
    }
    setPending(true)
    setError("")
    try {
      const payload = {
        companyName: values.companyName.trim(),
        document: values.document.trim(),
        address: values.address.trim(),
        phone: values.phone.trim(),
        contactName: values.contactName.trim(),
        active: values.active,
      }
      const saved = customer
        ? await customerService.update(customer.id!, { ...payload, version: customer.version! })
        : await customerService.create(payload)
      onSaved(saved)
    } catch (cause) {
      const stale = !!customer && cause instanceof ApiError && cause.status === 409
      setConflict(stale)
      setError(stale
        ? `${cause.message} Recarregue os clientes e confira o cadastro antes de refazer a edicao. Seus dados permanecem aqui ate recarregar.`
        : cause instanceof Error ? cause.message : "Nao foi possivel salvar o cliente. Tente novamente.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-lg font-semibold">{customer ? "Editar cliente" : "Novo cliente"}</h2>
      {customer && <p className="mt-1 text-sm text-muted-foreground">Revisao {customer.version ?? "indisponivel"}</p>}
      <form onSubmit={submit} className="mt-4 space-y-4" aria-busy={pending}>
        <fieldset disabled={pending || !canEdit} className="grid min-w-0 gap-4 sm:grid-cols-2">
          {([
            ["companyName", "Razao social / nome *", "organization", 200],
            ["document", "CNPJ / CPF", "off", 40],
            ["address", "Endereco", "street-address", 500],
            ["phone", "Telefone", "tel", 40],
            ["contactName", "Nome do contato", "name", 160],
          ] as const).map(([field, label, autoComplete, maxLength]) => (
            <div key={field} className={field === "address" ? "sm:col-span-2" : ""}>
              <Label htmlFor={`customer-${field}`}>{label}</Label>
              <Input id={`customer-${field}`} value={values[field]} required={field === "companyName"} maxLength={maxLength}
                type={field === "phone" ? "tel" : "text"} autoComplete={autoComplete}
                onChange={(event) => setValues({ ...values, [field]: event.target.value })} />
            </div>
          ))}
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={values.active} onChange={(event) => setValues({ ...values, active: event.target.checked })} className="size-4 accent-primary" />
            Cliente ativo
          </label>
        </fieldset>
        <p className="text-sm text-muted-foreground">Clientes inativos permanecem no historico e nao podem iniciar pedidos.</p>
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="action" disabled={pending || conflict || !canEdit}>{pending ? "Salvando..." : "Salvar cliente"}</Button>
          <Button variant="outline" disabled={pending} onClick={onCancel}>Cancelar</Button>
          {conflict && <Button variant="outline" disabled={pending} onClick={onReload}>Recarregar clientes</Button>}
        </div>
      </form>
    </Card>
  )
}
