# Agora Web Frontend

Next.js 14 App Router frontend with RTK Query and auto-generated API types.

## Type Generation Workflow

1. **Backend generates Swagger spec** at `http://localhost:4000/api/swagger-json`
2. **Run codegen**: `npm run generate-client`
3. **Generated types** appear in `src/lib/api/generated/`
4. **Use generated hooks** in components:

```typescript
import { useGetStudentsQuery } from '@/lib/api/generated';

function StudentsList() {
  const { data, isLoading } = useGetStudentsQuery({ page: 1, limit: 20 });
  // data is fully typed as ResponseDto<PaginatedResponseDto<StudentDto>>
  return <div>...</div>;
}
```

## Multi-Tenancy

The `x-tenant-id` header is automatically injected based on:
1. Subdomain extraction (e.g., `kings-college.agora.ng` → `kings-college`)
2. localStorage value (set after login)
3. Redux state (from auth slice)

## Redux Store

The store is configured with:
- **RTK Query** for API calls
- **redux-persist** for offline capability (auth state)
- **Automatic tenant header injection** in `apiSlice`

## Development

```bash
# Start dev server
npm run dev

# Generate API client from Swagger
npm run generate-client
```

