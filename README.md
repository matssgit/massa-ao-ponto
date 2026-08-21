# 🍕 Massa ao Ponto

> Sistema de gestão e operação para uma pizzaria, desenvolvido como projeto de portfólio com foco em arquitetura, backend, regras de negócio, persistência e integração de sistemas.

🚧 **Status: Em desenvolvimento**

O Massa ao Ponto está sendo desenvolvido de forma incremental, utilizando **feature slices** para evoluir o sistema com regras de negócio bem definidas, testes automatizados e integração real com PostgreSQL.

---

## 🚀 Status do projeto

| Módulo | Status |
| ------------------------ | ------------------------ |
| Infraestrutura | ✅ Concluído |
| Restaurantes | ✅ Concluído |
| Mesas | ✅ Criação e listagem |
| Clientes | ✅ Consulta e histórico |
| Reservas | ✅ Milestone 1 concluído |
| Disponibilidade | ✅ Concluído |
| Catálogo de Produtos | ✅ Fundação concluída |
| Orders / Pedidos | ✅ Criação, consulta, listagem e status |
| Delivery | 🚧 Em desenvolvimento |
| Pagamentos | ⏳ Planejado |
| Automações | ⏳ Planejado |
| Dashboard administrativo | ⏳ Planejado |

---

## 🏗️ Arquitetura

O projeto utiliza um **Monolito Modular**, organizado por domínios e feature slices.

A estrutura busca manter as regras de negócio independentes da camada HTTP, utilizando:

- **TypeScript** com `strict`;
- **Fastify** para HTTP;
- **Zod** para validação na borda;
- **Drizzle ORM** para persistência;
- **PostgreSQL** como banco de dados;
- **Vitest** para testes unitários;
- testes **E2E** através de `app.inject()` contra PostgreSQL real;
- Repository Pattern com implementações **InMemory** e **Drizzle**;
- transações explícitas através de Transaction Managers;
- Row-Level Locking (`SELECT ... FOR UPDATE`) nos fluxos que exigem controle de concorrência;
- históricos **append-only** para auditoria de mudanças.

A prioridade arquitetural é manter o sistema simples, explícito e orientado às regras reais do domínio, evitando abstrações e dependências desnecessárias.

---

## 📍 Milestone 1 — Reservas e Clientes

O primeiro grande ciclo do sistema foi concluído, cobrindo o fluxo principal de reservas e a consulta de clientes.

### Reservas

- criação de reservas;
- validação de capacidade;
- validação de mesa e restaurante;
- prevenção de conflitos de horário;
- intervalos semiabertos `[startsAt, endsAt)`;
- controle de concorrência com Row-Level Locking;
- atualização de status através de State Machine;
- cancelamento com janela de 2 horas;
- listagem com filtros;
- consulta individual;
- consulta de disponibilidade;
- histórico de alterações;
- transações atômicas entre reserva e histórico.

### Clientes

- consulta individual;
- histórico de reservas;
- reutilização de clientes através do telefone;
- isolamento por identificador.

**133 testes automatizados estavam passando ao encerramento do Milestone 1.**

---

## 🍕 Delivery — Catálogo

A segunda grande frente do projeto foi iniciada com a fundação do catálogo de produtos.

### Categorias

- criação de categorias por restaurante;
- listagem de categorias;
- isolamento por restaurante.

### Produtos

- criação de produtos;
- listagem de produtos;
- filtro por categoria;
- filtro por status ativo;
- validação de categoria pertencente ao restaurante correto;
- preços armazenados como **inteiros em centavos**, evitando problemas de precisão com ponto flutuante.

O catálogo foi construído como base para os futuros pedidos, mantendo produtos e categorias independentes do domínio de Orders.

---

## 🛒 Orders — Pedidos

O domínio de pedidos já possui seu fluxo principal implementado.

### Criação

Endpoint:

`POST /restaurants/:restaurantId/orders`

A criação do pedido é transacional e contempla:

- pedidos `DELIVERY` e `PICKUP`;
- validação de produtos;
- validação de produtos ativos;
- validação de pertencimento ao restaurante;
- prevenção de produtos duplicados no mesmo pedido;
- validação de quantidade;
- cálculo server-side do subtotal;
- cálculo server-side do total;
- valores monetários em centavos;
- snapshot do nome e preço dos produtos;
- snapshot dos dados do cliente;
- snapshot do endereço de entrega;
- registro inicial em `order_history`.

O backend é responsável pelos cálculos financeiros, não confiando nos valores enviados pelo cliente.

### Consulta

Foram implementadas consultas individuais e listagem de pedidos, incluindo isolamento por restaurante e consultas estruturadas para evitar problemas de N+1.

### Máquina de estados

Endpoint:

`PATCH /orders/:orderId/status`

O ciclo de vida atual do pedido segue:

```text
PENDING
   ↓
CONFIRMED
   ↓
PREPARING
   ↓
READY
   ↓
OUT_FOR_DELIVERY
   ↓
DELIVERED
```

Com cancelamento permitido nos estados operacionais definidos pelo domínio:

```text
PENDING ──────────────→ CANCELLED
CONFIRMED ────────────→ CANCELLED
PREPARING ────────────→ CANCELLED
READY ────────────────→ CANCELLED
OUT_FOR_DELIVERY ────→ CANCELLED
```

`DELIVERED` e `CANCELLED` são estados finais.

A State Machine fica exclusivamente no Use Case, enquanto o Zod valida somente a estrutura do payload.

### Concorrência e auditoria

Alterações de status utilizam:

- `SELECT ... FOR UPDATE`;
- transação PostgreSQL;
- atualização do pedido;
- inserção do histórico;
- commit atômico.

Isso garante que alterações concorrentes sobre o mesmo pedido sejam serializadas pelo banco e que nenhuma mudança de status seja persistida sem seu respectivo evento de auditoria.

O `order_history` é **append-only**.

---

## 🧪 Testes

O projeto possui uma suíte combinando testes unitários e testes E2E.

Os testes unitários utilizam implementações InMemory para manter as regras de domínio rápidas e isoladas.

Os testes E2E utilizam:

- Fastify `app.inject()`;
- PostgreSQL real;
- transações e constraints reais;
- validação completa da camada HTTP até a persistência.

### Estado atual

**177 testes automatizados passando em 21 arquivos de teste.**

O projeto também mantém o TypeScript em modo strict e o typecheck é executado com:

```bash
tsc --noEmit
```

---

## 🔐 Princípios e decisões arquiteturais

Algumas decisões importantes tomadas durante o desenvolvimento:

### Dinheiro em centavos

Valores financeiros são armazenados como `integer` no PostgreSQL.

```text
R$ 35,90 → 3590
```

Isso evita inconsistências causadas por ponto flutuante.

### Regras de negócio fora do HTTP

Controllers são responsáveis apenas por:

1. receber a requisição;
2. validar/normalizar a entrada;
3. chamar o Use Case;
4. devolver a resposta.

Regras de negócio permanecem nos Use Cases.

### Zod como proteção de borda

Zod é utilizado para:

- tipos;
- UUIDs;
- enums;
- inteiros;
- coerção de datas;
- estrutura dos payloads.

Validações que dependem do estado do sistema permanecem no domínio.

### Concorrência delegada ao PostgreSQL

Quando uma operação precisa garantir consistência diante de requisições simultâneas, o PostgreSQL é utilizado como autoridade através de transações e Row-Level Locking.

### Históricos append-only

Mudanças importantes de estado não sobrescrevem o histórico. Cada transição gera um novo evento de auditoria.

### Pragmatismo

O projeto evita:

- frameworks de DI sem necessidade;
- repositories genéricos;
- abstrações prematuras;
- bibliotecas temporais desnecessárias;
- infraestrutura externa quando o PostgreSQL resolve o problema.

---

## 🗺️ Próximos passos

Com o núcleo de Orders consolidado, os próximos grandes épicos planejados são:

- regras de cancelamento de pedidos;
- pagamentos;
- evolução do Delivery;
- endereços e logística de entrega;
- automações;
- dashboard administrativo.

Cada nova funcionalidade será implementada como uma feature slice independente, mantendo o padrão de:

**Schema → Repository → Use Case → Controller → HTTP → Testes**

sem comprometer as regras já existentes.

---

## 🎯 Objetivo do projeto

O Massa ao Ponto não tem como objetivo ser apenas uma API CRUD.

O projeto está sendo construído para demonstrar, na prática, conhecimentos de:

- arquitetura de software;
- modelagem de domínio;
- separação de responsabilidades;
- regras de negócio;
- concorrência;
- transações;
- persistência relacional;
- testes automatizados;
- APIs REST;
- TypeScript strict;
- PostgreSQL;
- integração entre camadas.

A proposta é evoluir o sistema de forma incremental, documentando as decisões arquiteturais e mantendo uma suíte de testes que permita refatorar e adicionar novas funcionalidades com segurança.
