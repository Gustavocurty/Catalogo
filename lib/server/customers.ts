import type { Seller } from "../types"
import { audit, database, transaction } from "./db"
import { customerDto } from "./dto"
import { ApiError, conflict } from "./errors"
import { bool, flag, normalizedDocument, object, queryParams, text, version } from "./validation"

const columns = { companyName: "company_name", document: "document", address: "address", phone: "phone", contactName: "contact_name", active: "active" } as const

export function customerInput(input: unknown, patch = false) {
  const data = object(input, [...Object.keys(columns), ...(patch ? ["version"] : [])])
  const result: Record<string, unknown> = {}
  for (const [key, max] of [["companyName", 200], ["address", 500], ["phone", 40], ["contactName", 160]] as const) {
    if (!patch || data[key] !== undefined) result[key] = text(data[key] === undefined && key !== "companyName" ? "" : data[key], key, max, key === "companyName" ? 1 : 0)
  }
  if (!patch || data.document !== undefined) result.document = normalizedDocument(data.document === undefined ? "" : data.document)
  if (!patch || data.active !== undefined) result.active = bool(data.active === undefined ? true : data.active, "Ativo")
  if (patch) {
    version(data.version)
    if (!Object.keys(result).length) throw new ApiError(400, "Informe os campos a alterar.")
  }
  return result
}

export async function listCustomers(request: Request) {
  const params = queryParams(request, ["q", "includeInactive"])
  const includeInactive = flag(params, "includeInactive")
  const q = text(params.get("q") ?? "", "Busca", 200)
  const search = `%${q.replace(/[\\%_]/g, "\\$&")}%`
  const digits = q.replace(/\D/g, "")
  return (await database().query(
    `SELECT * FROM customers WHERE ($1::boolean OR active=true)
      AND ($2='' OR company_name ILIKE $3 OR contact_name ILIKE $3 OR ($4<>'' AND document LIKE '%' || $4 || '%'))
      ORDER BY company_name,id`, [includeInactive, q, search, digits],
  )).rows.map(customerDto)
}

export async function createCustomer(input: unknown, seller: Seller) {
  const data = customerInput(input)
  const fields = Object.keys(columns) as (keyof typeof columns)[]
  return transaction(async (client) => {
    const result = await client.query(`INSERT INTO customers (${fields.map((key) => columns[key]).join(",")}) VALUES (${fields.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`, fields.map((key) => data[key]))
    await audit(client, seller.id, "CUSTOMER_CREATED", "customer", result.rows[0].id)
    return customerDto(result.rows[0])
  })
}

export async function updateCustomer(id: string, input: unknown, seller: Seller) {
  const data = customerInput(input, true)
  const expectedVersion = version((input as Record<string, unknown>).version)
  const fields = Object.keys(data) as (keyof typeof columns)[]
  return transaction(async (client) => {
    const current = (await client.query("SELECT version FROM customers WHERE id=$1 FOR UPDATE", [id])).rows[0]
    if (!current) throw new ApiError(404, "Cliente nao encontrado.")
    if (current.version !== expectedVersion) conflict()
    const result = await client.query(`UPDATE customers SET ${fields.map((key, i) => `${columns[key]}=$${i + 2}`).join(",")},version=version+1,updated_at=now() WHERE id=$1 RETURNING *`, [id, ...fields.map((key) => data[key])])
    await audit(client, seller.id, "CUSTOMER_UPDATED", "customer", id, { fields, previousVersion: expectedVersion })
    return customerDto(result.rows[0])
  })
}
