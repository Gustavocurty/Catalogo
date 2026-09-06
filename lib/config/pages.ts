export function pageChrome(pathname: string, search: URLSearchParams) {
  const path = pathname.replace(/\/$/, "") || "/"

  if (path === "/perfil") return { title: "Perfil" }
  if (path === "/catalogo") return { title: "Catálogo de Produtos" }
  if (path === "/carrinho") return { title: "Revisão do Pedido" }
  if (path === "/produtos") return { title: "Produtos e estoque", backHref: "/perfil" }
  if (path === "/nota") return { title: "Nota do Pedido", backHref: "/pedidos" }
  if (path === "/pedidos") {
    return search.get("id")
      ? { title: "Pedido", backHref: "/pedidos" }
      : { title: "Pedidos" }
  }
  if (path === "/clientes") {
    if (search.get("new") === "1") {
      return {
        title: "Novo cliente",
        backHref: search.get("return") === "/carrinho" ? "/carrinho" : "/catalogo",
      }
    }
    return { title: "Clientes", backHref: "/perfil" }
  }
  return { title: "Catálogo Attivus" }
}
