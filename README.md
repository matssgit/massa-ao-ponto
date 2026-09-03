# 🍕 Massa ao Ponto

> Sistema de gestão e operação para uma pizzaria, desenvolvido como projeto de portfólio com foco em arquitetura de software, regras de negócio, persistência relacional, concorrência e testes automatizados.

🚧 **Status: Em desenvolvimento**

O Massa ao Ponto é desenvolvido incrementalmente através de **feature slices**, mantendo cada funcionalidade isolada por domínio e atravessando as camadas de persistência, negócio e HTTP.

O objetivo não é construir apenas uma API CRUD, mas demonstrar como decisões de arquitetura, modelagem de domínio, transações, concorrência e testes podem ser aplicadas em um sistema próximo de um cenário real.

---

## 🚀 Status do projeto

| Módulo               | Status                                     |
| -------------------- | ------------------------------------------ |
| Infraestrutura       | ✅ Concluído                               |
| Restaurantes         | ✅ Criação, leitura e atualização          |
| Mesas                | ✅ Criação, listagem e atualização         |
| Clientes             | ✅ Listagem, consulta e histórico          |
| Reservas             | ✅ Milestone 1 concluído                   |
| Disponibilidade      | ✅ Concluído                               |
| Catálogo de Produtos | ✅ Gestão completa                         |
| Pedidos / Orders     | ✅ Ciclo operacional completo              |
| Dine-In              | ✅ Pedidos presenciais e controle de mesas |
| Delivery             | ✅ Criação, início e conclusão             |
| Pagamentos           | ✅ Pagamento simulado                      |
| Dashboard            | ✅ Consultas analíticas                    |
| Automações           | ⏳ Planejado                               |

### Estado atual

- **Etapa atual:** 26
- **Testes automatizados:** 272
- **TypeScript:** strict
- **Banco:** PostgreSQL
- **ORM:** Drizzle
- **HTTP:** Fastify
- **Validação:** Zod
- **Testes:** Vitest + E2E com PostgreSQL real

---

# 🏗️ Arquitetura

O projeto utiliza um **Monolito Modular**, organizado por domínios e feature slices.

A estrutura busca manter as regras de negócio independentes da infraestrutura HTTP e da persistência.

Cada módulo segue, de forma geral, a organização:

```text
modules/
└── <domain>/
    ├── controllers/
    ├── errors/
    ├── repositories/
    ├── schemas/
    └── use-cases/
```

A arquitetura utiliza:

- **TypeScript** com `strict`;
- **Fastify** para HTTP;
- **Zod** para validação na borda;
- **Drizzle ORM** para persistência;
- **PostgreSQL** como banco de dados;
- **Vitest** para testes;
- testes E2E através de `app.inject()`;
- PostgreSQL real nos testes de integração;
- Repository Pattern com implementações **InMemory** e **Drizzle**;
- Transaction Managers para operações atômicas;
- Row-Level Locking (`SELECT ... FOR UPDATE`) nos fluxos que exigem controle de concorrência;
- históricos **append-only** para auditoria.

A prioridade arquitetural é manter o sistema:

- explícito;
- testável;
- orientado às regras de negócio;
- sem abstrações prematuras;
- sem dependências desnecessárias;
- sem acoplamento desnecessário entre os domínios.

---

# 🖥️ Frontend web — execução local

`apps/web` contém a fundação React + TypeScript + Vite: login, bootstrap de sessão, logout, seleção de restaurante e navegação protegida. As páginas operacionais ainda não exibem dados nem executam CRUD. Não há signup público.

Use Node.js 22.13+ da linha 22 ou 24+ (validado com 24.19.0) e o pnpm do workspace. Na raiz:

```bash
pnpm install --frozen-lockfile
```

Crie `apps/web/.env.local` conforme `apps/web/.env.example`, configurando `VITE_API_URL` com a URL HTTP(S) pública do backend. Em desenvolvimento local, o exemplo aponta para `http://localhost:3333`. `VITE_*` é incorporado ao bundle público: nunca coloque senhas, tokens ou credenciais de banco nessas variáveis. Ausência/URL inválida mostra um erro de configuração e não tenta uma API implícita.

No ambiente do backend, configure `AUTH_ALLOWED_ORIGINS` com a origin exata exibida pelo Vite (por exemplo, `http://localhost:5173`) e a política de cookie local descrita abaixo. Em terminais separados, na raiz:

```bash
pnpm dev:backend
```

```bash
pnpm dev:web
```

O Vite usa porta estrita: se ela estiver ocupada, ajuste explicitamente a porta e a allowlist em conjunto. Use o mesmo hostname nos dois lados; não misture `localhost` e `127.0.0.1`. Para autenticar, use uma conta criada pelo procedimento administrativo abaixo. Nenhuma credencial de demonstração é incluída.

O client envia `credentials: include`, `X-Auth-Request: 1` nas mutações e CSRF nas mutações autenticadas. Login é seguido por `GET /auth/session`. CSRF e restaurante selecionado ficam somente em memória; cookies continuam sob controle do navegador. OWNER vê Relatórios/Configurações; STAFF mantém a navegação operacional. Isso não substitui a autorização do backend.

Validação em `apps/web`:

```bash
pnpm typecheck
pnpm test
pnpm build
```

O build gera `apps/web/dist`; configure `VITE_API_URL` para o destino antes do build. Uma futura hospedagem deve encaminhar rotas SPA para `index.html` e respeitar HTTPS/CORS/cookies same-site. A 38A não publica a aplicação. Não há lint configurado. Os testes frontend usam Vitest/Testing Library com transporte HTTP simulado; o fluxo completo com conta real em navegador ainda precisa de validação operacional.

# 🔑 Autenticação por sessão

O runtime de auth usa User separado de Customer e sessão opaca persistida no PostgreSQL. As rotas de negócio exigem sessão válida e, quando vinculadas a um restaurante, membership ativa e role permitida. CORS usa allowlist explícita com credentials, e login possui rate limiting local. O provisionamento inicial é exclusivamente administrativo, pelo comando abaixo. **Proteção distribuída continua pendente; esta etapa não libera exposição pública.**

| Endpoint | Contrato |
| --- | --- |
| `POST /auth/login` | Body `{ email, password }`; retorna `200 { user: { id, email } }` e cookie HttpOnly |
| `GET /auth/session` | Retorna `200 { user: { id, email }, memberships: [{ restaurantId, role }], csrfToken }`; sessão inválida retorna 401 |
| `POST /auth/logout` | Exige sessão válida e CSRF; revoga a sessão, limpa o cookie e retorna 204; sessão ausente/inválida retorna 401 |

O login normaliza e-mail com trim/lowercase e verifica senha com Argon2id. Credenciais incorretas, e-mail inexistente e User inativo retornam o mesmo `401 { code: "INVALID_CREDENTIALS", message: "Invalid email or password." }`. Não existe signup público nem provisionamento HTTP de usuários nesta etapa.

O cookie contém apenas o identificador aleatório da sessão; o banco guarda somente seu hash SHA-256. A consulta de sessão retorna apenas memberships ativas do User autenticado, ordenadas por `restaurantId`, ou `[]`. O frontend pode selecionar um restaurante, mas o backend consulta novamente a membership a cada request; alterar o `restaurantId` da URL não concede acesso.

Para login e todas as mutações autenticadas, envie `Origin` permitido e `X-Auth-Request: 1`. Após o login, obtenha `csrfToken` em `GET /auth/session` e envie-o em `X-CSRF-Token` no logout e nas mutações de negócio. O token é vinculado à sessão; CSRF ausente/incorreto recebe `403 INVALID_CSRF`, sem mutação. As respostas usam `Cache-Control: no-store`. O frontend deve deixar o cookie sob controle do navegador e manter o token CSRF apenas em memória, nunca o identificador de sessão em localStorage.

Política por restaurante:

| Role | Acesso |
| --- | --- |
| `OWNER` | Acesso completo às operações disponíveis do restaurante |
| `STAFF` | Orders, Reservations, Delivery e leituras operacionais; não pode confirmar pagamento |
| Somente `OWNER` | Atualização de Restaurant, administração de Tables/Catalog, Analytics e confirmação de pagamento |

Sessão ausente, expirada ou revogada retorna `401 UNAUTHENTICATED`; membership ausente/inativa retorna `404 RESTAURANT_NOT_FOUND`, sem revelar a existência global do restaurante; role insuficiente retorna `403 FORBIDDEN`. Recursos cross-tenant preservam os 404 de seus domínios. As respostas mantêm `{ code, message }`. A autenticação precede a validação dos parâmetros da rota.

Configuração dos endpoints:

- `AUTH_ALLOWED_ORIGINS`: allowlist compartilhada por CORS e CSRF, com origins exatas separadas por vírgula, sem caminho, barra final ou wildcard. Não há URLs implícitas no runtime: em desenvolvimento, ausência deixa a lista vazia e bloqueia login/mutações; em produção, ausência impede o startup. Inclua também a origin da aplicação quando usar proxy de mesma origem.
- `NODE_ENV=production`: exige origins explícitas HTTPS e cookie `__Host-massa-session; Secure; HttpOnly; SameSite=Lax; Path=/`, sem Domain. Configuração insegura impede o startup.
- Em HTTP local, o cookie chama-se `massa-session`. `AUTH_COOKIE_SECURE=true` permite usar o cookie seguro também fora de produção; `false` é rejeitado em produção.
- `AUTH_SESSION_TTL_SECONDS`: prazo absoluto, default 28800 (8 horas); `AUTH_SESSION_IDLE_SECONDS`: inatividade máxima, default 1800 (30 minutos). Ambos aceitam inteiros de 60 a 604800; inatividade não pode exceder o prazo absoluto.
- Validar uma sessão atualiza `lastActivityAt`, sem estender `expiresAt`. Sessões expiradas, revogadas ou de User inativo recebem `401 UNAUTHENTICATED`.
- `AUTH_LOGIN_RATE_LIMIT_MAX`: tentativas por IP, default 20, inteiro entre 1 e 100.
- `AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS`: janela fixa a partir da primeira tentativa, default 300 (5 minutos), inteiro entre 60 e 3600. Valores inválidos impedem o startup; os defaults também valem em produção, sem flag para desativação.

O limiter atua somente em `POST /auth/login`, após a proteção de Origin e antes de parsing/verificação de senha. Tentativas válidas, credenciais inválidas e bodies malformados que chegam ao limiter consomem a mesma cota; sucesso não a reinicia. Excesso retorna `429 { code: "AUTH_RATE_LIMIT", message: "Too many login attempts. Please try again later." }` com `Retry-After` em segundos, exposto via CORS. Requests bloqueados não estendem a janela nem causam ban permanente. Consulta de sessão, logout e OPTIONS não consomem essa cota.

A chave é o IP reconhecido pelo Fastify, sem e-mail ou senha. Não há cota global por e-mail; pessoas no mesmo IP/NAT compartilham a cota. `trustProxy` permanece desabilitado: headers encaminhados não mudam a chave, e um reverse proxy fará seus clientes compartilharem o IP do proxy até existir configuração explícita e confiável. O store em memória do plugin atende somente desenvolvimento/single-instance; reinício/evicção perde contadores, múltiplos processos não compartilham limites e rotação de IPs não é resolvida. Rajadas concorrentes acima da cota podem ser rejeitadas integralmente pelo store local. Antes de deploy distribuído, é necessário store compartilhado e revisão da topologia de proxy; Redis não foi implementado.

A configuração pode ser fornecida pelo ambiente ou pelo `.env` do backend. Exemplos (substitua pelas origins reais):

```dotenv
# Desenvolvimento HTTP local
NODE_ENV=development
AUTH_ALLOWED_ORIGINS=http://localhost:5173
AUTH_COOKIE_SECURE=false
```

```dotenv
# Produção HTTPS
NODE_ENV=production
AUTH_ALLOWED_ORIGINS=https://admin.example.com
AUTH_COOKIE_SECURE=true
```

CORS responde com `Access-Control-Allow-Credentials: true` e somente a origin exata autorizada, nunca `*`. O frontend deve usar `credentials: "include"` no login, consulta de sessão, logout e demais requests. Preflight `OPTIONS` válido retorna 204 sem sessão/CSRF; os métodos anunciados são GET, HEAD, POST, PATCH, DELETE e OPTIONS, e os headers permitidos são Content-Type, X-Auth-Request e X-CSRF-Token. Origin não autorizada não recebe `Access-Control-Allow-Origin`; isso bloqueia a leitura pelo navegador, não substitui autenticação nem CSRF. Preflight sem Origin ou Access-Control-Request-Method retorna 400.

`SameSite=Lax` é preservado: use frontend/API no mesmo site (por exemplo, subdomínios HTTPS do mesmo domínio, ou localhost com portas diferentes), ou proxy de mesma origem. Sites distintos não recebem o cookie em fetch cross-site apenas por habilitar CORS. Não misture localhost e 127.0.0.1 entre frontend/API. GET não modifica dados de negócio; mantém somente a atualização já existente de atividade da sessão. Rate limiting distribuído continua pendente; `POST /restaurants` permanece bloqueado.

## Provisionamento administrativo inicial

Em terminal local confiável, com acesso administrativo ao PostgreSQL e migrations `0000`–`0010` já aplicadas, forneça as variáveis abaixo **somente no ambiente da execução**. Confirme o banco de destino em `DATABASE_URL` antes de executar; o comando não pede confirmação interativa nem aplica migrations.

| Variável | Entrada obrigatória |
| --- | --- |
| `PROVISION_OWNER_EMAIL` | E-mail válido; normalizado com trim/lowercase |
| `PROVISION_OWNER_PASSWORD` | Senha de 12–1024 caracteres; será armazenada somente como hash Argon2id |
| `PROVISION_RESTAURANT_NAME` | Nome, 1–255 caracteres |
| `PROVISION_RESTAURANT_ADDRESS` | Endereço, 1–255 caracteres |
| `PROVISION_RESTAURANT_PHONE` | Telefone, 1–50 caracteres |
| `PROVISION_RESTAURANT_TIMEZONE` | Timezone, 1–100 caracteres, conforme o contrato atual de Restaurant |

Execute a partir de `apps/backend`:

```bash
pnpm auth:provision-owner
```

`DATABASE_URL` usa a configuração existente do backend (ambiente ou `.env`). As entradas de provisionamento são validadas antes de carregar esse `.env`: não grave senha nem variáveis `PROVISION_*` em arquivos do repositório. Injete o segredo por ferramenta confiável ou prompt mascarado; não digite a senha literalmente em comandos que fiquem no histórico. O comando rejeita argumentos. Remova as variáveis de provisionamento do terminal após a execução; variáveis de ambiente não protegem contra administradores/processos locais privilegiados.

O comando cria um User ativo, um Restaurant novo e uma membership `OWNER` ativa na mesma transação. Reutiliza o Use Case de criação de Restaurant. E-mail já existente, inclusive de User inativo, causa falha sem adoção ou sobrescrita; membership duplicada também falha. O modelo não possui unicidade por nome/endereço de Restaurant: nomes repetidos são permitidos. Qualquer falha durante a transação desfaz os três registros.

Sucesso retorna os identificadores `userId`, `restaurantId` e `membershipId` e código de saída 0; falha retorna mensagem administrativa sanitizada e saída 1. Nenhuma sessão é criada, nenhuma senha/hash/token é impressa e nenhum endpoint HTTP é chamado. Depois, o proprietário usa o login existente. Se a conexão cair durante a confirmação do commit, confira o estado antes de repetir; o comando nunca adota uma conta existente. `POST /restaurants` continua bloqueado; não há signup público.

---

# 🍽️ Restaurantes

O módulo de restaurantes fornece a base de isolamento dos demais domínios.

### Funcionalidades

- provisionamento inicial por comando administrativo; criação HTTP de restaurantes permanece bloqueada;
- listagem somente de restaurantes com membership ativa do User, por `name ASC, id ASC`;
- consulta individual mediante membership ativa;
- atualização administrativa de `name`, `address`, `phone` e `timezone`;
- identificação do restaurante através de `restaurantId`;
- utilização do restaurante como tenant dos módulos relacionados.

```http
PATCH /restaurants/:restaurantId
```

Essa mutação exige membership ativa com role `OWNER`. `GET /restaurants` exige sessão e retorna somente restaurantes autorizados; `GET /restaurants/:restaurantId` exige membership. `POST /restaurants` retorna 403 para usuários autenticados e 401 sem sessão: não há criação global nem fluxo público de provisionamento.

Os demais recursos que pertencem a uma pizzaria carregam o `restaurantId` quando a regra de negócio exige isolamento explícito.

---

# 🪑 Mesas

O módulo de mesas representa os recursos físicos disponíveis no restaurante.

### Funcionalidades

- criação de mesas;
- listagem por restaurante;
- atualização tenant-aware de `number`, `capacity`, `type` e `active`;
- capacidade de pessoas;
- controle de mesa ativa/inativa;
- prevenção de números de mesa duplicados dentro do restaurante.

```http
PATCH /restaurants/:restaurantId/tables/:tableId
```

A listagem usa ordenação determinística por `number ASC, id ASC`.

A ocupação não é armazenada diretamente como uma flag.

Em contextos presenciais, a ocupação é derivada semanticamente dos pedidos `DINE_IN` ativos.

---

# 👤 Clientes

Clientes são entidades independentes utilizadas principalmente pelo domínio de Reservas e Orders.

### Funcionalidades

- listagem administrativa por restaurante;
- consulta individual;
- histórico de reservas;
- reutilização de clientes através do telefone;
- relacionamento com reservas e pedidos.

O cliente é criado ou reutilizado durante determinados fluxos, evitando duplicação desnecessária de registros.

A listagem administrativa expõe somente clientes relacionados ao restaurante por Reservation ou Order:

```text
GET /restaurants/:restaurantId/customers?page=1&limit=20&search=termo
```

Ela retorna `{ data, meta }`, aceita busca por nome, telefone canônico ou e-mail e usa ordenação determinística por `name ASC, id ASC`.

---

# 📅 Reservas

O domínio de Reservas foi o primeiro grande ciclo funcional do projeto.

## Criação

Endpoint:

```text
POST /restaurants/:restaurantId/reservations
```

A criação contempla:

- validação de restaurante;
- validação de mesa;
- validação de capacidade;
- validação de mesa ativa;
- validação de pertencimento da mesa ao restaurante;
- normalização do telefone para somente dígitos e reutilização/criação do cliente;
- validação de intervalo de horário;
- prevenção de conflitos;
- transação atômica;
- registro de histórico.

### Intervalos de tempo

As reservas utilizam intervalos semiabertos:

```text
[startsAt, endsAt)
```

Assim:

```text
[19:00, 21:00)
[21:00, 23:00)
```

não possuem conflito.

A sobreposição é determinada pela condição:

```text
existing.startsAt < new.endsAt
AND
existing.endsAt > new.startsAt
```

Somente reservas nos estados `SCHEDULED` e `CONFIRMED` bloqueiam a mesa.

---

## Máquina de estados

As reservas possuem uma State Machine própria:

```text
SCHEDULED
   ├──→ CONFIRMED
   └──→ CANCELLED  (endpoint dedicado de cancelamento)

CONFIRMED
   ├──→ FINISHED
   ├──→ NO_SHOW
   └──→ CANCELLED  (endpoint dedicado de cancelamento)
```

O endpoint genérico de status controla `CONFIRMED`, `FINISHED` e `NO_SHOW`. `CANCELLED` é produzido exclusivamente pelo endpoint dedicado de cancelamento.

O Zod valida somente a estrutura do payload e os valores pertencentes ao enum.

---

## Cancelamento

Endpoint:

```text
PATCH /restaurants/:restaurantId/reservations/:reservationId/cancel
```

O cancelamento possui uma janela mínima de antecedência de **2 horas**.

A regra é implementada no domínio e recebe o horário atual como dependência de entrada, permitindo testes determinísticos sem depender do relógio do sistema.

---

## Disponibilidade

Endpoint:

```text
GET /restaurants/:restaurantId/availability
```

A consulta:

- considera apenas mesas ativas;
- pode filtrar por capacidade;
- identifica reservas conflitantes;
- ignora reservas canceladas, finalizadas e no-show;
- permite horários adjacentes;
- não utiliza locks de escrita.

A leitura utiliza consultas separadas e processamento com `Set` no Use Case, evitando operações desnecessariamente pesadas no banco.

---

## Histórico

Endpoint:

```text
GET /restaurants/:restaurantId/reservations/:reservationId/history
```

O histórico é **append-only**.

Alterações relevantes geram eventos contendo:

- ação;
- status anterior;
- novo status;
- observação;
- data da alteração.

Reserva e histórico são persistidos na mesma transação quando ocorre uma alteração de estado.

---

# 🍕 Catálogo de Produtos

O catálogo é responsável pela gestão dos produtos comercializados pelo restaurante.

## Categorias

Endpoints:

```text
POST  /restaurants/:restaurantId/product-categories
GET   /restaurants/:restaurantId/product-categories
GET   /restaurants/:restaurantId/product-categories/:categoryId
PATCH /restaurants/:restaurantId/product-categories/:categoryId
PATCH /restaurants/:restaurantId/product-categories/:categoryId/toggle-status
DELETE /restaurants/:restaurantId/product-categories/:categoryId
```

As categorias possuem:

- criação;
- listagem;
- consulta individual;
- atualização parcial;
- ativação/desativação;
- exclusão protegida.

Uma categoria não pode ser removida enquanto possuir produtos associados.

---

## Produtos

Endpoints:

```text
POST   /restaurants/:restaurantId/products
GET    /restaurants/:restaurantId/products
PATCH  /restaurants/:restaurantId/products/:productId
PATCH  /restaurants/:restaurantId/products/:productId/toggle-status
DELETE /restaurants/:restaurantId/products/:productId
```

As funcionalidades incluem:

- criação;
- listagem;
- filtros por categoria;
- filtros por status;
- atualização parcial;
- ativação/desativação;
- exclusão;
- validação de categoria;
- isolamento por restaurante.

### Preços

Valores monetários são armazenados como inteiros em centavos:

```text
R$ 35,90 → 3590
```

Isso elimina problemas de precisão associados ao uso de ponto flutuante.

### Preservação histórica

Produtos que já participaram de pedidos não podem ser removidos.

Os pedidos armazenam snapshots de:

- nome do produto;
- preço unitário.

Dessa forma, alterações futuras no catálogo não modificam pedidos históricos.

---

# 🛒 Orders — Pedidos

Orders é atualmente o maior domínio operacional do sistema.

O pedido concentra os fluxos de venda, operação da cozinha, pagamento, delivery e atendimento presencial.

---

## Criação

Endpoint:

```text
POST /restaurants/:restaurantId/orders
```

A criação contempla:

- `DELIVERY`;
- `PICKUP`;
- `DINE_IN`;
- validação de produtos;
- validação de produtos ativos;
- validação de pertencimento ao restaurante;
- prevenção de produtos duplicados;
- validação de quantidade;
- cálculo server-side;
- valores monetários em centavos;
- snapshot dos produtos;
- snapshot do cliente;
- snapshot do endereço de entrega;
- criação atômica do pedido, itens e histórico.

O body deve identificar o cliente de exatamente uma forma:

- `customerId`, quando o cliente já possui relação com o restaurante;
- `customer` com `name`, `phone` e `email` opcional, para onboarding ou resolução pelo telefone.

No fluxo por `customer`, o telefone é normalizado para somente dígitos antes da resolução.

O backend nunca confia nos totalizadores enviados pelo cliente.

---

# 📦 Order Items

Cada item do pedido possui um snapshot próprio.

Exemplo:

```text
product_name
unit_price
quantity
subtotal
```

Se o produto sofrer uma alteração posteriormente:

```text
Pizza Calabresa → Pizza Calabresa Especial
R$ 49,90 → R$ 59,90
```

os pedidos antigos continuam representando exatamente o estado do produto no momento da compra.

---

# 🔄 Máquina de Estados dos Pedidos

Endpoint:

```text
PATCH /restaurants/:restaurantId/orders/:orderId/status
```

O fluxo compartilhado de cozinha é:

```text
PENDING
   ↓
CONFIRMED
   ↓
PREPARING
   ↓
READY
```

Para pedidos `DELIVERY`, as transições logísticas não são realizadas por esse endpoint:

```text
READY
   ↓  PATCH /restaurants/:restaurantId/orders/:orderId/delivery/start
OUT_FOR_DELIVERY
   ↓  PATCH /restaurants/:restaurantId/orders/:orderId/delivery/complete
DELIVERED
```

Pedidos `PICKUP` e `DINE_IN` finalizam diretamente em `READY → DELIVERED` pela atualização genérica. Eles não entram em `OUT_FOR_DELIVERY`.

`DELIVERED` e `CANCELLED` são estados finais. O cancelamento não é aceito pela atualização genérica; ele pertence ao endpoint dedicado `PATCH /restaurants/:restaurantId/orders/:orderId/cancel`.

As transições são protegidas exclusivamente pelo domínio.

---

# ❌ Cancelamento

Endpoint:

```text
PATCH /restaurants/:restaurantId/orders/:orderId/cancel
```

O fluxo específico de cancelamento permite cancelar pedidos enquanto a operação da cozinha ainda não foi iniciada.

Atualmente:

```text
PENDING   → CANCELLED
CONFIRMED → CANCELLED
```

Estados posteriores ao início da preparação são protegidos pelo domínio.

Enquanto não existir um fluxo explícito de estorno, pedidos com pagamento `PAID` não podem ser cancelados. A tentativa retorna conflito sem alterar o pedido nem criar evento de cancelamento.

O cancelamento utiliza o mesmo mecanismo transacional dos demais fluxos de alteração de pedidos.

---

# 💳 Pagamentos

Endpoint:

```text
PATCH /restaurants/:restaurantId/orders/:orderId/payment
```

O pagamento é tratado como um estado financeiro independente do estado operacional.

Estados financeiros:

```text
PENDING
   ↓
PAID
```

Pagar um pedido não altera automaticamente o estado da cozinha.

O evento financeiro também é registrado no `order_history`.

O sistema atualmente simula a confirmação do pagamento, mantendo a arquitetura preparada para uma futura integração real com um provedor externo.

---

# 🛵 Delivery

Pedidos do tipo `DELIVERY` possuem um contexto logístico separado.

Endpoints:

```text
POST  /restaurants/:restaurantId/orders/:orderId/delivery
PATCH /restaurants/:restaurantId/orders/:orderId/delivery/start
PATCH /restaurants/:restaurantId/orders/:orderId/delivery/complete
```

Estados do Delivery:

```text
PENDING
   ↓
OUT_FOR_DELIVERY
   ↓
DELIVERED
```

O Delivery possui:

- entidade própria;
- histórico próprio;
- transações;
- controle de concorrência;
- validação de tipo do pedido;
- prevenção de duplicidade.

A entidade Delivery pode ser criada somente enquanto o pedido estiver em `PREPARING` ou `READY`. O início da saída exige Order `READY` e Delivery `PENDING`; a conclusão exige ambos em `OUT_FOR_DELIVERY`.

StartDelivery e CompleteDelivery são as únicas operações que alteram simultaneamente os estados logísticos de Order e Delivery. Elas também persistem OrderHistory e DeliveryHistory na mesma transação.

O endereço não é duplicado na entidade Delivery.

O Delivery reutiliza o snapshot de endereço armazenado no pedido.

---

# 🪑 Dine-In

Pedidos presenciais utilizam:

```text
type: DINE_IN
```

e ficam associados a uma mesa.

A mesa não recebe um campo adicional de `occupied`.

A ocupação é derivada através dos pedidos ativos da mesa.

Pedidos nos estados:

```text
PENDING
CONFIRMED
PREPARING
READY
```

mantêm a mesa ocupada.

Quando o pedido é finalizado ou cancelado, a mesa volta a ficar disponível.

### Concorrência

A criação de pedidos `DINE_IN` utiliza:

```text
SELECT ... FOR UPDATE
```

na mesa antes da verificação de ocupação.

Isso impede que duas requisições simultâneas criem pedidos para a mesma mesa.

O PostgreSQL atua como autoridade de concorrência, sem mutexes ou locks em memória da aplicação.

---

# 📋 Consultas de Orders

Foram implementadas consultas para:

- listagem de pedidos;
- consulta individual;
- consulta dos itens;
- isolamento por restaurante;
- preservação dos snapshots históricos.

Endpoint individual:

```text
GET /restaurants/:restaurantId/orders/:orderId
```

A consulta detalhada retorna o pedido, itens, histórico do pedido e a Delivery associada:

```text
{
  order,
  items,
  history,
  delivery: {
    id,
    orderId,
    status,
    createdAt,
    updatedAt,
    history
  } | null
}
```

A chave `delivery` sempre existe. Ela é `null` para PICKUP, DINE_IN e DELIVERY sem despacho criado. Quando existe, `delivery.history` contém apenas a timeline operacional da Delivery, separada de `history`, que continua sendo a timeline do Order.

A leitura dos itens é feita em lote, evitando N+1 queries.

---

# 📊 Dashboard

O dashboard administrativo utiliza uma camada analítica separada dos repositories operacionais de Orders.

As agregações são executadas diretamente no PostgreSQL para evitar transportar grandes volumes de dados para o Node.js apenas para realizar cálculos em memória.

Nos quatro endpoints, valores de receita consideram somente pedidos `PAID` e não `CANCELLED`. Quantidades e contagens operacionais dos rankings consideram pedidos não cancelados, mesmo quando o pagamento ainda está pendente. Os rankings aceitam `limit` entre 1 e 100 e retornam `[]` quando não há resultados.

Erros de domínio preservam `message` e expõem um `code` estável. Erros de validação retornam `code: "VALIDATION_ERROR"`, `message` e `issues`.

## Resumo de vendas

```text
GET /restaurants/:restaurantId/dashboard/sales-summary
```

Fornece métricas como:

- receita confirmada por pagamento;
- quantidade de pedidos;
- quantidade de pedidos pagos;
- ticket médio dos pedidos pagos.

O contrato expõe `revenue` como valor inteiro em centavos e não expõe estimativa de receita pendente.

---

## Top Products

```text
GET /restaurants/:restaurantId/dashboard/top-products
```

Permite identificar os produtos com maior movimentação operacional e receita paga.

A agregação ocorre diretamente no PostgreSQL.

---

## Category Performance

```text
GET /restaurants/:restaurantId/dashboard/category-performance
```

Permite analisar o desempenho operacional e a receita paga das categorias do catálogo.

A categoria é resolvida pelo vínculo atual do Product. Se um Product mudar de Category, o histórico anterior será reatribuído no relatório; não existe snapshot histórico de Category no estado atual.

---

## Top Customers

```text
GET /restaurants/:restaurantId/dashboard/top-customers
```

Permite identificar os clientes com maior movimentação no restaurante. `totalSpent`, `paidOrdersCount` e `averageTicket` consideram somente pedidos pagos; `ordersCount` permanece uma contagem operacional de pedidos não cancelados.

A ordenação do ranking utiliza critérios determinísticos para evitar resultados instáveis em empates.

---

# 🔐 Multitenancy

O projeto considera `restaurantId` como o principal identificador de tenant para recursos pertencentes a um restaurante.

As regras de domínio verificam explicitamente relações como:

```text
Restaurant
    ↓
Category
    ↓
Product
    ↓
Order
```

Tentativas de operar sobre recursos pertencentes a outro restaurante são rejeitadas no domínio.

O objetivo é evitar que um ID válido de outra entidade seja suficiente para atravessar a fronteira de um restaurante.

---

# 🔒 Concorrência

Concorrência não é tratada através de locks na memória da aplicação.

Quando existe uma condição de corrida relevante, o PostgreSQL é utilizado como autoridade.

Exemplos:

### Reservas

```text
SELECT ... FOR UPDATE
        ↓
verificação de conflito
        ↓
INSERT reservation
        ↓
COMMIT
```

### Dine-In

```text
SELECT table FOR UPDATE
        ↓
verificação de ocupação
        ↓
INSERT order
        ↓
COMMIT
```

### Atualização de pedidos

```text
SELECT order FOR UPDATE
        ↓
validação do estado atual
        ↓
UPDATE
        ↓
INSERT history
        ↓
COMMIT
```

Isso permite que requisições concorrentes sejam serializadas pelo próprio banco.

---

# 🧾 Auditoria

Mudanças importantes de estado são registradas em históricos independentes.

Os históricos seguem o modelo:

```text
Append-Only
```

Ou seja, eventos anteriores não são sobrescritos.

Os principais históricos atualmente existentes são:

- `reservation_history`;
- `order_history`;
- `delivery_history`.

As alterações críticas são persistidas junto com a mudança de estado dentro da mesma transação.

---

# 🧪 Testes

O projeto possui uma suíte combinando testes unitários e testes E2E.

## Testes unitários

Os Use Cases utilizam implementações **InMemory** dos repositories.

Isso permite testar regras de negócio sem depender do banco de dados.

## Testes E2E

Os testes E2E utilizam:

- Fastify `app.inject()`;
- PostgreSQL real;
- Drizzle;
- Foreign Keys reais;
- constraints reais;
- transações reais;
- fluxo completo HTTP → Use Case → Repository → PostgreSQL.

Isso permite validar não apenas a regra isolada, mas também a integração entre as camadas.

### Estado atual

**272 testes automatizados passando.**

O projeto mantém TypeScript strict e utiliza:

```bash
npm run typecheck
```

equivalente a:

```bash
tsc --noEmit
```

---

# 🧱 Persistência

O PostgreSQL é a autoridade de persistência do sistema.

O Drizzle é utilizado como ORM/query builder, mantendo acesso explícito às operações necessárias.

Os repositories possuem contratos específicos por domínio.

Não existe um `BaseRepository<T>` genérico.

Essa decisão mantém os contratos pequenos e orientados às necessidades reais de cada Use Case.

---

# 💰 Dinheiro em centavos

Todos os valores financeiros utilizam inteiros.

Exemplo:

```text
R$ 10,50
↓
1050
```

Isso se aplica aos principais valores financeiros de Orders, como:

- preço dos produtos;
- subtotal;
- taxa de entrega;
- total.

A aplicação realiza os cálculos utilizando inteiros, evitando problemas de precisão de ponto flutuante.

---

# 🧠 Regras de negócio fora do HTTP

Controllers possuem responsabilidades limitadas:

1. receber a requisição;
2. extrair os dados;
3. validar a estrutura na borda;
4. chamar o Use Case;
5. devolver a resposta.

As regras de negócio permanecem nos Use Cases.

Por exemplo:

```text
Zod
→ "people deve ser inteiro positivo"

Use Case
→ "people não pode ultrapassar a capacidade da mesa"
```

Essa separação evita transformar o Controller em uma camada de negócio.

---

# 🛡️ Zod como proteção de borda

Zod é responsável principalmente por:

- UUIDs;
- tipos primitivos;
- enums;
- inteiros;
- estruturas dos payloads;
- query params;
- coerção de datas;
- validações estruturais.

Regras que dependem do estado atual do sistema permanecem no domínio.

Exemplo:

```text
Zod:
status ∈ [PENDING, CONFIRMED, ...]

Use Case:
PENDING → CONFIRMED é permitido?
```

---

# 🧩 Feature Slices

Cada funcionalidade é implementada verticalmente atravessando as camadas necessárias:

```text
Schema
   ↓
Repository
   ↓
Use Case
   ↓
Controller
   ↓
HTTP
   ↓
Testes
```

Quando necessário, a feature também atravessa:

```text
PostgreSQL
Transaction Manager
History
Row-Level Locking
```

Isso permite evoluir o sistema incrementalmente sem exigir que toda a arquitetura seja construída antecipadamente.

---

# 🧹 Pragmatismo arquitetural

O projeto evita deliberadamente:

- frameworks de DI sem necessidade;
- repositories genéricos;
- abstrações prematuras;
- `any`;
- `@ts-ignore`;
- dependências desnecessárias;
- bibliotecas temporais sem necessidade real;
- locks em memória para problemas que pertencem ao banco;
- comentários que apenas descrevem código óbvio.

A regra é simples:

> **A complexidade deve existir somente quando o domínio realmente exige.**

---

# 🗺️ Próximos passos

O núcleo operacional do Massa ao Ponto já possui:

- gestão de restaurantes;
- gestão de mesas;
- clientes;
- reservas;
- disponibilidade;
- catálogo;
- pedidos;
- pagamentos simulados;
- Delivery;
- Dine-In;
- auditoria;
- consultas individuais;
- consultas analíticas;
- gestão completa de produtos e categorias.

A próxima evolução será definida a partir das necessidades restantes do domínio, priorizando novas funcionalidades que agreguem valor real ao sistema sem comprometer a simplicidade arquitetural.

Possíveis futuras frentes incluem:

- automações;
- evolução do sistema financeiro;
- integrações externas;
- evolução logística;
- novas funcionalidades administrativas;
- expansão das operações presenciais;
- melhorias de observabilidade e operação.

Cada nova funcionalidade continuará seguindo o princípio de evolução incremental através de **feature slices**.

---

# 🎯 Objetivo do projeto

O Massa ao Ponto está sendo construído para demonstrar, na prática, conhecimentos de:

- arquitetura de software;
- modelagem de domínio;
- Monolito Modular;
- separação de responsabilidades;
- Programação Orientada a Objetos;
- regras de negócio;
- REST APIs;
- TypeScript strict;
- PostgreSQL;
- Drizzle ORM;
- transações;
- concorrência;
- Row-Level Locking;
- persistência relacional;
- testes unitários;
- testes E2E;
- multitenancy;
- auditoria;
- modelagem financeira;
- analytics;
- integração entre camadas.

O projeto não busca apenas demonstrar que é possível construir endpoints.

A proposta é demonstrar **como construir um sistema de negócio evolutivo**, onde novas funcionalidades podem ser adicionadas sem abandonar as regras, a integridade dos dados ou a capacidade de testar o comportamento do sistema.

---

## 📌 Princípio central

> **Código simples, regras explícitas, banco como autoridade e testes como proteção contra regressões.**

O Massa ao Ponto continua sendo desenvolvido de forma incremental, documentando as decisões arquiteturais relevantes e mantendo uma base suficientemente sólida para permitir que o sistema cresça sem transformar cada nova feature em uma refatoração.
