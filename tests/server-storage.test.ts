import assert from "node:assert/strict"
import test from "node:test"
import sharp from "sharp"
import { uploadImage } from "../lib/server/storage"

test("upload decodes and reencodes WebP without metadata; REST is mocked", async (t) => {
  const previous = { url: process.env.SUPABASE_URL, bucket: process.env.SUPABASE_STORAGE_BUCKET, key: process.env.SUPABASE_SERVICE_ROLE_KEY }
  process.env.SUPABASE_URL = "https://example.supabase.co"
  process.env.SUPABASE_STORAGE_BUCKET = "catalog"
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-key"
  try {
    const image = await sharp({ create: { width: 4, height: 3, channels: 3, background: "red" } }).withMetadata({ orientation: 6 }).jpeg().toBuffer()
    let uploaded: Buffer | undefined
    t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
      assert.match(url, /^https:\/\/example\.supabase\.co\/storage\/v1\/object\/catalog\/products\/[a-f0-9-]+\.webp$/)
      assert.equal(options.method, "POST")
      assert.equal(options.redirect, "error")
      assert.equal(new Headers(options.headers).get("Authorization"), "Bearer test-only-key")
      uploaded = Buffer.from(options.body as Uint8Array)
      return new Response("{}", { status: 200 })
    })
    const form = new FormData()
    // MIME and filename are deliberately misleading: decoded content is authoritative.
    form.set("image", new Blob([new Uint8Array(image)], { type: "application/octet-stream" }), "untrusted.txt")
    const result = await uploadImage(new Request("https://app.test/api/uploads", { method: "POST", body: form }))
    assert.match(result.imageUrl, /^https:\/\/example\.supabase\.co\/storage\/v1\/object\/public\/catalog\/products\//)
    assert.ok(uploaded)
    const metadata = await sharp(uploaded).metadata()
    assert.equal(metadata.format, "webp")
    assert.equal(metadata.width, 3)
    assert.equal(metadata.height, 4)
    assert.equal(metadata.exif, undefined)
    assert.equal(metadata.icc, undefined)
    assert.equal(metadata.xmp, undefined)
  } finally {
    if (previous.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previous.url
    if (previous.bucket === undefined) delete process.env.SUPABASE_STORAGE_BUCKET; else process.env.SUPABASE_STORAGE_BUCKET = previous.bucket
    if (previous.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previous.key
  }
})

test("upload rejects oversized, invalid, SVG, duplicate and over-20MP images before network", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { assert.fail("Rejected upload must never reach storage") })
  const request = (bytes: Uint8Array, duplicate = false) => {
    const form = new FormData()
    form.append("image", new Blob([new Uint8Array(bytes)]), "image.png")
    if (duplicate) form.append("image", new Blob([new Uint8Array(bytes)]), "other.png")
    return new Request("https://app.test/api/uploads", { method: "POST", body: form })
  }
  await assert.rejects(uploadImage(request(new Uint8Array(5 * 1024 * 1024 + 1))), { status: 413 })
  await assert.rejects(uploadImage(request(new TextEncoder().encode("not an image"))), { status: 400 })
  await assert.rejects(uploadImage(request(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'))), { status: 400 })
  await assert.rejects(uploadImage(request(new Uint8Array([1]), true)), { status: 400 })
  const large = await sharp({ create: { width: 5000, height: 4001, channels: 3, background: "white" } }).png().toBuffer()
  await assert.rejects(uploadImage(request(large)), { status: 400 })
})
