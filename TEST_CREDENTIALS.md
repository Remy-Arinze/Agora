# Test Login Credentials

This document contains test login credentials for all user roles in the Agora platform.

## How to Seed Test Data

Run the seed script to populate your database with test users:

```bash
npm run db:seed
```

Or from the database package:

```bash
cd packages/database
npm run db:seed
```

## Test Credentials

All test users use the same password: **`Test1234!`**

### Super Admin
- **Email:** `superadmin@agora.com`
- **Phone:** `+2348000000001`
- **Password:** `Test1234!`
- **Route:** `/dashboard/super-admin`

### School Admin
- **Email:** `admin@school.com`
- **Phone:** `+2348000000002`
- **Password:** `Test1234!`
- **Route:** `/dashboard/admin`

### Teacher
- **Email:** `teacher@school.com`
- **Phone:** `+2348000000003`
- **Password:** `Test1234!`
- **Route:** `/dashboard/teacher`

### Parent
- **Email:** `parent@example.com`
- **Phone:** `+2348000000004`
- **Password:** `Test1234!`
- **Route:** `/dashboard/parent`

### Student
- **Email:** `student@example.com`
- **Phone:** `+2348000000005`
- **Password:** `Test1234!`
- **Route:** `/dashboard/student`
- **UID:** `AGO-LAG-2025-0001`

## Test Data Created

The seed script creates:

1. **1 Super Admin** - Full system access
2. **1 School** - "Test Academy" with subdomain "testacademy"
3. **1 School Admin** - Linked to Test Academy
4. **1 Teacher** - Linked to Test Academy
5. **1 Parent** - With profile
6. **1 Student** - With profile, linked to parent, enrolled in Test Academy

## Notes

- All accounts are set to `ACTIVE` status (not `SHADOW`)
- The student is enrolled in the test school
- The parent is linked as a guardian to the student
- All users can log in immediately (no OTP verification needed for these test accounts)

## Resetting Test Data

To reset the test data, you can:

1. Drop and recreate the database
2. Run migrations: `npm run db:migrate`
3. Run seed: `npm run db:seed`

Or manually delete users and run the seed script again (it uses `upsert`, so it's safe to run multiple times).

