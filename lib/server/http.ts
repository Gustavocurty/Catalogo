import type { Seller } from "../types"
import { authenticate, authorize } from "./auth"
import { ApiError } from "./errors"
import { queryParams } from "./validation"

export function assertOrigin(request: Request) {
  const configured = process.env.APP_URL
  if (!configured) throw new Error("APP_URL is not configured")
  const app = new URL(configured)
  if (!["https:", "http:"].includes(app.protocol) || app.username || app.password || app.search || app.hash) throw new Error("Invalid APP_URL")
  if (process.env.NODE_ENV === "production" && app.protocol !== "https:") throw new Error("APP_URL must use HTTPS in production")
  if (request.headers.get("origin") !== app.origin || request.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "Origem da requisicao nao permitida.")
}

export async function readBody(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  const length = request.headers.get("content-length")
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) throw new ApiError(413, "Requisicao muito grande.")
  if (!request.body) throw new ApiError(400, "Corpo da requisicao obrigatorio.")
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new ApiError(413, "Requisicao muito grande.")
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return bytes
}

export async function jsonBody(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new ApiError(415, "Envie application/json.")
  const body = await readBody(request, 128 * 1024)
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)) }
  catch { throw new ApiError(400, "JSON invalido.") }
}

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, { status, headers })
}

export type RouteContext = { params: Promise<Record<string, string>> }
type Handler = (request: Request, seller: Seller, context: RouteContext) => Promise<Response | unknown>

export function route(handler: Handler, options: { public?: boolean; roles?: Seller["role"][] } = {}) {
  return async (request: Request, context: RouteContext): Promise<Response> => {
    let response: Response
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
        assertOrigin(request)
        queryParams(request, [])
      }
      const seller = options.public ? null : await authenticate(request)
      if (options.roles && seller) authorize(seller, options.roles)
      const result = await handler(request, seller as Seller, context)
      response = result instanceof Response ? result : json(result)
    } catch (error) {
      if (error instanceof ApiError) {
        response = json({ error: error.message }, error.status, error.status === 429 ? { "Retry-After": "900" } : undefined)
      } else {
        const code = (error as { code?: string })?.code
        if (code === "23505") response = json({ error: "Registro duplicado (codigo, SKU ou documento)." }, 409)
        else if (["40001", "40P01", "55P03"].includes(code ?? "")) response = json({ error: "Conflito concorrente. Tente novamente." }, 409)
        else {
          // Never log request bodies, credentials, SQL parameters or provider errors.
          console.error("API request failed", { method: request.method, code: /^[0-9A-Z]{5}$/.test(code ?? "") ? code : "INTERNAL" })
          response = json({ error: "Nao foi possivel concluir a operacao." }, 500)
        }
      }
    }
    response.headers.set("Cache-Control", "no-store")
    response.headers.set("Vary", "Cookie, Origin")
    response.headers.set("X-Content-Type-Options", "nosniff")
    return response
  }
}
