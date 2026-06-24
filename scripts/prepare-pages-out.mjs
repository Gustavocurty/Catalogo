import { copyFileSync, existsSync, writeFileSync } from "node:fs"

writeFileSync("out/.nojekyll", "")

if (existsSync("out/index.html")) {
  copyFileSync("out/index.html", "out/404.html")
}
