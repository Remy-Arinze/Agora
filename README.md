# Agora - Multi-Tenant Digital Education Infrastructure

A Chain-of-Trust Registry for lifelong Digital Education Identity (DEI) in Africa.

## Architecture

- **Monorepo**: Turborepo
- **Backend**: NestJS + Swagger/OpenAPI (apps/api)
- **Frontend**: Next.js 14 App Router + RTK Query (apps/web)
- **Database**: PostgreSQL + Prisma (packages/database)
- **Types**: Shared TypeScript interfaces (packages/types)

## Type Safety Pipeline

1. Backend defines DTOs with `@ApiProperty` decorators
2. Swagger spec is generated at `/api/swagger-json`
3. Frontend runs `npm run generate-client` to auto-generate RTK Query hooks
4. All API calls use generated types - zero manual typing

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Start development servers
npm run dev

# Generate frontend API client from Swagger
npm run generate-client
```

## Key Features

- Multi-tenant architecture with host-based routing
- Shadow profiles for unclaimed student/parent records
- Chain-of-trust onboarding flow
- Swagger-driven type generation
- RTK Query with auto-generated hooks
- Offline-first with redux-persist

