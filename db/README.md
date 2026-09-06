# Backend PostgreSQL

Backend Node.js para Next.js, sem acesso a banco durante import/build. Todas as rotas usam `runtime = nodejs`, execucao dinamica e `Cache-Control: no-store`. Requer deploy com servidor Next.js; exportacao estatica/GitHub Pages nao executa esta API.

## Ambiente

| Variavel | Uso |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 14+; configure TLS verificado na URL/infraestrutura. Nunca desabilite validacao de certificados. |
| `APP_URL` | URL publica da aplicacao, com protocolo e porta corretos. HTTPS obrigatorio em producao. Pode conter o base path. |
| `BUSINESS_TIME_ZONE` | Fuso IANA dos filtros de datas, padrao `America/Sao_Paulo`. |
| `SUPABASE_URL` | Origem HTTPS do projeto Supabase, sem path/query. |
| `SUPABASE_SERVICE_ROLE_KEY` | Segredo somente servidor, nunca variavel `NEXT_PUBLIC_*`. |
| `SUPABASE_STORAGE_BUCKET` | Bucket publico existente para imagens; nome com letras, numeros, `_` ou `-`. |
| `ADMIN_CODE`, `ADMIN_NAME`, `ADMIN_PASSWORD` | Credenciais explicitas para o script de criacao. Senha com 12 a 1024 caracteres. |
| `USER_ROLE` | Perfil do novo usuario: `ADMIN` (padrao), `SELLER` ou `OPERATIONS`. |
| `SEED_MOCK_PRODUCTS` | `1` para autorizar importacao opcional dos mocks. |

Dependencias previstas pelo projeto: `pg`, `@types/pg`, `sharp`, `tsx` (e `zod`, se usado pelas outras camadas). Este backend usa validadores proprios estritos, sem depender de Zod.

## Comandos

Defina o ambiente no processo/secret manager antes de executar. Os scripts nao carregam `.env.local` automaticamente; Node moderno aceita `--env-file=.env.local` se esse arquivo ja existir e estiver protegido.

```sh
node scripts/db-migrate.mjs
node scripts/create-user.mjs
node scripts/db-seed.mjs
node scripts/db-cleanup.mjs
node --import tsx --test tests/server*.test.ts
```

Nao foram adicionados aliases npm, pois `package.json` esta fora do escopo. `db-migrate.mjs` corresponde ao comando desejado `db:migrate`; `db-seed.mjs`, a `db:seed`.

Migrations em `db/migrations/NNN_nome.sql`: lock advisory transacional, ledger com SHA-256, todas as pendentes no mesmo commit; falha reverte tudo. Migrations ja aplicadas nao podem ser editadas/removidas nem receber predecessoras retroativas. CRLF/LF e normalizado no checksum. Use uma credencial de migration com DDL e uma credencial da aplicacao com apenas DML/uso de sequences quando configurar o ambiente.

`create-user.mjs` nao atualiza usuarios existentes e nao tem senhas padrao. Usa scrypt identico ao login e audita a criacao. `db-seed.mjs` importa mocks com novos UUIDs, preserva imagens locais, ignora SKUs existentes sem atualizar preco/saldo e registra estoque inicial e historico. Seed e opcional e deve ser usado apenas em ambiente explicitamente escolhido. `db-cleanup.mjs` remove somente sessoes expiradas e buckets de rate limit com mais de um dia; agende diariamente.

## Autenticacao e seguranca

- Login com codigo normalizado para maiusculas e senha scrypt (`N=16384,r=8,p=1`, salt aleatorio de 16 bytes, derivacao de 64 bytes). Usuario inexistente executa uma derivacao equivalente; falhas de credencial usam mensagem generica.
- Sessao opaca aleatoria de 32 bytes; somente SHA-256 no banco. Cookie `attivus_session`, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` em producao, duracao fixa de 12 horas (sem renovacao implicita). Logout apaga a sessao e o cookie; e idempotente mesmo com sessao expirada.
- Toda mutacao, inclusive login/logout/upload, exige `Origin` exatamente igual a origem de `APP_URL`; origem ausente, `null` e `Sec-Fetch-Site: cross-site` sao rejeitados. Clientes de API/CLI tambem devem enviar `Origin`. Sem CORS permissivo e sem confiar no Host recebido para CSRF.
- Rate limit persistente/atomico: 10 tentativas por codigo em 15 minutos e 300 globais por minuto; contadores incluem sucessos. Nao depende de IP/headers de proxy forjaveis. `429` inclui `Retry-After: 900` conservador. Para instalacoes maiores, ajustar os limites e adicionar protecao no proxy/WAF; limite global privilegia protecao contra tentativas em codigos arbitrarios, mas pode afetar disponibilidade sob ataque.
- Todas as leituras consultam sessao e usuario ativo no banco. Rotas protegidas autorizam perfil antes de processar o corpo. JSON limitado a 128 KiB, campos desconhecidos rejeitados, IDs UUID e versoes inteiras obrigatorias nos PATCH/ajustes.
- Respostas de erro: `{ "error": "mensagem segura" }`; `400` validacao, `401` sessao/credenciais, `403` perfil/origem, `404` ausente, `409` concorrencia/duplicidade/negocio, `413` tamanho, `415` formato, `429` limite, `500` erro interno, `502` falha de storage. Sem SQL, stack ou segredos na resposta/log.

## Endpoints

Prefixo `/api` (precedido pelo base path do Next.js, se houver). Respostas de sucesso sao DTOs diretos, sem envelope `data`.

| Metodo e path | Perfil | Resposta / comportamento |
| --- | --- | --- |
| `POST /auth/login` | Publico + CSRF | `{code,password}` -> `Seller`, cookie de sessao. |
| `GET /auth/session` | Autenticado | `Seller` ou 401. |
| `POST /auth/logout` | Publico + CSRF | `{ok:true}`, revoga sessao apresentada e limpa cookie. |
| `GET /products` | Todos | `Product[]` ativos; `manage=1` exige ADMIN/OPERATIONS e inclui inativos. Bloqueados continuam visiveis, mas nao podem ser vendidos. |
| `POST /products` | ADMIN | Campos do produto e `initialStock` opcional (0); retorna `Product`, 201. |
| `PATCH /products/:id` | ADMIN | Campos parciais + `version`; retorna `Product`. Nao aceita `stock`, `physicalStock`, `reservedStock` nem `initialStock`. |
| `GET /products/:id/stock` | ADMIN/OPERATIONS | `StockMovement[]`, mais recentes primeiro. |
| `POST /products/:id/stock` | ADMIN/OPERATIONS | `{delta,reason,version}`; retorna `Product` atualizado. Saldo fisico nunca abaixo da reserva. |
| `GET /customers` | Todos | `Customer[]`; `q` busca nome/contato/documento; `includeInactive=1` inclui inativos. |
| `POST /customers` | ADMIN/SELLER | Dados do cliente, `active` opcional; retorna `Customer`, 201. |
| `PATCH /customers/:id` | ADMIN/SELLER | Campos parciais + `version`, incluindo `active`; retorna `Customer`. |
| `POST /orders` | ADMIN/SELLER | `{customerId,items:[{productId,quantity,expectedPrice}],notes?,discountPercent?,idempotencyKey}` -> `Order`; 201 novo, 200 replay. |
| `GET /orders` | Todos | `OrderPage`; `page` 1..99999, `pageSize` fixo 20; filtros `from`, `to`, `customerId`, `sellerId`, `status`, `number` exato (zeros a esquerda aceitos). |
| `GET /orders/:id` | Todos | `Order` completo com itens, snapshots e eventos. |
| `PATCH /orders/:id/status` | ADMIN/OPERATIONS | `{status,version,reason?}` -> `Order`; motivo obrigatorio para cancelar. |
| `POST /uploads` | ADMIN | `FormData` com um unico campo `image` -> `{imageUrl}`, 201. |

Produtos: `sku` 1..80, `name` 1..200, `description` ate 4000, `category` 1..120, `unit` 1..20, preco 0..9999999.99 (2 casas), saldo fisico/minimo ate 1000000000 (3 casas), `quantityStep` 0.001..1000000 (3 casas). Defaults: descricao vazia, imagem null, estoque minimo 0, incremento 1, ativo true, bloqueado false. DTO sempre inclui `stock` disponivel, `physicalStock`, `reservedStock`, `minimumStock`, `quantityStep`, flags e `version`.

Clientes: `companyName` obrigatorio 1..200; documento opcional normalizado so para digitos (ate 32, unico quando preenchido); endereco ate 500, telefone ate 40, contato ate 160. Nao ha validacao de digitos verificadores de CPF/CNPJ. Edicao/inativacao nao altera snapshots de pedidos antigos.

Pedidos: 1..200 produtos distintos; quantidade 0.001..1000000 com ate 3 casas e multipla de `quantityStep`; desconto 0..100 com 2 casas; observacoes ate 4000; motivo ate 1000; idempotencyKey de 8..128 letras/digitos/`_`/`-`. UUID interno, numero comercial sequencial com no minimo 8 digitos (sequences podem ter lacunas apos rollback). Calculo BigInt em centavos/milesimos, arredondamento half-up por linha; subtotal soma linhas ja arredondadas, desconto arredondado sobre subtotal; total limitado a 999999999999.99. `items[].lineTotal` sempre presente.

Idempotencia e unica por vendedor, protegida por lock advisory antes de consultar/criar. Hash de payload validado/canonico, itens ordenados por UUID: reordenar itens e espacos externos nao muda identidade. Conteudo diferente retorna 409. Replay retorna o mesmo ID/numero e o estado atual do pedido, sem reservar novamente; header `Idempotency-Replayed`. Snapshots de vendedor, cliente e produtos persistem no banco.

Reservas aumentam `reservedStock` e a versao do produto sem baixar fisico. Transicoes seguem `lib/config/orders.ts`: PENDING -> PREPARING -> READY -> SHIPPED -> DELIVERED; cancelamento apenas antes de SHIPPED. SHIPPED consome reserva e baixa fisico com movimento; CANCELLED libera reserva sem movimento fisico; terminais nao mudam. Locks de produtos em ordem de UUID evitam inversao entre pedidos concorrentes. Audit, eventos, estoque e pedido fazem parte do mesmo commit. Consultas completas/paginadas usam snapshot repeatable-read; dias de filtros sao inclusivos no fuso de negocio (limite superior exclusivo no inicio do dia seguinte, nao +24h em UTC).

## Imagens e operacao

Upload le no maximo 5 MiB + 64 KiB de multipart, limita arquivo de entrada/saida a 5 MiB e decodificacao a 20 milhoes de pixels. Aceita JPEG/PNG/WebP estatico, rejeita animacoes/SVG, aplica orientacao e reencoda WebP removendo metadados. Upload REST servidor com UUID e sem upsert/redirecionamento; nenhuma escrita de imagem no filesystem. Somente URLs publicas do bucket configurado e caminhos locais estritos `/images/produtos/...` sao aceitos. Para mocks sob base path, o seed remove o prefixo antes de gravar; a camada de apresentacao deve aplicar base path a URLs locais quando necessario.

Bucket deve ser provisionado/publicado por operador, nao pelos scripts. Nao conceda escrita anonima no Storage. Imagens enviadas e nao vinculadas, ou falhas entre Storage e auditoria PostgreSQL, podem deixar objetos orfaos: nao existe transacao distribuida nem limpeza automatica de objetos. Backups, politicas de retencao/auditoria/LGPD, metricas/alertas, recuperacao de senha e administracao de usuarios fora do script ficam para operacao/futuras entregas. Historicos de estoque e listas de produtos/clientes retornam arrays completos pelo contrato; considerar API paginada em volumes maiores.

## Verificacao

Testes `tests/server*.test.ts` cobrem dinheiro, limites, incremento decimal, matriz de transicoes, validacoes, allowlist de imagens, senha/cookie, CSRF, parser e identidade canonica de pedidos. O teste do helper transacional usa driver mock para verificar commit/rollback, isolamento de leitura e descarte de conexoes quebradas. O teste de upload executa Sharp de verdade e substitui o REST por mock, verificando orientacao, remocao de metadados e rejeicao por formato/tamanho/pixels. Sao testes sem banco/cloud. Importar os modulos nao abre conexoes.

Antes de producao, executar testes de integracao em banco descartavel: migration/reexecucao/checksum, concorrencia de reserva e idempotencia, rollback por falta de estoque/preco, conflito de versao, expedicao/cancelamento, filtros em mudancas de fuso, rate limit concorrente, expiracao/revogacao de sessao e permissoes de cada rota. Validar upload real e politicas do bucket em ambiente de homologacao. Nao executar esses testes contra dados reais.
