# 🍕 Massa ao Ponto

> Sistema de gestão e operação para uma pizzaria, desenvolvido como projeto de portfólio com foco em arquitetura, backend, regras de negócio e integração de sistemas.

🚧 **Status: Em desenvolvimento**

O Massa ao Ponto está sendo desenvolvido de forma incremental, utilizando feature slices para evoluir o sistema com regras de negócio bem definidas, testes automatizados e integração real com PostgreSQL.

---

## 🚀 Status do projeto

| Módulo                   | Status                   |
| ------------------------ | ------------------------ |
| Infraestrutura           | ✅ Concluído             |
| Restaurantes             | ✅ Concluído             |
| Mesas                    | ✅ Criação e listagem    |
| Reservas                 | ✅ Milestone 1 concluído |
| Disponibilidade          | ✅ Concluído             |
| Delivery                 | ⏳ Planejado             |
| Pagamentos               | ⏳ Planejado             |
| Automações               | ⏳ Planejado             |
| Dashboard administrativo | ⏳ Planejado             |

### Milestone 1 — Reservas

A primeira grande etapa do sistema está concluída, cobrindo o ciclo principal de reservas:

- criação de reservas;
- validação de capacidade;
- validação de mesa e restaurante;
- prevenção de conflitos de horário;
- controle de concorrência;
- atualização de status;
- cancelamento;
- listagem com filtros;
- consulta individual;
- consulta de disponibilidade;
- histórico de alterações.

**120 testes automatizados passando em 19 arquivos de teste.**

```
massa-ao-ponto
├─ apps
│  ├─ admin
│  │  ├─ package.json
│  │  ├─ public
│  │  └─ src
│  ├─ backend
│  │  ├─ drizzle
│  │  │  ├─ 0000_shiny_living_tribunal.sql
│  │  │  ├─ 0001_tearful_shape.sql
│  │  │  ├─ 0002_mean_morph.sql
│  │  │  └─ meta
│  │  │     ├─ 0000_snapshot.json
│  │  │     ├─ 0001_snapshot.json
│  │  │     ├─ 0002_snapshot.json
│  │  │     └─ _journal.json
│  │  ├─ drizzle.config.ts
│  │  ├─ package.json
│  │  ├─ src
│  │  │  ├─ db
│  │  │  │  ├─ index.ts
│  │  │  │  └─ schema
│  │  │  │     ├─ customers.ts
│  │  │  │     ├─ index.ts
│  │  │  │     ├─ reservation-history.ts
│  │  │  │     ├─ reservation-status.ts
│  │  │  │     ├─ reservations.ts
│  │  │  │     ├─ restaurants.ts
│  │  │  │     └─ tables.ts
│  │  │  ├─ http
│  │  │  │  ├─ error-handler.ts
│  │  │  │  └─ routes.ts
│  │  │  ├─ modules
│  │  │  │  ├─ customers
│  │  │  │  │  ├─ controllers
│  │  │  │  │  │  └─ list-customer-reservations.ts
│  │  │  │  │  ├─ errors
│  │  │  │  │  │  └─ customer-not-found-error.ts
│  │  │  │  │  ├─ schemas
│  │  │  │  │  │  └─ customer.schema.ts
│  │  │  │  │  └─ use-cases
│  │  │  │  │     ├─ get-customer.spec.ts
│  │  │  │  │     ├─ get-customer.ts
│  │  │  │  │     ├─ get-customer.use-case.ts
│  │  │  │  │     ├─ list-customer-reservations.spec.ts
│  │  │  │  │     └─ list-customer.reservations.use-case.ts
│  │  │  │  ├─ reservations
│  │  │  │  │  ├─ controllers
│  │  │  │  │  │  ├─ cancel-reservation.ts
│  │  │  │  │  │  ├─ create-reservation.ts
│  │  │  │  │  │  ├─ get-availability.ts
│  │  │  │  │  │  ├─ get-reservation.ts
│  │  │  │  │  │  ├─ list-reservation-history.ts
│  │  │  │  │  │  ├─ list-reservations.ts
│  │  │  │  │  │  └─ update-reservation-status.ts
│  │  │  │  │  ├─ errors
│  │  │  │  │  │  ├─ capacity-exceeded-error.ts
│  │  │  │  │  │  ├─ invalid-reservation-status-transition-error.ts
│  │  │  │  │  │  ├─ invalid-time-range-error.ts
│  │  │  │  │  │  ├─ invalid-time-range-filter-error.ts
│  │  │  │  │  │  ├─ reservation-cancellation-window-expired-error.ts
│  │  │  │  │  │  ├─ reservation-conflict-error.ts
│  │  │  │  │  │  ├─ reservation-not-found-error.ts
│  │  │  │  │  │  ├─ table-inactive-error.ts
│  │  │  │  │  │  ├─ table-not-found-error.ts
│  │  │  │  │  │  └─ table-restaurant-mismatch-error.ts
│  │  │  │  │  ├─ repositories
│  │  │  │  │  │  ├─ customers-repository.ts
│  │  │  │  │  │  ├─ drizzle-customers-repository.ts
│  │  │  │  │  │  ├─ drizzle-reservation-history-repository.ts
│  │  │  │  │  │  ├─ drizzle-reservation-transaction-manager.ts
│  │  │  │  │  │  ├─ drizzle-reservations-repository.ts
│  │  │  │  │  │  ├─ in-memory-customers-repository.ts
│  │  │  │  │  │  ├─ in-memory-reservation-history-repository.ts
│  │  │  │  │  │  ├─ in-memory-reservation-transaction-manager.ts
│  │  │  │  │  │  ├─ in-memory-reservations-repository.ts
│  │  │  │  │  │  ├─ reservation-history-repository.ts
│  │  │  │  │  │  ├─ reservation-transaction-manager.ts
│  │  │  │  │  │  └─ reservations-repository.ts
│  │  │  │  │  ├─ schemas
│  │  │  │  │  │  ├─ availability.schema.ts
│  │  │  │  │  │  └─ reservation.schema.ts
│  │  │  │  │  └─ use-cases
│  │  │  │  │     ├─ cancel-reservation.spec.ts
│  │  │  │  │     ├─ cancel-reservation.use-case.ts
│  │  │  │  │     ├─ create-reservation.spec.ts
│  │  │  │  │     ├─ create-reservation.use-case.ts
│  │  │  │  │     ├─ get-availability.spec.ts
│  │  │  │  │     ├─ get-availability.use-case.ts
│  │  │  │  │     ├─ get-reservation.spec.ts
│  │  │  │  │     ├─ get-reservation.use-case.ts
│  │  │  │  │     ├─ list-reservation-history.spec.ts
│  │  │  │  │     ├─ list-reservation-history.use-case.ts
│  │  │  │  │     ├─ list-reservations.spec.ts
│  │  │  │  │     ├─ list-reservations.use-case.ts
│  │  │  │  │     ├─ update-reservation-status.spec.ts
│  │  │  │  │     └─ update-reservation-status.use-case.ts
│  │  │  │  ├─ restaurants
│  │  │  │  │  ├─ controllers
│  │  │  │  │  │  ├─ create-restaurant.ts
│  │  │  │  │  │  ├─ get-restaurant.ts
│  │  │  │  │  │  └─ list-restaurants.ts
│  │  │  │  │  ├─ errors
│  │  │  │  │  │  └─ restaurant-not-found-error.ts
│  │  │  │  │  ├─ repositories
│  │  │  │  │  │  ├─ drizzle-restaurants-repository.ts
│  │  │  │  │  │  ├─ in-memory-restaurants-repository.ts
│  │  │  │  │  │  └─ restaurants-repository.ts
│  │  │  │  │  ├─ schemas
│  │  │  │  │  │  └─ restaurant.schema.ts
│  │  │  │  │  └─ use-cases
│  │  │  │  │     ├─ create-restaurant.spec.ts
│  │  │  │  │     ├─ create-restaurant.use-case.ts
│  │  │  │  │     ├─ get-restaurant.spec.ts
│  │  │  │  │     ├─ get-restaurant.use-case.ts
│  │  │  │  │     ├─ list-restaurants.spec.ts
│  │  │  │  │     └─ list-restaurants.use-case.ts
│  │  │  │  └─ tables
│  │  │  │     ├─ controllers
│  │  │  │     │  ├─ create-table.ts
│  │  │  │     │  └─ list-tables.ts
│  │  │  │     ├─ errors
│  │  │  │     │  └─ table-number-already-exists-error.ts
│  │  │  │     ├─ repositories
│  │  │  │     │  ├─ drizzle-tables-repository.ts
│  │  │  │     │  ├─ in-memory-tables-repository.ts
│  │  │  │     │  └─ tables-repository.ts
│  │  │  │     ├─ schemas
│  │  │  │     │  └─ table.schema.ts
│  │  │  │     └─ use-cases
│  │  │  │        ├─ create-table.spec.ts
│  │  │  │        ├─ create-table.use-case.ts
│  │  │  │        ├─ list-tables.spec.ts
│  │  │  │        └─ list-tables.use-case.ts
│  │  │  └─ server.ts
│  │  ├─ tests
│  │  │  └─ e2e
│  │  │     ├─ customers
│  │  │     │  └─ customers.e2e.spec.ts
│  │  │     ├─ reservations
│  │  │     │  ├─ availability.e2e.spec.ts
│  │  │     │  ├─ cancel-reservation.e2e.spec.ts
│  │  │     │  ├─ get-reservation.e2e.spec.ts
│  │  │     │  ├─ list-reservation-history.e2e.spec.ts
│  │  │     │  └─ reservations.e2e.spec.ts
│  │  │     ├─ restaurants
│  │  │     │  └─ restaurants.e2e.spec.ts
│  │  │     └─ tables
│  │  │        └─ tables.2e2.spec.ts
│  │  └─ tsconfig.json
│  └─ web
│     ├─ package.json
│     ├─ public
│     └─ src
├─ automation
│  ├─ package.json
│  └─ src
├─ docker-compose.yml
├─ docs
│  ├─ adr
│  ├─ api
│  ├─ architecture
│  └─ database
├─ infra
│  └─ docker
├─ package.json
├─ packages
│  ├─ config
│  │  ├─ package.json
│  │  └─ tsconfig.base.json
│  ├─ contracts
│  │  └─ package.json
│  └─ ui
│     └─ package.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ README-DESIGN-SYSTEM-PIZZARIA.md
├─ README.md
└─ scripts

```