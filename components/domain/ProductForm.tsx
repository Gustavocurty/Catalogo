"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label, Textarea } from "@/components/ui/input"
import { useSeller } from "@/lib/hooks/useSeller"
import { ApiError } from "@/lib/local/errors"
import { productService } from "@/lib/services/productService"
import type { Product } from "@/lib/types"
import { ProductImagePicker } from "./ProductImagePicker"

interface ProductFormProps {
  product?: Product
  onSaved: (product: Product) => void
  onCancel: () => void
  onReload: () => void
}

export function ProductForm({ product, onSaved, onCancel, onReload }: ProductFormProps) {
  const { seller } = useSeller()
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [conflict, setConflict] = useState(false)
  const canEdit = seller?.role === "ADMIN"

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || uploading || conflict || !canEdit) return
    if (product && product.version == null) {
      setConflict(true)
      setError("Produto sem revisao. Recarregue os produtos antes de editar.")
      return
    }
    const form = new FormData(event.currentTarget)
    const fields = {
      sku: String(form.get("sku") ?? "").trim(),
      name: String(form.get("name") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      category: String(form.get("category") ?? "").trim(),
      unit: String(form.get("unit") ?? "").trim(),
      price: Number(form.get("price")),
      imageUrl,
      minimumStock: Number(form.get("minimumStock")),
      quantityStep: Number(form.get("quantityStep")),
      active: form.get("active") === "on",
      saleBlocked: form.get("saleBlocked") === "on",
    }
    const initialStock = Number(form.get("initialStock"))
    if (!fields.sku || !fields.name || !fields.category || !fields.unit ||
      ![fields.price, fields.minimumStock, fields.quantityStep, initialStock].every(Number.isFinite) ||
      fields.price < 0 || fields.minimumStock < 0 || fields.quantityStep <= 0 || initialStock < 0) {
      setError("Preencha os campos obrigatorios. Preco e saldos nao podem ser negativos e o multiplo de venda deve ser maior que zero.")
      return
    }
    setPending(true)
    setError("")
    try {
      const saved = product
        ? await productService.update(product.id, { ...fields, version: product.version! })
        : await productService.create({ ...fields, initialStock })
      onSaved(saved)
    } catch (cause) {
      const stale = !!product && cause instanceof ApiError && cause.status === 409
      setConflict(stale)
      setError(stale
        ? `${cause.message} Recarregue os produtos e confira o cadastro antes de refazer a edicao. Seus dados permanecem aqui ate recarregar.`
        : cause instanceof Error ? cause.message : "Nao foi possivel salvar o produto. Tente novamente.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-lg font-semibold">{product ? "Editar produto" : "Novo produto"}</h2>
      {product && <p className="mt-1 text-sm text-muted-foreground">Revisao {product.version ?? "indisponivel"}. Para alterar saldos, utilize o ajuste de estoque.</p>}
      <form onSubmit={submit} className="mt-4 space-y-4" aria-busy={pending || uploading}>
        <fieldset disabled={pending || !canEdit} className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div><Label htmlFor="product-sku">SKU *</Label><Input id="product-sku" name="sku" defaultValue={product?.sku} maxLength={80} required /></div>
          <div><Label htmlFor="product-name">Nome *</Label><Input id="product-name" name="name" defaultValue={product?.name} maxLength={200} required /></div>
          <div className="sm:col-span-2"><Label htmlFor="product-description">Descricao</Label><Textarea id="product-description" name="description" defaultValue={product?.description} maxLength={4000} /></div>
          <div><Label htmlFor="product-category">Categoria *</Label><Input id="product-category" name="category" defaultValue={product?.category} maxLength={120} required /></div>
          <div><Label htmlFor="product-unit">Unidade *</Label><Input id="product-unit" name="unit" defaultValue={product?.unit ?? "un"} maxLength={20} placeholder="un, kg, sc, m..." required /></div>
          <div><Label htmlFor="product-price">Preco (R$) *</Label><Input id="product-price" name="price" type="number" inputMode="decimal" min="0" max="9999999.99" step="0.01" defaultValue={product?.price ?? ""} required /></div>
          <div><Label htmlFor="product-step">Multiplo de venda *</Label><Input id="product-step" name="quantityStep" type="number" inputMode="decimal" min="0.001" max="1000000" step="0.001" defaultValue={product?.quantityStep ?? 1} required /><p className="mt-1 text-xs text-muted-foreground">Incremento de quantidade permitido no pedido, com ate 3 casas decimais.</p></div>
          <div><Label htmlFor="product-minimum">Estoque minimo *</Label><Input id="product-minimum" name="minimumStock" type="number" inputMode="decimal" min="0" max="1000000000" step="0.001" defaultValue={product?.minimumStock ?? 0} required /></div>
          {!product && <div><Label htmlFor="product-initial">Estoque fisico inicial *</Label><Input id="product-initial" name="initialStock" type="number" inputMode="decimal" min="0" max="1000000000" step="0.001" defaultValue={0} required /></div>}
          <div className="flex flex-wrap gap-x-6 gap-y-2 sm:col-span-2">
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input name="active" type="checkbox" defaultChecked={product?.active ?? true} className="size-4 accent-primary" />Produto ativo</label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input name="saleBlocked" type="checkbox" defaultChecked={product?.saleBlocked ?? false} className="size-4 accent-primary" />Bloquear venda</label>
          </div>
        </fieldset>
        <ProductImagePicker value={imageUrl} onChange={setImageUrl} onPendingChange={setUploading} disabled={pending || !canEdit} />
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="action" disabled={pending || uploading || conflict || !canEdit}>{pending ? "Salvando..." : uploading ? "Aguarde o envio da foto" : "Salvar produto"}</Button>
          <Button variant="outline" disabled={pending || uploading} onClick={onCancel}>Cancelar</Button>
          {conflict && <Button variant="outline" disabled={pending || uploading} onClick={onReload}>Recarregar produtos</Button>}
        </div>
      </form>
    </Card>
  )
}
