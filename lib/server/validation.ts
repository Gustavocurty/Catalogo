import type { OrderStatus } from "../types"
import { ORDER_TRANSITIONS } from "../config/orders"
import { ApiError } from "./errors"
import { scaled } from "./money"

export function object(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "Objeto JSON invalido.")
  const result = value as Record<string, unknown>
  if (Object.keys(result).some((key) => !allowed.includes(key))) throw new ApiError(400, "Campo desconhecido na requisicao.")
  return result
}

export function text(value: unknown, name: string, max: number, min = 0): string {
  if (typeof value !== "string") throw new ApiError(400, `${name} invalido.`)
  const result = value.trim()
  if (result.length < min || result.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(result)) throw new ApiError(400, `${name} invalido.`)
  return result
}

export function uuid(value: unknown, name = "ID"): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new ApiError(400, `${name} invalido.`)
  return value.toLowerCase()
}

export function version(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 2147483646) throw new ApiError(400, "Version obrigatoria e invalida.")
  return value
}

export function bool(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") throw new ApiError(400, `${name} invalido.`)
  return value
}

export function amount(value: unknown, places: number, max: number, name: string, min = 0): number {
  scaled(value, places, max, name, min)
  return value as number
}

export function normalizedDocument(value: unknown): string {
  const document = text(value, "Documento", 40)
  if (!/^[\d.\-/\s]*$/.test(document)) throw new ApiError(400, "Documento invalido.")
  const normalized = document.replace(/\D/g, "")
  if (normalized.length > 32 || (document !== "" && normalized === "")) throw new ApiError(400, "Documento invalido.")
  return normalized
}

export function status(value: unknown): OrderStatus {
  if (typeof value !== "string" || !Object.hasOwn(ORDER_TRANSITIONS, value)) throw new ApiError(400, "Status invalido.")
  return value as OrderStatus
}

export function validateTransition(from: OrderStatus, to: OrderStatus, reason: string) {
  if (!ORDER_TRANSITIONS[from].includes(to)) throw new ApiError(409, "Transicao de status nao permitida.")
  if (to === "CANCELLED" && !reason.trim()) throw new ApiError(400, "Informe o motivo do cancelamento.")
}

export function day(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01" || value > "9998-12-31") throw new ApiError(400, "Data invalida. Use YYYY-MM-DD.")
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new ApiError(400, "Data invalida.")
  return value
}

export function queryParams(request: Request, allowed: string[]): URLSearchParams {
  const params = new URL(request.url).searchParams
  const seen = new Set<string>()
  for (const [key] of params) {
    if (!allowed.includes(key) || seen.has(key)) throw new ApiError(400, "Parametro de consulta invalido.")
    seen.add(key)
  }
  return params
}

export function flag(params: URLSearchParams, key: string): boolean {
  const value = params.get(key)
  if (value !== null && value !== "1" && value !== "0") throw new ApiError(400, `${key} invalido.`)
  return value === "1"
}
