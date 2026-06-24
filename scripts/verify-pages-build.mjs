import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
const indexHtml = readFileSync("out/index.html", "utf8")

if (basePath && !indexHtml.includes(`${basePath}/_next/`)) {
  console.error(`ERRO: index.html não contém assets com basePath "${basePath}".`)
  console.error("Trecho do HTML:", indexHtml.slice(0, 800))
  process.exit(1)
}

if (!basePath && indexHtml.includes('href="/_next/')) {
  console.error("ERRO: build de produção sem basePath — CSS/JS vão falhar no GitHub Pages.")
  process.exit(1)
}

const chunksDir = join("out", "_next", "static", "chunks")
const cssFiles = readdirSync(chunksDir).filter((file) => file.endsWith(".css"))

if (cssFiles.length === 0) {
  console.error("ERRO: nenhum arquivo CSS gerado em out/_next/static/chunks.")
  process.exit(1)
}

console.log(`Build OK: basePath="${basePath || "(vazio)"}", ${cssFiles.length} arquivo(s) CSS.`)
