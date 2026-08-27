# Arquitetura — Massa ao Ponto

Referência objetiva da arquitetura comprovada no repositório em 2026-08-26. Roadmap e estado de entrega ficam em `PROJECT_STATE.md`.

## Visão geral

O Massa ao Ponto é um monólito modular para gestão e operação de pizzaria. A implementação funcional atual está concentrada em uma API backend. O desenvolvimento ocorre por feature slices que atravessam validação, contrato de persistência, regra de negócio, HTTP e testes.

```text
HTTP/Fastify
    ↓
Controller + Zod
    ↓
Use Case
    ↓
Repository contract / Transaction Manager
    ↓
Drizzle ORM
    ↓
PostgreSQL
```

## Workspace

O repositório usa pnpm workspaces (`apps/*`, `packages/*` e `automation`) e Node.js 20 ou superior.

| Área | Estado arquitetural atual |
| --- | --- |
| `apps/backend` | API TypeScript implementada, migrations e testes |
| `apps/web` | Scaffold: manifest copiado, `src` e `public` sem implementação |
| `apps/admin` | Scaffold: manifest e diretórios vazios |
| `automation` | Scaffold: manifest e `src` vazio |
| `packages/config` | Configuração TypeScript strict compartilhada |
| `packages/contracts` | Scaffold sem contratos implementados |
| `packages/ui` | Scaffold sem componentes implementados |
| `docs`, `infra`, `scripts` | Diretórios presentes, atualmente sem arquivos versionados |

O manifest de `apps/web` ainda declara o nome `backend` e dependências/scripts do servidor. Consequentemente, filtros pnpm por nome podem selecionar backend e web ao mesmo tempo. Isso é uma lacuna de scaffold, não uma arquitetura frontend definida.

## Tecnologias implementadas

- TypeScript strict, ESM e resolução `NodeNext`;
- Fastify 5;
- Zod 4;
- PostgreSQL 16 no ambiente Docker Compose;
- Drizzle ORM e Drizzle Kit;
- Vitest 4;
- `postgres-js` como driver.

Não há autenticação, sessão, identidade de usuário ou contexto de tenant autenticado implementado. O tenant é expresso por `restaurantId` em contratos e rotas específicas.

## Camada HTTP

`src/server.ts` cria a instância Fastify, registra o error handler e as rotas. `src/http/routes.ts` concentra o registro dos endpoints.

Controllers:

- validam params, query e body por schemas Zod;
- instanciam repositories/transaction managers concretos;
- executam um Use Case;
- traduzem o resultado para status e payload HTTP.

O error handler central converte erros de domínio conhecidos em respostas 400, 404 ou 409 e reserva 500 para falhas não tratadas.

## Organização modular

Os módulos funcionais estão em `src/modules`:

- `restaurants`;
- `tables`;
- `customers`;
- `reservations`;
- `products`, incluindo categorias, addons e associações;
- `orders`, incluindo itens, addons de item, pagamento, delivery, históricos e analytics.

Cada módulo usa, conforme necessário, `controllers`, `schemas`, `use-cases`, `repositories` e `errors`. Os contratos são específicos do domínio; não existe repository base genérico.

## Use Cases e Repositories

Use Cases concentram invariantes e orquestração de domínio. Entre as regras existentes estão máquinas de estado de reservas, pedidos e delivery; conflitos de reserva; ocupação DINE_IN; validação de catálogo; cálculo server-side; cancelamento e pagamento.

Repositories possuem duas famílias:

- **Drizzle:** persistência e consultas reais no PostgreSQL;
- **InMemory:** semântica equivalente para testes unitários.

Transaction Managers fornecem um conjunto de repositories ligado à mesma transação nos fluxos atômicos de reservas, orders e delivery.

## Persistência e schema

Os schemas Drizzle ficam em `src/db/schema` e são exportados pelo arquivo `index.ts`. As tabelas principais são:

```text
restaurants
├── tables
├── product_categories ── products
│                         └── product_addons ── addons
├── reservations ── reservation_history
└── orders
    ├── order_items ── order_item_addons
    ├── order_history
    └── deliveries ── delivery_history

customers ── reservations
customers ── orders
```

As migrations versionadas vão de `0000` a `0007`, acompanhadas por journal e snapshots Drizzle. Esse histórico é tratado como estabilizado e imutável; qualquer evolução segue geração, inspeção e aplicação autorizadas.

## Domínios e relações

### Restaurants e Tables

Restaurant é a raiz de escopo operacional. Tables pertencem a um restaurante, possuem capacidade e número único por restaurante. Ocupação não é uma flag persistida: ela é derivada de orders DINE_IN ativos.

### Customers e Reservations

Customers podem ser reutilizados por telefone nos fluxos de reserva. Reservations ligam restaurante, mesa e cliente, usam intervalos semiabertos `[startsAt, endsAt)` e mantêm histórico append-only. Estados ativos conflitantes bloqueiam disponibilidade.

### Catálogo

Categorias, produtos e addons pertencem ao restaurante. Product Addons modela a associação permitida entre produto e adicional. Exclusões protegem referências históricas quando aplicável.

### Orders

Orders suporta `DELIVERY`, `PICKUP` e `DINE_IN`. Um pedido possui itens, addons escolhidos, status operacional, estado de pagamento e histórico. O backend calcula subtotal, taxa e total; valores enviados pelo cliente não são autoridade.

### Delivery e analytics

Delivery possui entidade, máquina de estados e histórico próprios, mas usa o snapshot de endereço do pedido. Analytics usa queries agregadas no PostgreSQL para sales summary, top products, category performance e top customers.

## Dinheiro e snapshots

Valores financeiros são inteiros em centavos. Esse padrão cobre preços, preços unitários, subtotais, taxa de entrega e total.

Orders preserva dados históricos sem depender do catálogo ou cadastro atual:

- snapshot de cliente e endereço no pedido;
- nome e preço unitário do produto no item;
- nome e preço unitário do addon no addon de item.

Alterações futuras em produto, addon ou cliente não devem reescrever pedidos passados.

## Leituras e hidratação

Listagens e detalhes evitam consulta por item:

- Orders são buscados primeiro;
- itens são carregados em lote pelos IDs dos pedidos;
- addons de itens são carregados em lote;
- o resultado é agrupado em memória;
- GetOrder carrega itens e histórico após confirmar `orderId + restaurantId`.

A listagem de Orders usa paginação `page`/`limit`, defaults 1/20, limite máximo 100 e ordenação estável por `createdAt DESC, id DESC`. Históricos usam ordenação cronológica determinística.

## Tenant isolation

O isolamento existe, mas é parcial e deve ser descrito por fluxo:

- listagens e criações sob `/restaurants/:restaurantId/...` validam o restaurante nos fluxos implementados;
- mutações de catálogo tenant-scoped validam pertencimento;
- GetOrder usa consulta composta por `orderId` e `restaurantId` e responde 404 para acesso cross-tenant;
- analytics filtra por restaurante.

Ainda existem rotas globais para leitura/mutação de customers, reservations, parte do catálogo e operações de order/delivery. Não há middleware de autenticação ou tenant context. Uma auditoria posterior deve decidir quais contratos precisam receber `restaurantId`; a existência de UUID não é uma barreira de segurança.

## Transações e concorrência

PostgreSQL é a autoridade de concorrência. Os principais pontos protegidos são:

- criação de reserva: verificação de conflito e persistência atômica;
- DINE_IN: lock da mesa antes de verificar ocupação e criar o pedido;
- alteração/cancelamento/pagamento de order: lock do pedido, validação, update e history;
- delivery: lock e transação nas transições logísticas.

Histórico e alteração correspondente são gravados na mesma transação. Locks em memória não fazem parte do desenho.

## Testes

A suíte possui 65 arquivos:

- 36 arquivos unitários, centrados em Use Cases e repositories InMemory;
- 29 arquivos E2E, usando `app.inject()`, Drizzle e PostgreSQL real.

O baseline da suíte completa é serial porque arquivos E2E compartilham banco e rotinas de limpeza. O typecheck usa `tsc --noEmit`. Não há lint funcional configurado nos packages no estado atual.
