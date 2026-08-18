
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
│  │  │  └─ meta
│  │  │     ├─ 0000_snapshot.json
│  │  │     └─ _journal.json
│  │  ├─ drizzle.config.ts
│  │  ├─ package.json
│  │  ├─ src
│  │  │  ├─ db
│  │  │  │  ├─ index.ts
│  │  │  │  └─ schema
│  │  │  │     ├─ index.ts
│  │  │  │     └─ restaurants.ts
│  │  │  ├─ http
│  │  │  │  ├─ error-handler.ts
│  │  │  │  └─ routes.ts
│  │  │  ├─ modules
│  │  │  │  └─ restaurants
│  │  │  │     ├─ controllers
│  │  │  │     │  ├─ create-restaurant.ts
│  │  │  │     │  ├─ get-restaurant.ts
│  │  │  │     │  └─ list-restaurants.ts
│  │  │  │     ├─ errors
│  │  │  │     │  └─ restaurant-not-found-error.ts
│  │  │  │     ├─ repositories
│  │  │  │     │  ├─ drizzle-restaurants-repository.ts
│  │  │  │     │  ├─ drizzle-tables-repository.ts
│  │  │  │     │  ├─ in-memory-restaurants-repository.ts
│  │  │  │     │  ├─ in-memory-tables-repository.ts
│  │  │  │     │  ├─ restaurants-repository.ts
│  │  │  │     │  └─ tables-repository.ts
│  │  │  │     ├─ schemas
│  │  │  │     │  ├─ restaurant.schema.ts
│  │  │  │     │  ├─ restaurants.ts
│  │  │  │     │  └─ tables.ts
│  │  │  │     └─ use-cases
│  │  │  │        ├─ create-restaurant.spec.ts
│  │  │  │        ├─ create-restaurant.use-case.ts
│  │  │  │        ├─ create-table.spec.ts
│  │  │  │        ├─ create-table.use-case.ts
│  │  │  │        ├─ get-restaurant.spec.ts
│  │  │  │        ├─ get-restaurant.use-case.ts
│  │  │  │        ├─ list-restaurants.spec.ts
│  │  │  │        ├─ list-restaurants.use-case.ts
│  │  │  │        ├─ list-tables.spec.ts
│  │  │  │        └─ list-tables.use-case.ts
│  │  │  └─ server.ts
│  │  ├─ tests
│  │  │  └─ e2e
│  │  │     └─ restaurants
│  │  │        └─ restaurants.e2e.spec.ts
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
└─ scripts

```