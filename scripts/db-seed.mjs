import { require as tsxRequire } from "tsx/cjs/api"
import { run } from "./db-common.mjs"

const { products } = tsxRequire("../lib/mocks/index.ts", import.meta.url)
const { imageUrl } = tsxRequire("../lib/server/storage.ts", import.meta.url)
const { amount, text } = tsxRequire("../lib/server/validation.ts", import.meta.url)

if (process.env.SEED_MOCK_PRODUCTS !== "1") {
  console.error("Optional demo import requires SEED_MOCK_PRODUCTS=1. Existing SKUs are never updated.")
  process.exitCode = 1
} else {
  await run(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('attivus:seed-products',0))")
    let count = 0
    for (const product of products) {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
      const sourceImage = basePath && product.imageUrl?.startsWith(`${basePath}/images/produtos/`) ? product.imageUrl.slice(basePath.length) : product.imageUrl
      const stock = amount(product.physicalStock ?? product.stock, 3, 1000000000, "Stock")
      const price = amount(product.price, 2, 9999999.99, "Price")
      const result = await client.query(
        `INSERT INTO products (sku,name,description,category,unit,price,image_url,physical_stock,minimum_stock,quantity_step,active,sale_blocked)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (sku) DO NOTHING RETURNING id`,
        [text(product.sku, "SKU", 80, 1), text(product.name, "Name", 200, 1), text(product.description, "Description", 4000), text(product.category, "Category", 120, 1), text(product.unit, "Unit", 20, 1),
          price, imageUrl(sourceImage), stock, amount(product.minimumStock ?? 0, 3, 1000000000, "Minimum stock"), amount(product.quantityStep ?? 1, 3, 1000000, "Step", 0.001), product.active ?? true, product.saleBlocked ?? false],
      )
      if (!result.rowCount) continue
      const id = result.rows[0].id
      if (stock !== 0) await client.query("INSERT INTO stock_movements (product_id,quantity,kind,reason,actor_name) VALUES ($1,$2,'INITIAL','Importacao opcional de demonstracao','Seed')", [id, stock])
      await client.query("INSERT INTO price_history (product_id,new_price) VALUES ($1,$2)", [id, price])
      await client.query("INSERT INTO audit_log (action,entity_type,entity_id) VALUES ('PRODUCT_SEEDED','product',$1)", [id])
      count++
    }
    console.log(`${count} demo product(s) inserted; existing SKUs left unchanged; committing transaction.`)
  })
}
