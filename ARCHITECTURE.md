# Agora Architecture Overview

## System Design Principles

### 1. Swagger-Driven Development
- **Backend**: Every DTO uses `@ApiProperty` with examples
- **Codegen**: Frontend types auto-generated from Swagger spec
- **Contract**: Backend and frontend share the same type definitions
- **Result**: Zero manual typing, compile-time safety

### 2. Multi-Tenancy
- **Header-based**: `x-tenant-id` injected by frontend
- **Subdomain fallback**: Middleware extracts from host header
- **Scoped queries**: All Prisma queries filtered by tenant
- **Exception**: SuperAdmin can access cross-tenant data

### 3. Chain-of-Trust Onboarding
```
School Admin → Bulk Import → Shadow Profiles → OTP Claiming → Active Accounts
```

### 4. Type Safety Pipeline

```
┌─────────────────┐
│  NestJS Backend │
│  @ApiProperty() │
│  StudentDto     │
└────────┬────────┘
         │
         │ Swagger JSON
         ▼
┌─────────────────┐
│  Codegen Tool   │
│  openapi-ts-    │
│  codegen        │
└────────┬────────┘
         │
         │ Generated Types
         ▼
┌─────────────────┐
│  Next.js Frontend│
│  useGetStudents │
│  Query()        │
│  Fully Typed!   │
└─────────────────┘
```

## Backend Architecture (NestJS)

### Module Structure

```
apps/api/src/
├── auth/              # JWT authentication
│   ├── guards/        # ShadowUserGuard, JwtAuthGuard
│   ├── strategies/    # JWT strategy
│   └── dto/           # LoginDto, VerifyOtpDto
├── onboarding/        # Bulk import & shadow profiles
│   ├── dto/           # BulkImportRowDto, ImportSummaryDto
│   └── onboarding.service.ts
├── students/          # Student management
│   ├── dto/           # StudentDto, StudentWithEnrollmentDto
│   └── students.controller.ts (Full Swagger docs)
├── tenant/            # Multi-tenancy
│   ├── tenant.middleware.ts
│   └── tenant.service.ts
└── common/
    ├── dto/           # ResponseDto<T>, PaginationDto
    ├── decorators/    # @TenantId()
    └── guards/        # TenantGuard
```

### Key Patterns

#### 1. Response Wrapper
```typescript
ResponseDto<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}
```

#### 2. Tenant Scoping
```typescript
@UseGuards(JwtAuthGuard, TenantGuard)
async findAll(@TenantId() tenantId: string) {
  // tenantId automatically injected
  // All queries scoped to this tenant
}
```

#### 3. Shadow User Prevention
```typescript
@UseGuards(JwtAuthGuard, ShadowUserGuard)
// Prevents SHADOW users from accessing protected routes
```

## Frontend Architecture (Next.js 14)

### Redux Store Setup

```typescript
// Store Provider (Client Component)
<StoreProvider>
  <App />
</StoreProvider>

// Store Structure
{
  auth: { token, user, tenantId },  // Persisted
  api: { queries, mutations }        // RTK Query cache
}
```

### Multi-Tenancy Header Injection

```typescript
// apiSlice.ts
prepareHeaders: (headers) => {
  const tenantId = getTenantId(); // From subdomain or localStorage
  headers.set('x-tenant-id', tenantId);
  return headers;
}
```

### Generated Hooks Usage

```typescript
// After codegen, use generated hooks:
import { useGetStudentsQuery } from '@/lib/api/generated';

const { data } = useGetStudentsQuery({ page: 1 });
// data is ResponseDto<PaginatedResponseDto<StudentDto>>
// Fully typed, no manual interfaces!
```

## Data Flow: Bulk Import Example

### 1. School Admin Uploads Excel
```
POST /api/onboarding/bulk-import
Headers: { x-tenant-id: "school-123" }
Body: FormData with Excel file
```

### 2. Backend Processing
```typescript
// OnboardingService.bulkImport()
1. Parse Excel → BulkImportRowDto[]
2. For each row:
   - Generate UID: "AGO-2025-001"
   - Create Shadow User (Student)
   - Create/Find Shadow User (Parent)
   - Link via StudentGuardian
   - Create Enrollment
3. Return ImportSummaryDto
```

### 3. Parent Claiming Flow
```
1. School sends notification → OTP generated
2. Parent receives SMS: "Use code 1234 to claim"
3. POST /api/auth/verify-otp { phone, code }
4. Backend:
   - Validates OTP
   - Activates Parent (SHADOW → ACTIVE)
   - Locks Student profiles (profileLocked = true)
5. Returns AuthTokensDto
```

## Database Schema Highlights

### Global Tables (Cross-Tenant)
- `User` - All authenticated entities
- `Student` - Digital Education Identity
- `Parent` - Guardian profiles

### Tenant-Scoped Tables
- `Enrollment` - Student-School relationship
- `Grade` - Academic records
- `Attendance` - Attendance tracking
- `Fee` - Financial records

### Key Fields
- `User.accountStatus`: SHADOW | ACTIVE | SUSPENDED
- `Student.profileLocked`: Prevents identity fraud after parent claim
- `Enrollment.debtBalance`: Blocks transfers if > 0

## Security Considerations

1. **Shadow User Guard**: Prevents unclaimed accounts from logging in
2. **Profile Locking**: Student profiles immutable after parent claim
3. **Tenant Isolation**: All queries scoped to tenant
4. **JWT Expiration**: Configurable token lifetime
5. **OTP Expiration**: Time-limited verification codes

## Development Workflow

### Adding a New Endpoint

1. **Backend**: Create DTO with `@ApiProperty`
2. **Backend**: Add controller with `@ApiOperation`, `@ApiResponse`
3. **Backend**: Restart server
4. **Frontend**: Run `npm run generate-client`
5. **Frontend**: Use generated hook - fully typed!

### Example: Adding "Get Student Grades"

```typescript
// Backend: students.controller.ts
@Get(':id/grades')
@ApiResponse({ type: ResponseDto<GradeDto[]> })
async getGrades(@Param('id') id: string) { ... }

// After codegen:
import { useGetStudentGradesQuery } from '@/lib/api/generated';
const { data } = useGetStudentGradesQuery({ id: 'student-123' });
// data is ResponseDto<GradeDto[]> - fully typed!
```

## Next Steps

1. **NotificationModule**: Implement BullMQ queues for Email/SMS
2. **Transfer Module**: Complete debt checking and approval flow
3. **RBAC**: Role-based access control guards
4. **Offline-First**: TanStack Query with IndexedDB persistence
5. **Device Tracking**: Capture DeviceID on login for security

