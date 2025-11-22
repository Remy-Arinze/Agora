# Database Migration Guide

## Why Migrations Hang in Turborepo

The `prisma migrate dev` command is **interactive** by default - it prompts you to name each migration. When running through Turborepo, the command can't receive interactive input, causing it to hang indefinitely.

## Solution

We've configured the migration command to be non-interactive by:
1. Adding `--name migration` flag (provides a default name)
2. Adding `--skip-generate` flag (we have a separate `db:generate` command)
3. Configuring Turborepo to handle the task correctly

## Running Migrations

### Initial Migration (First Time Setup)

```bash
# From root directory
npm run db:migrate
```

This will:
- Create the initial migration with name "migration"
- Apply it to your database
- Skip Prisma client generation (run `npm run db:generate` separately)

### Creating a New Migration

For subsequent migrations, you have two options:

**Option 1: Use db:push (Development Only)**
```bash
cd packages/database
npm run db:push
```
This applies schema changes directly without creating migration files. Use only in development.

**Option 2: Create Migration Manually**
```bash
cd packages/database
npx prisma migrate dev --name your_migration_name
```
Run this directly (not through Turborepo) so you can provide the migration name interactively.

### Alternative: Use db:push for Development

For development, you can use `db:push` which doesn't create migration files:

```bash
cd packages/database
npm run db:push
```

This is faster and doesn't require naming migrations, but changes are not versioned.

## Troubleshooting

### Migration Still Hangs?

1. **Check your database connection**: Ensure `DB_URL` is set correctly in `packages/database/.env`
2. **Run directly (not through Turborepo)**: 
   ```bash
   cd packages/database
   npx prisma migrate dev --name migration
   ```
3. **Check for migration lock**: If a previous migration was interrupted, you may need to manually clean up the `_prisma_migrations` table

### Reset Database

If you need to start fresh:

```bash
cd packages/database
npx prisma migrate reset
```

This will:
- Drop the database
- Create a new database
- Apply all migrations
- Run the seed script

## Best Practices

1. **Always run `db:generate` after schema changes**:
   ```bash
   npm run db:generate
   ```

2. **For production migrations**, use `prisma migrate deploy`:
   ```bash
   npx prisma migrate deploy
   ```

3. **Never edit migration files manually** - always modify the schema and create new migrations

