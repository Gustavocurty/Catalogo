"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label, Textarea } from "@/components/ui/input"
import { useSeller } from "@/lib/hooks/useSeller"
import { ApiError } from "@/lib/local/errors"
import { productService } from "@/lib/services/productService"
import type { Product } from "@/lib/types"
import { ProductImagePicker } from "./ProductImagePicker"

const quantity = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 })

interface ProductFormProps {
  product?: Product
  stockHref?: string
  onSaved: (product: Product) => void
  onCancel: () => void
  onReload: () => void
}

const lockedField = "cursor-not-allowed bg-muted"

export function ProductForm({ product, stockHref, onSaved, onCancel, onReload }: ProductFormProps) {
  const { seller } = useSeller()
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [conflict, setConflict] = useState(false)
  const canEdit = seller?.role === "ADMIN"
  const editing = !!product

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || uploading || conflict || !canEdit) return
    if (product && product.version == null) {
      setConflict(true)
      setError("Produto sem revisão. Recarregue os produtos antes de editar.")
      return
    }
    const form = new FormData(event.currentTarget)
    const fields = {
      sku: editing ? product.sku : String(form.get("sku") ?? "").trim(),
      name: String(form.get("name") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      category: String(form.get("category") ?? "").trim(),
      unit: editing ? product.unit : String(form.get("unit") ?? "").trim(),
      price: Number(form.get("price")),
      imageUrl,
      minimumStock: Number(form.get("minimumStock")),
      quantityStep: Number(form.get("quantityStep")),
      active: form.get("active") === "on",
      saleBlocked: form.get("saleBlocked") === "on",
    }
    const initialStock = Number(form.get("initialStock"))
    const stockOk = editing || (Number.isFinite(initialStock) && initialStock >= 0)
    if (!fields.sku || !fields.name || !fields.category || !fields.unit ||
      ![fields.price, fields.minimumStock, fields.quantityStep].every(Number.isFinite) ||
      fields.price < 0 || fields.minimumStock < 0 || fields.quantityStep <= 0 || !stockOk) {
      setError("Preencha os campos obrigatórios. Preço e saldos não podem ser negativos e o múltiplo de venda deve ser maior que zero.")
      return
    }

    const confirmed = editing
      ? window.confirm(`Salvar alterações em "${fields.name}" (código ${product.sku})? O código, a unidade e os saldos de estoque permanecem iguais.`)
      : window.confirm(`Confirmar cadastro de "${fields.name}" com o código ${fields.sku}? Depois de criado, o código e a unidade não poderão ser alterados.`)
    if (!confirmed) return

    setPending(true)
    setError("")
    try {
      const saved = product
        ? await productService.update(product.id, {
          name: fields.name,
          description: fields.description,
          category: fields.category,
          price: fields.price,
          imageUrl: fields.imageUrl,
          minimumStock: fields.minimumStock,
          quantityStep: fields.quantityStep,
          active: fields.active,
          saleBlocked: fields.saleBlocked,
          version: product.version!,
        })
        : await productService.create({ ...fields, initialStock })
      onSaved(saved)
    } catch (cause) {
      const stale = !!product && cause instanceof ApiError && cause.status === 409
      setConflict(stale)
      setError(stale
        ? `${cause.message} Recarregue os produtos e confira o cadastro antes de refazer a edição. Seus dados permanecem aqui até recarregar.`
        : cause instanceof Error ? cause.message : "Não foi possível salvar o produto. Tente novamente.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{editing ? product.name : "Cadastrar produto"}</h2>
        <p className="text-sm text-muted-foreground">
          {editing
            ? `Código ${product.sku} · revisão ${product.version ?? "indisponível"}. Código, unidade e saldos de estoque não podem ser alterados nesta tela.`
            : "Informe o cadastro comercial. O código (SKU) e a unidade ficam fixos depois da confirmação."}
        </p>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-6" aria-busy={pending || uploading}>
        <fieldset disabled={pending || !canEdit} className="space-y-4">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Identificação</h3>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="product-sku">Código (SKU) *</Label>
                <Input
                  id="product-sku"
                  name="sku"
                  defaultValue={product?.sku}
                  maxLength={80}
                  required
                  readOnly={editing}
                  className={editing ? lockedField : undefined}
                  aria-readonly={editing}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {editing ? "O código do produto não pode ser alterado." : "Não poderá ser alterado depois do cadastro."}
                </p>
              </div>
              <div>
                <Label htmlFor="product-name">Nome *</Label>
                <Input id="product-name" name="name" defaultValue={product?.name} maxLength={200} required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="product-description">Descrição</Label>
                <Textarea id="product-description" name="description" defaultValue={product?.description} maxLength={4000} />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Comercial</h3>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="product-category">Categoria *</Label>
                <Input id="product-category" name="category" defaultValue={product?.category} maxLength={120} required />
              </div>
              <div>
                <Label htmlFor="product-unit">Unidade *</Label>
                <Input
                  id="product-unit"
                  name="unit"
                  defaultValue={product?.unit ?? "un"}
                  maxLength={20}
                  placeholder="un, kg, sc, m..."
                  required
                  readOnly={editing}
                  className={editing ? lockedField : undefined}
                  aria-readonly={editing}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {editing ? "A unidade de venda não pode ser alterada." : "Fica fixa após o cadastro (ex.: un, kg, sc)."}
                </p>
              </div>
              <div>
                <Label htmlFor="product-price">Preço (R$) *</Label>
                <Input id="product-price" name="price" type="number" inputMode="decimal" min="0" max="9999999.99" step="0.01" defaultValue={product?.price ?? ""} required />
              </div>
              <div>
                <Label htmlFor="product-step">Múltiplo de venda *</Label>
                <Input id="product-step" name="quantityStep" type="number" inputMode="decimal" min="0.001" max="1000000" step="0.001" defaultValue={product?.quantityStep ?? 1} required />
                <p className="mt-1 text-xs text-muted-foreground">Incremento de quantidade permitido no pedido, com até 3 casas decimais.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Estoque</h3>
            {editing ? (
              <>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {([
                    ["Físico", product.physicalStock],
                    ["Reservado", product.reservedStock],
                    ["Disponível", product.stock],
                    ["Mínimo", product.minimumStock],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-secondary p-3">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-1 break-words font-semibold">{value == null ? "Não informado" : `${quantity.format(value)} ${product.unit}`}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs text-muted-foreground">
                  Saldos físico, reservado e disponível só mudam pelo ajuste de estoque.
                  {stockHref ? <> Para entrada ou saída, use <Link href={stockHref} className="font-medium text-primary underline-offset-4 hover:underline">Estoque / histórico</Link>.</> : null}
                </p>
                <div>
                  <Label htmlFor="product-minimum">Estoque mínimo *</Label>
                  <Input id="product-minimum" name="minimumStock" type="number" inputMode="decimal" min="0" max="1000000000" step="0.001" defaultValue={product.minimumStock ?? 0} required />
                </div>
              </>
            ) : (
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="product-minimum">Estoque mínimo *</Label>
                  <Input id="product-minimum" name="minimumStock" type="number" inputMode="decimal" min="0" max="1000000000" step="0.001" defaultValue={0} required />
                </div>
                <div>
                  <Label htmlFor="product-initial">Estoque físico inicial *</Label>
                  <Input id="product-initial" name="initialStock" type="number" inputMode="decimal" min="0" max="1000000000" step="0.001" defaultValue={0} required />
                  <p className="mt-1 text-xs text-muted-foreground">Definido só na criação. Ajustes posteriores entram pelo estoque.</p>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Situação</h3>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input name="active" type="checkbox" defaultChecked={product?.active ?? true} className="size-4 accent-primary" />Produto ativo</label>
              <label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input name="saleBlocked" type="checkbox" defaultChecked={product?.saleBlocked ?? false} className="size-4 accent-primary" />Bloquear venda</label>
            </div>
          </section>
        </fieldset>

        <div className="border-t border-border pt-4">
          <ProductImagePicker value={imageUrl} onChange={setImageUrl} onPendingChange={setUploading} disabled={pending || !canEdit} />
        </div>

        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="action" disabled={pending || uploading || conflict || !canEdit}>
            {pending ? "Salvando..." : uploading ? "Aguarde o envio da foto" : editing ? "Revisar e salvar" : "Revisar e cadastrar"}
          </Button>
          <Button variant="outline" disabled={pending || uploading} onClick={onCancel}>Cancelar</Button>
          {conflict && <Button variant="outline" disabled={pending || uploading} onClick={onReload}>Recarregar produtos</Button>}
        </div>
      </form>
    </Card>
  )
}
