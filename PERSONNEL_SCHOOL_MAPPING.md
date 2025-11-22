# Personnel to School Mapping & Public ID System

## Current Architecture Overview

### Database Schema

The system uses the following key relationships:

1. **User** (one-to-many with SchoolAdmin/Teacher)
   - A single `User` can have multiple `SchoolAdmin` records (one per school)
   - A single `User` can have multiple `Teacher` records (one per school)
   - Enforced by unique constraint: `@@unique([userId, schoolId])`

2. **SchoolAdmin** & **Teacher** Models
   - Each record has:
     - `publicId` (unique globally) - Format: `AG-{schoolname}-{short alphanumeric}`
     - `schoolId` - Links to the specific school
     - `userId` - Links to the user account
   - Example: A teacher at School A gets `AG-SCHOOLA-ABC123` and at School B gets `AG-SCHOOLB-XYZ789`

## How Public IDs Link to Schools

### 1. Public ID Generation

When personnel are added to a school, a unique public ID is generated:

```typescript
// From apps/api/src/schools/schools.service.ts
private async generatePublicId(schoolName: string, type: 'admin' | 'teacher'): Promise<string> {
  const schoolShort = this.shortenSchoolName(schoolName); // e.g., "SCHOOLA"
  const shortId = this.generateShortId(); // e.g., "ABC123"
  return `AG-${schoolShort}-${shortId}`; // e.g., "AG-SCHOOLA-ABC123"
}
```

**Key Points:**
- Public ID includes the school name abbreviation (though this is just for readability)
- The **actual link to the school** is via the `schoolId` field in the `SchoolAdmin`/`Teacher` record
- Each public ID is globally unique across all schools

### 2. Database Structure

```
User (id: "user-123")
├── SchoolAdmin (id: "admin-1", publicId: "AG-SCHOOLA-ABC", schoolId: "school-a", userId: "user-123")
└── SchoolAdmin (id: "admin-2", publicId: "AG-SCHOOLB-XYZ", schoolId: "school-b", userId: "user-123")
```

**The `schoolId` field in `SchoolAdmin`/`Teacher` is the authoritative link to the school.**

## Login Flow & School Context

### Current Login Process

1. **User logs in with public ID** (e.g., `AG-SCHOOLA-ABC`)

2. **System finds the SchoolAdmin/Teacher record:**
   ```typescript
   // From apps/api/src/auth/auth.service.ts
   schoolAdmin = await this.prisma.schoolAdmin.findUnique({
     where: { publicId: emailOrPublicId },
     include: { user: true },
   });
   ```

3. **The SchoolAdmin/Teacher record contains:**
   - `schoolId` - This identifies which school this public ID belongs to
   - `userId` - Links to the user account

4. **System loads user with all relations:**
   ```typescript
   user = await this.prisma.user.findUnique({
     where: { id: user.id },
     include: {
       schoolAdmins: true,  // All school admin records (multiple schools)
       teacherProfiles: true, // All teacher records (multiple schools)
     },
   });
   ```

### Current Issue: School Context After Login

**Problem:** After login, the system doesn't explicitly track which school context the user is operating in.

Looking at the code:
```typescript
// From auth.service.ts lines 112-120
if (user.schoolAdmins && user.schoolAdmins.length > 0) {
  profileId = user.schoolAdmins[0].adminId;  // ⚠️ Just takes the FIRST one
  publicId = user.schoolAdmins[0].publicId;
}
```

**This means:**
- If a user has multiple schools, the system just picks the first `SchoolAdmin`/`Teacher` record
- The JWT token doesn't include which school context the user logged in with
- The system relies on the user's relations array, but doesn't know which specific school they want to access

## How Data Access is Currently Determined

### 1. During Login (Public ID → School)

When logging in with a public ID:
- The `SchoolAdmin.findUnique({ where: { publicId } })` query returns the specific record
- This record has the `schoolId` field that identifies the school
- **This is the authoritative mapping: `publicId` → `SchoolAdmin`/`Teacher` record → `schoolId`**

### 2. After Login (JWT Validation)

The JWT strategy loads the user:
```typescript
// From jwt.strategy.ts
async validate(payload: { sub: string; role: string }) {
  const user = await this.authService.validateUser(payload.sub);
  // Returns user with schoolAdmins[] and teacherProfiles[] arrays
  return user;
}
```

### 3. Data Access Control (Current Implementation)

Based on the architecture proposal, the system would extract school ID like this:
```typescript
// From BACKEND_ARCHITECTURE_PROPOSAL.md
private extractSchoolIdFromUser(user: User): string {
  if (user.schoolAdmins?.length > 0) {
    return user.schoolAdmins[0].schoolId;  // ⚠️ Problem: Just takes first
  }
  if (user.teacherProfiles?.length > 0) {
    return user.teacherProfiles[0].schoolId;  // ⚠️ Problem: Just takes first
  }
  throw new ForbiddenException('User is not associated with any school');
}
```

## The Gap: Missing School Context

### What's Missing

1. **JWT Token doesn't include schoolId:**
   - Current JWT payload: `{ sub: userId, role: role }`
   - Should include: `{ sub: userId, role: role, schoolId: schoolId, publicId: publicId }`

2. **No way to know which school context after login:**
   - User logs in with `AG-SCHOOLA-ABC` (School A)
   - But system might use `user.schoolAdmins[0]` which could be School B
   - No explicit tracking of which public ID was used to log in

3. **Multi-school users can't switch context:**
   - A user with access to 3 schools can only access the "first" one
   - No mechanism to switch between schools

## Recommended Solution

### Option 1: Include School Context in JWT (Recommended)

Modify the login flow to include the school context in the JWT:

```typescript
// In auth.service.ts login method
async login(loginDto: LoginDto): Promise<AuthTokensDto> {
  // ... existing login logic ...
  
  let currentSchoolId: string | null = null;
  let currentPublicId: string | null = null;
  
  if (schoolAdmin) {
    currentSchoolId = schoolAdmin.schoolId;  // ✅ Capture school from public ID
    currentPublicId = schoolAdmin.publicId;
  } else if (teacherProfile) {
    currentSchoolId = teacherProfile.schoolId;  // ✅ Capture school from public ID
    currentPublicId = teacherProfile.publicId;
  }
  
  // Include in JWT payload
  const tokens = await this.generateTokens(
    user.id, 
    user.role,
    currentSchoolId,  // ✅ Add school context
    currentPublicId   // ✅ Add public ID used for login
  );
  
  return { ...tokens, user: { ... } };
}

private async generateTokens(
  userId: string, 
  role: string,
  schoolId?: string | null,
  publicId?: string | null
) {
  const payload = { 
    sub: userId, 
    role,
    schoolId,    // ✅ Include in JWT
    publicId     // ✅ Include in JWT
  };
  
  return {
    accessToken: this.jwtService.sign(payload),
    refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
  };
}
```

### Option 2: Store School Context in Request (Alternative)

Use a guard/middleware to extract school context from the public ID used to log in:

```typescript
// New guard to extract school context
@Injectable()
export class SchoolContextGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // If user has publicId in JWT, find the specific school
    if (user.publicId) {
      const schoolAdmin = await this.prisma.schoolAdmin.findUnique({
        where: { publicId: user.publicId },
        select: { schoolId: true }
      });
      
      if (schoolAdmin) {
        request.schoolId = schoolAdmin.schoolId;
        return true;
      }
      
      const teacher = await this.prisma.teacher.findUnique({
        where: { publicId: user.publicId },
        select: { schoolId: true }
      });
      
      if (teacher) {
        request.schoolId = teacher.schoolId;
        return true;
      }
    }
    
    // Fallback to first school (current behavior)
    if (user.schoolAdmins?.length > 0) {
      request.schoolId = user.schoolAdmins[0].schoolId;
    } else if (user.teacherProfiles?.length > 0) {
      request.schoolId = user.teacherProfiles[0].schoolId;
    }
    
    return true;
  }
}
```

## Summary

### How It Currently Works

1. **Public ID → School Mapping:**
   - Each `publicId` is stored in a `SchoolAdmin` or `Teacher` record
   - That record has a `schoolId` field that links to the school
   - **Mapping: `publicId` → `SchoolAdmin`/`Teacher` record → `schoolId`**

2. **Login Process:**
   - User provides public ID
   - System finds `SchoolAdmin`/`Teacher` by `publicId`
   - System gets `schoolId` from that record
   - System loads user with all school relations

3. **Data Access:**
   - Currently uses first school in the relations array
   - No explicit tracking of which school context the user logged in with
   - JWT doesn't include school context

### What Needs to Be Fixed

1. **Include school context in JWT** when user logs in with public ID
2. **Track which public ID was used** for login
3. **Allow users to switch between schools** if they have multiple
4. **Enforce school-level data isolation** based on the logged-in school context

### Key Database Fields

- `SchoolAdmin.publicId` + `SchoolAdmin.schoolId` = Link between public ID and school
- `Teacher.publicId` + `Teacher.schoolId` = Link between public ID and school
- `User.schoolAdmins[]` = All schools where user is an admin
- `User.teacherProfiles[]` = All schools where user is a teacher

The `schoolId` field in `SchoolAdmin`/`Teacher` is the **authoritative link** between a public ID and a school.

