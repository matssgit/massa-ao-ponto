# Estado do projeto — Massa ao Ponto

Snapshot de desenvolvimento em 2026-08-26. Este documento registra o que está entregue, o que foi validado e o que permanece como roadmap. O desenho estável do sistema fica em `ARCHITECTURE.md`.

## Baseline atual

| Item | Estado |
| --- | --- |
| Backend | Implementado e em evolução |
| Frontend web/admin | Scaffolds sem implementação |
| Automação | Scaffold sem implementação |
| TypeScript | Strict; `pnpm typecheck` passou nesta inspeção |
| Testes | 65 arquivos e 305 testes descobertos |
| Baseline serial de referência | 305 testes passando com PostgreSQL disponível |
| Migrations | `0000`–`0007` estabilizadas |
| Working tree antes da governança | Limpo |

### Verificação desta inspeção

- `pnpm typecheck`, executado em `apps/backend`: passou.
- A suíte serial confirmou 65 arquivos e 305 testes.
- O PostgreSQL local não estava em execução; 36 arquivos/150 testes unitários passaram e 29 arquivos/155 testes E2E falharam na preparação por `ECONNREFUSED` em `localhost:5432`.
- Portanto, esta sessão não reproduziu uma suíte totalmente verde. O baseline de 305 passando permanece o último baseline serial conhecido, condicionado ao PostgreSQL disponível.
- O filtro `pnpm --filter backend` não é confiável hoje porque `apps/web/package.json` também declara `"name": "backend"`; comandos de validação devem ser executados diretamente em `apps/backend` até o scaffold ser corrigido em tarefa própria.

## Funcionalidades implementadas

- Restaurants: criação, listagem e detalhe.
- Tables: criação, listagem por restaurante, capacidade, atividade e unicidade de número.
- Customers: detalhe e histórico de reservas.
- Reservations: criação, listagem, detalhe, disponibilidade, transições, cancelamento e histórico.
- Product Categories: criação, listagem, detalhe, atualização, toggle e exclusão protegida.
- Products: criação, listagem/filtros/ordenação, atualização, toggle e exclusão protegida.
- Addons e Product Addons: gestão de adicionais e associação com produtos.
- Orders: criação, listagem paginada, detalhe, cancelamento e máquina de estados.
- Tipos de pedido: `DELIVERY`, `PICKUP` e `DINE_IN`.
- Order Items e Order Item Addons com snapshots de nome e preço.
- Payments: confirmação simulada e histórico financeiro.
- Order History: eventos append-only, incluídos no GetOrder.
- Delivery: criação, início, conclusão e Delivery History persistido.
- Dashboard/analytics: sales summary, top products, category performance e top customers.

## Últimas etapas concluídas

### Etapa 33 — Paginação de Orders

A listagem `GET /restaurants/:restaurantId/orders` aceita `page` e `limit`, com defaults 1 e 20, limite máximo 100, combinação com filtros existentes e ordenação estável por `createdAt DESC, id DESC`.

### Etapa 34A — Tenant isolation no GetOrder

O detalhe passou para `GET /restaurants/:restaurantId/orders/:orderId`. O Use Case e o repository buscam por `orderId + restaurantId`; pedido de outro restaurante resulta em 404 e a rota global anterior não está registrada.

### Etapa 34B — Order History no GetOrder

O detalhe retorna `{ order, items, history }`. Itens e histórico são carregados após a validação do tenant, e o histórico é ordenado cronologicamente com desempate determinístico.

## Lacunas conhecidas

- Tenant isolation ainda não é uniforme. Há rotas globais de customers, reservations, parte do catálogo e mutações de orders/delivery sem `restaurantId` na URL ou contexto autenticado.
- Não há autenticação, autorização, sessão ou tenant context.
- `apps/web`, `apps/admin`, `automation`, `packages/contracts` e `packages/ui` ainda não possuem implementação funcional.
- O manifest de `apps/web` é um scaffold copiado do backend e colide no nome do package.
- O root possui script `lint`, mas nenhum package expõe um script `lint`; a validação não é funcional.
- A suíte E2E depende de PostgreSQL real disponível e de execução serial no baseline atual.

Essas lacunas são registro, não autorização para correção nesta etapa.

## Roadmap conhecido

1. Etapa 35: inspecionar Delivery Details / Delivery History antes de propor implementação.
2. Auditar lacunas restantes do backend, com atenção a tenant isolation, contratos HTTP, consistência entre repositories e cobertura.
3. Projetar Kitchen Queue / ETA para DINE_IN.
4. Implementar frontend web/admin a partir de contratos reais da API e da especificação visual existente.
5. Implementar automações com idempotência, retries e efeitos observáveis.
6. Integrar Ollama somente após a aplicação tradicional estar consolidada e houver autorização específica.
7. Preparar produção/deploy, CI/CD, observabilidade e política de ambientes.

O roadmap não autoriza início automático de nenhuma dessas frentes.

## Decisão futura — Kitchen Queue / ETA

Em DINE_IN, tablets ou telas de mesa poderão mostrar posição aproximada, pedidos à frente, estimativa de preparo, evolução até `READY` e aviso de prontidão.

Kitchen Queue deve ser uma camada operacional calculada sobre a carga e o estado da cozinha. Ela não é parte intrínseca do estado persistido de Order. Não adicionar campos como `queuePosition` ou `estimatedMinutes` em `orders` sem análise arquitetural de consistência, atualização e fonte da verdade.

Opções de atualização a avaliar quando a feature for autorizada:

- polling como baseline simples;
- SSE para atualização unidirecional;
- WebSocket apenas se interação bidirecional justificar sua complexidade.

Nada de Kitchen Queue ou ETA foi implementado nesta etapa.

## Decisão futura — IA local com Ollama

A integração pretendida é uma camada de interpretação e orquestração:

```text
User
  ↓
AI Agent
  ↓
Controlled Tools
  ↓
Existing Use Cases
  ↓
Repositories
  ↓
Database
```

A IA não será fonte da verdade para preços, totais, tenant ownership, disponibilidade, pagamentos, transições de status, associação Product/Addons, reservas ou integridade financeira. Essas decisões continuam nos Use Cases e no banco.

Até autorização futura, não criar OllamaService, AIService, agentes executáveis, tools, prompts, RAG, embeddings, vector database ou abstrações preparatórias. Nenhuma integração de IA foi implementada nesta etapa.
