import type { Seller } from "../types"
import { audit, database, transaction } from "./db"
import { productDto, stockDto } from "./dto"
import { ApiError, conflict } from "./errors"
import { amount, bool, flag, object, queryParams, text, version } from "./validation"
import { imageUrl } from "./storage"
import { authorize } from "./auth"

const productColumns = {
  sku: "sku", name: "name", description: "description", category: "category", unit: "unit", price: "price",
  imageUrl: "image_url", minimumStock: "minimum_stock", quantityStep: "quantity_step", active: "active", saleBlocked: "sale_blocked",
} as const

export function productInput(input: unknown, patch = false): Record<string, unknown> {
  const data = object(input, [...Object.keys(productColumns), patch ? "version" : "initialStock"])
  const result: Record<string, unknown> = {}
  for (const [field, max, min] of [["sku", 80, 1], ["name", 200, 1], ["description", 4000, 0], ["category", 120, 1], ["unit", 20, 1]] as const) {
    if (!patch || data[field] !== undefined) result[field] = text(data[field] === undefined && field === "description" ? "" : data[field], field, max, min)
  }
  if (!patch || data.price !== undefined) result.price = amount(data.price, 2, 9999999.99, "Preco")
  if (!patch || data.imageUrl !== undefined) result.imageUrl = imageUrl(data.imageUrl === undefined ? null : data.imageUrl)
  if (!patch || data.minimumStock !== undefined) result.minimumStock = amount(data.minimumStock === undefined ? 0 : data.minimumStock, 3, 1000000000, "Estoque minimo")
  if (!patch || data.quantityStep !== undefined) result.quantityStep = amount(data.quantityStep === undefined ? 1 : data.quantityStep, 3, 1000000, "Incremento", 0.001)
  if (!patch || data.active !== undefined) result.active = bool(data.active === undefined ? true : data.active, "Ativo")
  if (!patch || data.saleBlocked !== undefined) result.saleBlocked = bool(data.saleBlocked === undefined ? false : data.saleBlocked, "Bloqueio de venda")
  if (patch) {
    version(data.version)
    if (!Object.keys(result).length) throw new ApiError(400, "Informe os campos a alterar.")
  } else result.initialStock = amount(data.initialStock === undefined ? 0 : data.initialStock, 3, 1000000000, "Estoque inicial")
  return result
}

export async function listProducts(request: Request, seller: Seller) {
  const params = queryParams(request, ["manage"])
  const manage = flag(params, "manage")
  if (manage) authorize(seller, ["ADMIN", "OPERATIONS"])
  return (await database().query(`SELECT * FROM products ${manage ? "" : "WHERE active=true"} ORDER BY category,name,id`)).rows.map(productDto)
}

export async function createProduct(input: unknown, seller: Seller) {
  const data = productInput(input)
  return transaction(async (client) => {
    const fields = Object.keys(productColumns) as (keyof typeof productColumns)[]
    const result = await client.query(
      `INSERT INTO products (${fields.map((key) => productColumns[key]).join(",")},physical_stock) VALUES (${fields.map((_, i) => `$${i + 1}`).join(",")},$${fields.length + 1}) RETURNING *`,
      [...fields.map((key) => data[key]), data.initialStock],
    )
    const product = result.rows[0]
    if (data.initialStock !== 0) await client.query("INSERT INTO stock_movements (product_id,quantity,kind,reason,actor_id,actor_name) VALUES ($1,$2,'INITIAL','Estoque inicial',$3,$4)", [product.id, data.initialStock, seller.id, seller.name])
    await client.query("INSERT INTO price_history (product_id,new_price,actor_id) VALUES ($1,$2,$3)", [product.id, product.price, seller.id])
    await audit(client, seller.id, "PRODUCT_CREATED", "product", product.id, data)
    return productDto(product)
  })
}

export async function updateProduct(id: string, input: unknown, seller: Seller) {
  const data = productInput(input, true)
  const expectedVersion = version((input as Record<string, unknown>).version)
  return transaction(async (client) => {
    const old = (await client.query("SELECT * FROM products WHERE id=$1 FOR UPDATE", [id])).rows[0]
    if (!old) throw new ApiError(404, "Produto nao encontrado.")
    if (old.version !== expectedVersion) conflict()
    const fields = Object.keys(data) as (keyof typeof productColumns)[]
    const result = await client.query(`UPDATE products SET ${fields.map((key, i) => `${productColumns[key]}=$${i + 2}`).join(",")},version=version+1,updated_at=now() WHERE id=$1 RETURNING *`, [id, ...fields.map((key) => data[key])])
    if (data.price !== undefined && Number(old.price) !== data.price) await client.query("INSERT INTO price_history (product_id,old_price,new_price,actor_id) VALUES ($1,$2,$3,$4)", [id, old.price, data.price, seller.id])
    await audit(client, seller.id, "PRODUCT_UPDATED", "product", id, { changes: data, previousVersion: expectedVersion })
    return productDto(result.rows[0])
  })
}

export async function listStock(id: string, request: Request) {
  queryParams(request, [])
  return transaction(async (client) => {
    if (!(await client.query("SELECT id FROM products WHERE id=$1", [id])).rowCount) throw new ApiError(404, "Produto nao encontrado.")
    return (await client.query("SELECT * FROM stock_movements WHERE product_id=$1 ORDER BY created_at DESC,id DESC", [id])).rows.map(stockDto)
  }, true)
}

export async function adjustStock(id: string, input: unknown, seller: Seller) {
  const data = object(input, ["delta", "reason", "version"])
  const delta = amount(data.delta, 3, 1000000000, "Ajuste", -1000000000)
  if (delta === 0) throw new ApiError(400, "Ajuste nao pode ser zero.")
  const reason = text(data.reason, "Motivo", 1000, 1)
  const expectedVersion = version(data.version)
  return transaction(async (client) => {
    const old = (await client.query("SELECT * FROM products WHERE id=$1 FOR UPDATE", [id])).rows[0]
    if (!old) throw new ApiError(404, "Produto nao encontrado.")
    if (old.version !== expectedVersion) conflict()
    const result = await client.query("UPDATE products SET physical_stock=physical_stock+$2::numeric,version=version+1,updated_at=now() WHERE id=$1 AND physical_stock+$2::numeric BETWEEN reserved_stock AND 1000000000 RETURNING *", [id, delta])
    if (!result.rowCount) conflict("Saldo fisico nao pode ficar abaixo da reserva nem exceder o limite.")
    await client.query("INSERT INTO stock_movements (product_id,quantity,kind,reason,actor_id,actor_name) VALUES ($1,$2,'ADJUSTMENT',$3,$4,$5)", [id, delta, reason, seller.id, seller.name])
    await audit(client, seller.id, "STOCK_ADJUSTED", "product", id, { delta, reason, previousVersion: expectedVersion })
    return productDto(result.rows[0])
  })
}
