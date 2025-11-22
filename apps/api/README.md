# Agora API Backend

NestJS backend with Swagger/OpenAPI documentation and strict type safety.

## Swagger Documentation

- **Swagger UI**: `http://localhost:4000/api/swagger`
- **OpenAPI JSON**: `http://localhost:4000/api/swagger-json`

## Key Principles

1. **Every DTO must use `@ApiProperty`** with examples
2. **Every endpoint must use `@ApiOperation` and `@ApiResponse`**
3. **All responses wrapped in `ResponseDto<T>`**
4. **Strict validation** with `class-validator`

## Example: StudentDto

```typescript
export class StudentDto {
  @ApiProperty({ example: 'AGO-2025-001', description: 'Universal ID' })
  uid: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  firstName: string;
  // ... more properties
}
```

This generates TypeScript interfaces in the frontend automatically.

## Multi-Tenancy

- Middleware extracts `x-tenant-id` from headers
- All queries scoped to tenant unless SuperAdmin
- Use `@TenantId()` decorator in controllers

## Development

```bash
# Start dev server
npm run dev

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

