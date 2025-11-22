# Frontend Architecture

## Overview

Modern, role-based frontend built with Next.js 14 App Router, Redux Toolkit, and Tailwind CSS.

## Structure

```
apps/web/src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   │   ├── login/        # Login page
│   │   └── verify-otp/   # OTP verification for parent claiming
│   ├── dashboard/        # Protected dashboard routes
│   │   ├── admin/        # School Admin dashboard
│   │   ├── teacher/      # Teacher dashboard
│   │   ├── parent/       # Parent dashboard
│   │   ├── student/      # Student dashboard
│   │   ├── super-admin/  # Super Admin dashboard
│   │   ├── students/     # Student management
│   │   └── import/       # Bulk import page
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/
│   ├── ui/               # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Alert.tsx
│   │   └── LoadingSpinner.tsx
│   ├── layout/           # Layout components
│   │   ├── Navbar.tsx
│   │   └── Sidebar.tsx
│   ├── auth/            # Auth components
│   │   └── ProtectedRoute.tsx
│   └── RoleGuard.tsx    # Role-based access control
├── hooks/                # Custom React hooks
│   ├── useAuth.ts       # Authentication hook
│   └── useApi.ts        # API call hook
└── lib/
    ├── store/           # Redux store
    └── utils.ts         # Utility functions
```

## Key Features

### 1. Role-Based UI
- **Protected Routes**: `ProtectedRoute` component guards routes by role
- **Dynamic Navigation**: Sidebar shows only relevant links per role
- **Role-Specific Dashboards**: Each role has a tailored dashboard

### 2. Authentication Flow
- **Login**: Email/Phone + Password
- **OTP Verification**: Parent account claiming
- **Auto-redirect**: Based on user role after login
- **Persistent Auth**: Redux Persist saves auth state

### 3. UI Components
- **Button**: Multiple variants (primary, secondary, outline, ghost, danger)
- **Card**: Flexible card component with header/content
- **Input**: Form inputs with labels, errors, and helper text
- **Alert**: Contextual alerts (success, error, warning, info)
- **LoadingSpinner**: Reusable loading states

### 4. API Integration
- **useApi Hook**: Centralized API calls with:
  - Automatic token injection
  - Tenant ID header injection
  - Error handling
  - Type-safe responses

### 5. Best Practices
- **Component Composition**: Reusable, composable components
- **Custom Hooks**: Business logic separated from UI
- **Type Safety**: Strict TypeScript, no `any` types
- **Error Handling**: Consistent error states
- **Loading States**: Proper loading indicators
- **Responsive Design**: Mobile-first with Tailwind

## Role-Based Access

### School Admin
- Dashboard with quick actions
- Student management
- Bulk import
- Transfer requests

### Teacher
- View assigned students
- Record grades
- Attendance tracking

### Parent
- View children's profiles
- Academic records
- Transfer requests

### Student
- View own profile
- Academic history
- Digital Education Identity

### Super Admin
- Manage all schools
- System-wide settings
- Cross-tenant access

## Routing

- `/` - Public home page
- `/auth/login` - Login page
- `/auth/verify-otp` - OTP verification
- `/dashboard/*` - Protected routes (requires auth)
- Auto-redirect based on role

## State Management

- **Redux Toolkit**: Centralized state
- **Redux Persist**: Offline capability (auth state)
- **RTK Query**: Ready for generated API hooks

## Next Steps

1. Generate API client: `npm run generate-client`
2. Replace manual API calls with generated RTK Query hooks
3. Add more dashboard features per role
4. Implement real-time updates (WebSockets)
5. Add data visualization (charts for grades, attendance)

