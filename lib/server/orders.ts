import { createHash } from "node:crypto"
import type { PoolClient } from "pg"
import type { Order, OrderPage, Seller } from "../types"
import { audit, transaction } from "./db"
import { customerDto, productDto, type Row } from "./dto"
import { ApiError, conflict } from "./errors"
import { decimal, lineCents, scaled, totals, validateQuantity } from "./money"
import { amount, day, object, queryParams, status, text, uuid, validateTransition, version } from "./validation"

export function orderInput(input: unknown) {
  const data = object(input, ["customerId", "items", "notes", "discountPercent", "idempotencyKey"])
  const customerId = uuid(data.customerId, "Cliente")
  const notes = text(data.notes === undefined ? "" : data.notes, "Observacoes", 4000)
  const discountPercent = amount(data.discountPercent === undefined ? 0 : data.discountPercent, 2, 100, "Desconto")
  const idempotencyKey = text(data.idempotencyKey, "Chave de idempotencia", 128, 8)
  if (!/^[A-Za-z0-9_-]+$/.test(idempotencyKey)) throw new ApiError(400, "Chave de idempotencia invalida.")
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 200) throw new ApiError(400, "Pedido deve conter de 1 a 200 produtos.")
  const items = data.items.map((value) => {
    const item = object(value, ["productId", "quantity", "expectedPrice"])
    return {
      productId: uuid(item.productId, "Produto"),
      quantity: amount(item.quantity, 3, 1000000, "Quantidade", 0.001),
      expectedPrice: amount(item.expectedPrice, 2, 9999999.99, "Preco esperado"),
    }
  }).sort((a, b) => a.productId.localeCompare(b.productId))
  if (new Set(items.map((item) => item.productId)).size !== items.length) throw new ApiError(400, "Produto repetido no pedido.")
  return { customerId, items, notes, discountPercent, idempotencyKey }
}

export function orderFingerprint(input: ReturnType<typeof orderInput>): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex")
}

async function hydrateOrders(client: PoolClient, rows: Row[]): Promise<Order[]> {
  if (!rows.length) return []
  const ids = rows.map((row) => row.id)
  const items = (await client.query("SELECT * FROM order_items WHERE order_id=ANY($1::uuid[]) ORDER BY order_id,position", [ids])).rows
  const events = (await client.query("SELECT * FROM order_events WHERE order_id=ANY($1::uuid[]) ORDER BY order_id,order_version", [ids])).rows
  const itemsByOrder = new Map<string, Order["items"]>()
  const eventsByOrder = new Map<string, Order["events"]>()
  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) ?? []
    list.push({ product: item.product_snapshot, quantity: Number(item.quantity), lineTotal: Number(item.line_total) })
    itemsByOrder.set(item.order_id, list)
  }
  for (const event of events) {
    const list = eventsByOrder.get(event.order_id) ?? []
    list.push({ id: event.id, fromStatus: event.from_status, toStatus: event.to_status, actorName: event.actor_name, createdAt: event.created_at.toISOString(), reason: event.reason })
    eventsByOrder.set(event.order_id, list)
  }
  return rows.map((row) => ({
    id: row.id, number: String(row.business_number).padStart(8, "0"), status: row.status, version: row.version,
    createdAt: row.created_at.toISOString(), seller: row.seller_snapshot, customer: row.customer_snapshot,
    items: itemsByOrder.get(row.id) ?? [], events: eventsByOrder.get(row.id) ?? [], notes: row.notes,
    discountPercent: Number(row.discount_percent), subtotal: Number(row.subtotal), discountValue: Number(row.discount_value), total: Number(row.total),
  }))
}

export async function createOrder(input: unknown, seller: Seller): Promise<{ order: Order; replay: boolean }> {
  const data = orderInput(input)
  const fingerprint = orderFingerprint(data)
  return transaction(async (client) => {
    // Serialize only identical seller/key pairs, including concurrent first requests.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`order:${seller.id}:${data.idempotencyKey}`])
    const existing = (await client.query("SELECT * FROM orders WHERE seller_id=$1 AND idempotency_key=$2", [seller.id, data.idempotencyKey])).rows[0]
    if (existing) {
      if (existing.request_hash !== fingerprint) conflict("Chave de idempotencia ja utilizada com outro conteudo.")
      // Lock the order while hydrating so a concurrent status mutation cannot mix versions/events.
      const current = (await client.query("SELECT * FROM orders WHERE id=$1 FOR SHARE", [existing.id])).rows[0]
      return { order: (await hydrateOrders(client, [current]))[0], replay: true }
    }
    const customer = (await client.query("SELECT * FROM customers WHERE id=$1 FOR SHARE", [data.customerId])).rows[0]
    if (!customer || !customer.active) throw new ApiError(409, "Cliente inexistente ou inativo.")
    // All stock writers use the same ascending UUID lock order.
    const products = (await client.query("SELECT * FROM products WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE", [data.items.map((item) => item.productId)])).rows
    if (products.length !== data.items.length) throw new ApiError(409, "Produto inexistente ou indisponivel.")
    const byId = new Map(products.map((product) => [product.id, product]))
    const lines = data.items.map((item) => {
      const product = byId.get(item.productId)!
      if (!product.active || product.sale_blocked) conflict("Produto inativo ou bloqueado para venda.")
      const price = scaled(Number(product.price), 2, 9999999.99, "Preco")
      if (price !== scaled(item.expectedPrice, 2, 9999999.99, "Preco esperado")) conflict("Preco alterado. Atualize o catalogo antes de confirmar.")
      const quantity = validateQuantity(item.quantity, Number(product.quantity_step))
      const available = scaled(Number(product.physical_stock), 3, 1000000000, "Saldo") - scaled(Number(product.reserved_stock), 3, 1000000000, "Reserva")
      if (quantity > available) conflict(`Estoque insuficiente para ${product.sku}.`)
      return { ...item, product: productDto(product), lineTotal: lineCents(price, quantity) }
    })
    const money = totals(lines.map((line) => line.lineTotal), scaled(data.discountPercent, 2, 100, "Desconto"))
    const order = (await client.query(
      `INSERT INTO orders (seller_id,customer_id,seller_snapshot,customer_snapshot,notes,discount_percent,subtotal,discount_value,total,idempotency_key,request_hash)
       VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [seller.id, customer.id, JSON.stringify(seller), JSON.stringify(customerDto(customer)), data.notes, data.discountPercent,
        decimal(money.subtotal, 2), decimal(money.discountValue, 2), decimal(money.total, 2), data.idempotencyKey, fingerprint],
    )).rows[0]
    for (const [position, line] of lines.entries()) {
      const reserved = await client.query(
        "UPDATE products SET reserved_stock=reserved_stock+$2::numeric,version=version+1,updated_at=now() WHERE id=$1 AND physical_stock-reserved_stock >= $2::numeric RETURNING id",
        [line.productId, line.quantity],
      )
      if (!reserved.rowCount) conflict("Estoque insuficiente.")
      await client.query("INSERT INTO order_items (order_id,product_id,position,product_snapshot,quantity,unit_price,line_total) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7)", [order.id, line.productId, position, JSON.stringify(line.product), line.quantity, line.expectedPrice, decimal(line.lineTotal, 2)])
      await client.query("INSERT INTO reservations (order_id,product_id,quantity) VALUES ($1,$2,$3)", [order.id, line.productId, line.quantity])
    }
    await client.query("INSERT INTO order_events (order_id,from_status,to_status,actor_id,actor_name,order_version) VALUES ($1,NULL,'PENDING',$2,$3,1)", [order.id, seller.id, seller.name])
    await audit(client, seller.id, "ORDER_CREATED", "order", order.id, { number: String(order.business_number) })
    return { order: (await hydrateOrders(client, [order]))[0], replay: false }
  })
}

function assertCanView(seller: Seller, sellerId: string) {
  if (seller.role === "SELLER" && seller.id !== sellerId) throw new ApiError(403, "Sem permissao para este pedido.")
}

export async function getOrder(id: string, request: Request, seller: Seller): Promise<Order> {
  queryParams(request, [])
  return transaction(async (client) => {
    const order = (await client.query("SELECT * FROM orders WHERE id=$1", [id])).rows[0]
    if (!order) throw new ApiError(404, "Pedido nao encontrado.")
    assertCanView(seller, order.seller_id)
    return (await hydrateOrders(client, [order]))[0]
  }, true)
}

export async function listOrders(request: Request, seller: Seller): Promise<OrderPage> {
  const params = queryParams(request, ["page", "pageSize", "from", "to", "customerId", "sellerId", "status", "number"])
  const rawPage = params.get("page") ?? "1"
  if (!/^[1-9]\d{0,4}$/.test(rawPage)) throw new ApiError(400, "Pagina invalida (1 a 99999).")
  const page = Number(rawPage)
  const pageSize = 20
  if (params.has("pageSize") && params.get("pageSize") !== "20") throw new ApiError(400, "pageSize deve ser 20.")
  const where: string[] = []
  const values: unknown[] = []
  const add = (sql: string, value: unknown) => { values.push(value); where.push(sql.replace("?", `$${values.length}`)) }
  const zone = process.env.BUSINESS_TIME_ZONE ?? "America/Sao_Paulo"
  try { new Intl.DateTimeFormat("en", { timeZone: zone }).format() } catch { throw new Error("Invalid BUSINESS_TIME_ZONE") }
  if (params.has("from") || params.has("to")) {
    values.push(zone)
    if (params.has("from")) add("created_at >= (?::date::timestamp AT TIME ZONE $1)", day(params.get("from")!))
    if (params.has("to")) add("created_at < ((?::date + 1)::timestamp AT TIME ZONE $1)", day(params.get("to")!))
    if (params.has("from") && params.has("to") && params.get("from")! > params.get("to")!) throw new ApiError(400, "Intervalo de datas invalido.")
  }
  if (params.has("customerId")) add("customer_id=?", uuid(params.get("customerId"), "Cliente"))
  if (seller.role === "SELLER") {
    if (params.has("sellerId") && params.get("sellerId") !== seller.id) throw new ApiError(403, "Sem permissao para filtrar pedidos de outro vendedor.")
    add("seller_id=?", seller.id)
  } else if (params.has("sellerId")) {
    add("seller_id=?", uuid(params.get("sellerId"), "Vendedor"))
  }
  if (params.has("status")) add("status=?", status(params.get("status")))
  if (params.has("number")) {
    const number = params.get("number")!
    if (!/^\d{1,19}$/.test(number) || BigInt(number) < BigInt(1) || BigInt(number) > BigInt("9223372036854775807")) throw new ApiError(400, "Numero do pedido invalido.")
    add("business_number=?::bigint", BigInt(number).toString())
  }
  const filter = where.length ? `WHERE ${where.join(" AND ")}` : ""
  return transaction(async (client) => {
    const count = (await client.query(`SELECT count(*) AS total FROM orders ${filter}`, values)).rows[0]
    const rows = (await client.query(`SELECT * FROM orders ${filter} ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET $${values.length + 1}`, [...values, (page - 1) * pageSize])).rows
    return { orders: await hydrateOrders(client, rows), total: Number(count.total), page, pageSize }
  }, true)
}

export async function updateOrderStatus(id: string, input: unknown, seller: Seller): Promise<Order> {
  const data = object(input, ["status", "version", "reason"])
  const target = status(data.status)
  const expectedVersion = version(data.version)
  const reason = text(data.reason === undefined ? "" : data.reason, "Motivo", 1000)
  return transaction(async (client) => {
    const order = (await client.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [id])).rows[0]
    if (!order) throw new ApiError(404, "Pedido nao encontrado.")
    if (order.version !== expectedVersion) conflict()
    validateTransition(order.status, target, reason)
    if (target === "SHIPPED" || target === "CANCELLED") {
      const reservations = (await client.query("SELECT * FROM reservations WHERE order_id=$1 ORDER BY product_id FOR UPDATE", [id])).rows
      const itemCount = Number((await client.query("SELECT count(*) AS count FROM order_items WHERE order_id=$1", [id])).rows[0].count)
      if (reservations.length !== itemCount || !itemCount || reservations.some((reservation) => reservation.status !== "ACTIVE")) throw new Error("Reservation invariant violated")
      await client.query("SELECT id FROM products WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE", [reservations.map((reservation) => reservation.product_id)])
      for (const reservation of reservations) {
        const result = await client.query(
          `UPDATE products SET reserved_stock=reserved_stock-$2::numeric,
           physical_stock=physical_stock-${target === "SHIPPED" ? "$2::numeric" : "0"},version=version+1,updated_at=now()
           WHERE id=$1 AND reserved_stock >= $2::numeric RETURNING id`, [reservation.product_id, reservation.quantity],
        )
        if (!result.rowCount) throw new Error("Stock reservation invariant violated")
        if (target === "SHIPPED") await client.query("INSERT INTO stock_movements (product_id,order_id,quantity,kind,reason,actor_id,actor_name) VALUES ($1,$2,-$3::numeric,'SHIPMENT',$4,$5,$6)", [reservation.product_id, id, reservation.quantity, reason || `Expedicao do pedido ${order.business_number}`, seller.id, seller.name])
      }
      await client.query("UPDATE reservations SET status=$2,updated_at=now() WHERE order_id=$1", [id, target === "SHIPPED" ? "CONSUMED" : "RELEASED"])
    }
    const updated = (await client.query("UPDATE orders SET status=$2,version=version+1,updated_at=now() WHERE id=$1 RETURNING *", [id, target])).rows[0]
    await client.query("INSERT INTO order_events (order_id,from_status,to_status,actor_id,actor_name,reason,order_version) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id, order.status, target, seller.id, seller.name, reason, updated.version])
    await audit(client, seller.id, "ORDER_STATUS_CHANGED", "order", id, { from: order.status, to: target, reason, previousVersion: expectedVersion })
    return (await hydrateOrders(client, [updated]))[0]
  })
}
