# Agora Setup Guide

Complete setup instructions for the Agora monorepo.

## Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL database
- Redis (for BullMQ queues - optional for MVP)

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

```bash
# Set up your database URL in packages/database/.env
DATABASE_URL="postgresql://user:password@localhost:5432/agora"

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

### 3. Backend Setup

```bash
cd apps/api

# Create .env file
cp .env.example .env

# Set required variables:
# - DATABASE_URL (from Prisma)
# - JWT_SECRET (generate a secure random string)
# - JWT_EXPIRES_IN (e.g., "1d")
# - FRONTEND_URL (e.g., "http://localhost:3000")
```

### 4. Frontend Setup

```bash
cd apps/web

# Create .env.local file
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### 5. Start Development Servers

```bash
# From root directory
npm run dev
```

This starts:
- Backend API: http://localhost:4000
- Frontend: http://localhost:3000
- Swagger Docs: http://localhost:4000/api/swagger

## Type Generation Workflow

### First Time Setup

1. **Start the backend server** (so Swagger JSON is available)
2. **Generate frontend types**:
   ```bash
   cd apps/web
   npm run generate-client
   ```
3. **Types are now available** in `apps/web/src/lib/api/generated/`

### After Backend Changes

Whenever you add/modify DTOs or endpoints:

1. Restart backend server
2. Run `npm run generate-client` in `apps/web`
3. Types update automatically

## Project Structure

```
agora/
├── apps/
│   ├── api/          # NestJS backend
│   │   └── src/
│   │       ├── auth/
│   │       ├── onboarding/
│   │       ├── students/
│   │       └── ...
│   └── web/          # Next.js frontend
│       └── src/
│           ├── app/
│           ├── lib/
│           │   ├── store/      # Redux store
│           │   └── api/        # Generated API client
│           └── components/
├── packages/
│   ├── database/     # Prisma schema
│   └── types/        # Shared types
└── turbo.json        # Turborepo config
```

## Key Features

### Multi-Tenancy

- Backend middleware extracts `x-tenant-id` from headers
- Frontend automatically injects header based on subdomain
- All queries scoped to tenant

### Type Safety

- All DTOs use `@ApiProperty` with examples
- Frontend types auto-generated from Swagger
- Zero manual TypeScript interfaces

### Authentication

- JWT-based auth
- Shadow user guard (prevents login for unclaimed accounts)
- OTP verification for parent claiming

## Next Steps

1. Implement NotificationModule with BullMQ
2. Complete Transfer module
3. Add role-based access control (RBAC)
4. Implement offline-first features with TanStack Query

