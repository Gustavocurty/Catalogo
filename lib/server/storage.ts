import { randomUUID } from "node:crypto"
import { ApiError } from "./errors"

export function storageConfig() {
  const raw = process.env.SUPABASE_URL
  const bucket = process.env.SUPABASE_STORAGE_BUCKET
  if (!raw || !bucket || !/^[A-Za-z0-9_-]{1,100}$/.test(bucket)) throw new Error("Storage is not configured")
  const base = new URL(raw)
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash || base.pathname !== "/") throw new Error("Invalid storage URL")
  return { origin: base.origin, bucket, publicPrefix: `${base.origin}/storage/v1/object/public/${bucket}/` }
}

export function imageUrl(value: unknown): string | null {
  if (value === null) return null
  if (typeof value !== "string" || value.length > 2048) throw new ApiError(400, "URL da imagem invalida.")
  if (/^\/images\/produtos\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:webp|png|jpe?g)$/i.test(value)) return value
  let config: ReturnType<typeof storageConfig>
  try { config = storageConfig() } catch { throw new ApiError(400, "URL da imagem nao permitida.") }
  if (!value.startsWith(config.publicPrefix)) throw new ApiError(400, "URL da imagem nao permitida.")
  const key = value.slice(config.publicPrefix.length)
  if (!/^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:webp|png|jpe?g)$/i.test(key)) throw new ApiError(400, "URL da imagem nao permitida.")
  return value
}

export async function uploadImage(request: Request): Promise<{ imageUrl: string }> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) throw new ApiError(415, "Envie FormData com o campo image.")
  // Bound the entire multipart body before parsing, including chunked requests.
  const { readBody } = await import("./http")
  const body = await readBody(request, 5 * 1024 * 1024 + 64 * 1024)
  let form: FormData
  try { form = await new Response(body, { headers: { "Content-Type": request.headers.get("content-type")! } }).formData() }
  catch { throw new ApiError(400, "Upload invalido.") }
  const files = form.getAll("image")
  if (Array.from(form.keys()).some((key) => key !== "image") || files.length !== 1 || typeof files[0] === "string") throw new ApiError(400, "Envie uma imagem no campo image.")
  const file = files[0]
  if (!file.size || file.size > 5 * 1024 * 1024) throw new ApiError(413, "Imagem deve ter no maximo 5 MB.")
  const sharp = (await import("sharp")).default
  let encoded: Buffer
  try {
    const input = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 20000000, failOn: "warning", animated: true })
    const metadata = await input.metadata()
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || !metadata.width || !metadata.height || metadata.width * metadata.height > 20000000 || (metadata.pages ?? 1) !== 1) throw new Error("Invalid image")
    // Sharp strips EXIF/ICC/XMP by default; rotate applies orientation before removal.
    encoded = await input.rotate().webp({ quality: 85 }).toBuffer()
  } catch { throw new ApiError(400, "Imagem invalida. Use JPEG, PNG ou WebP estatico de ate 20 MP.") }
  if (encoded.byteLength > 5 * 1024 * 1024) throw new ApiError(413, "Imagem convertida excede 5 MB. Reduza a resolucao.")
  const config = storageConfig()
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error("Storage credentials not configured")
  const key = `products/${randomUUID()}.webp`
  const response = await fetch(`${config.origin}/storage/v1/object/${config.bucket}/${key}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, apikey: secret, "Content-Type": "image/webp", "x-upsert": "false" },
    body: new Uint8Array(encoded),
    signal: AbortSignal.timeout(30000),
    redirect: "error",
  })
  if (!response.ok) throw new ApiError(502, "Nao foi possivel armazenar a imagem.")
  return { imageUrl: `${config.publicPrefix}${key}` }
}
