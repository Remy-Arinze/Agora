# Type Generation Pipeline

This document explains how types flow from Backend → Frontend automatically.

## Architecture

```
Backend (NestJS)          Codegen Tool          Frontend (Next.js)
─────────────────         ───────────          ──────────────────
@ApiProperty()    →    openapi-typescript   →    Generated Types
StudentDto              -codegen                 useGetStudentsQuery()
                        Parses swagger.json       Fully typed!
```

## Step-by-Step Workflow

### 1. Backend Defines DTOs

```typescript
// apps/api/src/students/dto/student.dto.ts
export class StudentDto {
  @ApiProperty({ example: 'AGO-2025-001' })
  uid: string;

  @ApiProperty({ example: 'John' })
  firstName: string;
}
```

### 2. Controller Uses DTOs

```typescript
@Get()
@ApiResponse({ type: ResponseDto<PaginatedResponseDto<StudentDto>> })
async findAll(): Promise<ResponseDto<PaginatedResponseDto<StudentDto>>> {
  // ...
}
```

### 3. Swagger Generates OpenAPI Spec

NestJS automatically generates `swagger.json` at `/api/swagger-json` with:
- All endpoints
- Request/response schemas
- Examples from `@ApiProperty`

### 4. Codegen Tool Parses Spec

```bash
npm run generate-client
```

This runs:
```bash
openapi-typescript-codegen \
  --input http://localhost:4000/api/swagger-json \
  --output ./src/lib/api/generated \
  --client axios
```

### 5. Generated Code Appears

```typescript
// apps/web/src/lib/api/generated/models/StudentDto.ts
export interface StudentDto {
  uid: string;
  firstName: string;
  // ... fully typed!
}

// apps/web/src/lib/api/generated/services/StudentsService.ts
export const useGetStudentsQuery = (params: {
  page?: number;
  limit?: number;
}) => {
  // RTK Query hook with full type safety
};
```

### 6. Frontend Uses Generated Hooks

```typescript
import { useGetStudentsQuery } from '@/lib/api/generated';

function StudentsList() {
  const { data, isLoading, error } = useGetStudentsQuery({ page: 1 });
  
  // data is ResponseDto<PaginatedResponseDto<StudentDto>>
  // Fully typed, no manual interfaces needed!
  
  return <div>{data?.data.items.map(student => ...)}</div>;
}
```

## Benefits

✅ **Zero manual typing** - Types come from backend  
✅ **Contract enforcement** - Frontend can't use wrong types  
✅ **Auto-completion** - IDE knows all available fields  
✅ **Refactoring safety** - Backend changes break frontend at compile time  

## Regenerating Types

After backend changes:
1. Restart backend server
2. Run `npm run generate-client` in `apps/web`
3. Types update automatically

## Example: Complete Flow

**Backend:**
```typescript
@Post('bulk-import')
@ApiOperation({ summary: 'Bulk import students' })
@ApiResponse({ type: ResponseDto<ImportSummaryDto> })
async bulkImport(@UploadedFile() file: Express.Multer.File) {
  // ...
}
```

**Generated Frontend:**
```typescript
import { useBulkImportMutation } from '@/lib/api/generated';

function ImportPage() {
  const [importStudents, { isLoading }] = useBulkImportMutation();
  
  const handleImport = async (file: File) => {
    const result = await importStudents({ file });
    // result.data is ResponseDto<ImportSummaryDto>
    // Fully typed!
  };
}
```

No manual types needed! 🎉

