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
| Restaurantes         | ✅ CRUD de leitura e criação               |
| Mesas                | ✅ Criação e listagem                      |
| Clientes             | ✅ Consulta e histórico                    |
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

# 🍽️ Restaurantes

O módulo de restaurantes fornece a base de isolamento dos demais domínios.

### Funcionalidades

- criação de restaurantes;
- listagem;
- consulta individual;
- identificação do restaurante através de `restaurantId`;
- utilização do restaurante como tenant dos módulos relacionados.

Os demais recursos que pertencem a uma pizzaria carregam o `restaurantId` quando a regra de negócio exige isolamento explícito.

---

# 🪑 Mesas

O módulo de mesas representa os recursos físicos disponíveis no restaurante.

### Funcionalidades

- criação de mesas;
- listagem por restaurante;
- capacidade de pessoas;
- controle de mesa ativa/inativa;
- prevenção de números de mesa duplicados dentro do restaurante.

A ocupação não é armazenada diretamente como uma flag.

Em contextos presenciais, a ocupação é derivada semanticamente dos pedidos `DINE_IN` ativos.

---

# 👤 Clientes

Clientes são entidades independentes utilizadas principalmente pelo domínio de Reservas e Orders.

### Funcionalidades

- consulta individual;
- histórico de reservas;
- reutilização de clientes através do telefone;
- relacionamento com reservas e pedidos.

O cliente é criado ou reutilizado durante determinados fluxos, evitando duplicação desnecessária de registros.

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
- reutilização/criação do cliente através do telefone;
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

## Resumo de vendas

```text
GET /restaurants/:restaurantId/dashboard/sales-summary
```

Fornece métricas como:

- receita bruta;
- receita paga;
- quantidade de pedidos;
- ticket médio.

Pedidos cancelados são excluídos das métricas apropriadas.

---

## Top Products

```text
GET /restaurants/:restaurantId/dashboard/top-products
```

Permite identificar os produtos com maior movimentação de vendas.

A agregação ocorre diretamente no PostgreSQL.

---

## Category Performance

```text
GET /restaurants/:restaurantId/dashboard/category-performance
```

Permite analisar o desempenho das categorias do catálogo.

---

## Top Customers

```text
GET /restaurants/:restaurantId/dashboard/top-customers
```

Permite identificar os clientes com maior movimentação no restaurante.

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
