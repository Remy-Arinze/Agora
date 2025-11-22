# School Type Dashboard Customization Plan

## Overview
This document outlines the strategy for customizing the school admin dashboard based on school type (Primary, Secondary, Tertiary) to provide tailored experiences that match the unique needs of each educational level.

## Current State Analysis

### School Type Flags
- Schools have three boolean flags: `hasPrimary`, `hasSecondary`, `hasTertiary`
- Schools can have multiple types (e.g., Primary + Secondary, All Levels)
- Currently, the dashboard is generic and doesn't differentiate by type

### Key Differences Between School Types

#### **Primary & Secondary Schools**
- **Structure**: Class-based (e.g., JSS1, SS2)
- **Teaching Model**: One teacher per class/subject
- **Terminology**: 
  - "Classes" not "Courses"
  - "Teachers" not "Lecturers"
  - "Subjects" (Mathematics, English, etc.)
  - "Terms" (First Term, Second Term, Third Term)
- **Focus Areas**:
  - Class management
  - Subject assignments
  - Term-based academic calendar
  - Grade levels (JSS1-3, SS1-3)
  - Attendance tracking per class

#### **Tertiary (Universities)**
- **Structure**: Course-based with multiple lecturers
- **Teaching Model**: Multiple lecturers per course, departments, faculties
- **Terminology**:
  - "Courses" not "Classes"
  - "Lecturers" not "Teachers"
  - "Departments" and "Faculties"
  - "Semesters" (First Semester, Second Semester)
  - "Credit Hours"
- **Focus Areas**:
  - Course management
  - Department/Faculty structure
  - Lecturer assignments to courses
  - Semester-based academic calendar
  - Course registration
  - GPA/CGPA calculations

## Proposed Architecture

### 1. **School Type Detection & Context**

```typescript
// Backend: Add to SchoolDto
interface SchoolTypeContext {
  isPrimary: boolean;
  isSecondary: boolean;
  isTertiary: boolean;
  isMixed: boolean; // Has multiple types
  primaryType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | 'MIXED';
}

// Frontend: Hook to get school type context
const useSchoolType = () => {
  const { data: school } = useGetMySchoolQuery();
  return {
    isPrimary: school?.hasPrimary,
    isSecondary: school?.hasSecondary,
    isTertiary: school?.hasTertiary,
    isMixed: (school?.hasPrimary ? 1 : 0) + 
             (school?.hasSecondary ? 1 : 0) + 
             (school?.hasTertiary ? 1 : 0) > 1,
    primaryType: determinePrimaryType(school),
  };
};
```

### 2. **Dashboard Widget System**

Create a widget-based system where different widgets are shown based on school type:

```typescript
// Widget Configuration
interface DashboardWidget {
  id: string;
  component: React.ComponentType;
  allowedTypes: ('PRIMARY' | 'SECONDARY' | 'TERTIARY')[];
  priority: number;
  defaultVisible: boolean;
}

// Example Widgets
const DASHBOARD_WIDGETS: DashboardWidget[] = [
  // Primary/Secondary Widgets
  {
    id: 'class-overview',
    component: ClassOverviewWidget,
    allowedTypes: ['PRIMARY', 'SECONDARY'],
    priority: 1,
  },
  {
    id: 'subject-performance',
    component: SubjectPerformanceWidget,
    allowedTypes: ['PRIMARY', 'SECONDARY'],
    priority: 2,
  },
  // Tertiary Widgets
  {
    id: 'course-registration',
    component: CourseRegistrationWidget,
    allowedTypes: ['TERTIARY'],
    priority: 1,
  },
  {
    id: 'department-overview',
    component: DepartmentOverviewWidget,
    allowedTypes: ['TERTIARY'],
    priority: 2,
  },
  // Shared Widgets
  {
    id: 'student-stats',
    component: StudentStatsWidget,
    allowedTypes: ['PRIMARY', 'SECONDARY', 'TERTIARY'],
    priority: 0,
  },
];
```

### 3. **Navigation Customization**

Customize sidebar navigation based on school type:

```typescript
// Primary/Secondary Navigation
const PRIMARY_SECONDARY_NAV = [
  { label: 'Overview', href: '/dashboard/school/overview' },
  { label: 'Students', href: '/dashboard/school/students' },
  { label: 'Classes', href: '/dashboard/school/classes' }, // Not "Courses"
  { label: 'Teachers', href: '/dashboard/school/teachers' },
  { label: 'Subjects', href: '/dashboard/school/subjects' },
  { label: 'Timetables', href: '/dashboard/school/timetables' },
  { label: 'Terms', href: '/dashboard/school/terms' },
];

// Tertiary Navigation
const TERTIARY_NAV = [
  { label: 'Overview', href: '/dashboard/school/overview' },
  { label: 'Students', href: '/dashboard/school/students' },
  { label: 'Courses', href: '/dashboard/school/courses' }, // Not "Classes"
  { label: 'Lecturers', href: '/dashboard/school/lecturers' }, // Not "Teachers"
  { label: 'Departments', href: '/dashboard/school/departments' },
  { label: 'Faculties', href: '/dashboard/school/faculties' },
  { label: 'Semesters', href: '/dashboard/school/semesters' }, // Not "Terms"
];
```

### 4. **Data Model Considerations**

#### Option A: Unified Model with Type Flags
- Single `Course` model with `isClass` flag
- Single `Teacher` model with `isLecturer` flag
- Use school type to determine behavior

**Pros**: Simpler schema, easier migrations
**Cons**: Can get complex with mixed types

#### Option B: Separate Models
- `Class` model for Primary/Secondary
- `Course` model for Tertiary
- `Teacher` model for Primary/Secondary
- `Lecturer` model for Tertiary

**Pros**: Clear separation, type-safe
**Cons**: More complex, potential duplication

#### **Recommended: Hybrid Approach**
- Keep unified `Teacher` model (can be lecturer or teacher)
- Create `Course` model that can represent both:
  ```typescript
  interface Course {
    id: string;
    schoolId: string;
    name: string;
    code: string;
    type: 'CLASS' | 'COURSE'; // Determines behavior
    // For CLASS (Primary/Secondary)
    classLevel?: string; // JSS1, SS2, etc.
    subject?: string;
    teacherId?: string; // Single teacher
    // For COURSE (Tertiary)
    departmentId?: string;
    creditHours?: number;
    lecturerIds?: string[]; // Multiple lecturers
    semester?: string;
  }
  ```

### 5. **Backend Service Layer Strategy**

```typescript
// Service Factory Pattern
class DashboardServiceFactory {
  static create(school: School): DashboardService {
    if (school.hasTertiary && !school.hasPrimary && !school.hasSecondary) {
      return new TertiaryDashboardService();
    }
    if (school.hasPrimary || school.hasSecondary) {
      return new PrimarySecondaryDashboardService();
    }
    return new MixedDashboardService(); // For schools with multiple types
  }
}

// Base Service
abstract class DashboardService {
  abstract getStats(): Promise<DashboardStats>;
  abstract getWidgets(): Promise<Widget[]>;
}

// Tertiary Implementation
class TertiaryDashboardService extends DashboardService {
  async getStats() {
    return {
      totalCourses: await this.getCourseCount(),
      totalLecturers: await this.getLecturerCount(),
      totalDepartments: await this.getDepartmentCount(),
      // ...
    };
  }
}

// Primary/Secondary Implementation
class PrimarySecondaryDashboardService extends DashboardService {
  async getStats() {
    return {
      totalClasses: await this.getClassCount(),
      totalTeachers: await this.getTeacherCount(),
      totalSubjects: await this.getSubjectCount(),
      // ...
    };
  }
}
```

### 6. **Frontend Component Strategy**

#### A. Conditional Rendering Based on Type
```typescript
const DashboardOverview = () => {
  const { isTertiary, isPrimary, isSecondary } = useSchoolType();
  
  return (
    <>
      {isTertiary && <TertiaryDashboard />}
      {(isPrimary || isSecondary) && <PrimarySecondaryDashboard />}
    </>
  );
};
```

#### B. Shared Components with Type Props
```typescript
const StaffList = ({ schoolType }: { schoolType: SchoolType }) => {
  const label = schoolType === 'TERTIARY' ? 'Lecturers' : 'Teachers';
  const endpoint = schoolType === 'TERTIARY' ? '/lecturers' : '/teachers';
  // ...
};
```

### 7. **Implementation Phases**

#### **Phase 1: Foundation** (Week 1-2)
- [ ] Add school type context to backend responses
- [ ] Create `useSchoolType` hook
- [ ] Update dashboard to detect and display school type
- [ ] Add type-based conditional rendering infrastructure

#### **Phase 2: Navigation Customization** (Week 2-3)
- [ ] Create type-specific navigation configurations
- [ ] Update sidebar to use dynamic navigation
- [ ] Update route handling for type-specific pages

#### **Phase 3: Dashboard Widgets** (Week 3-4)
- [ ] Create widget system architecture
- [ ] Build Primary/Secondary specific widgets
- [ ] Build Tertiary specific widgets
- [ ] Implement widget visibility logic

#### **Phase 4: Data Models** (Week 4-5)
- [ ] Design unified Course/Class model
- [ ] Update backend services to handle type-specific logic
- [ ] Create type-specific endpoints if needed

#### **Phase 5: Mixed School Support** (Week 5-6)
- [ ] Handle schools with multiple types
- [ ] Create tabbed interface or type selector
- [ ] Ensure data isolation per type

### 8. **Edge Cases & Considerations**

#### **Mixed Schools** (Primary + Secondary, etc.)
- **Solution**: Type selector dropdown in navbar
  - Located next to theme toggle (moon icon) in the top navbar
  - If school has only one type: Display as badge/text (no dropdown)
  - If school has multiple types: Display as dropdown with all available types
  - Selected type persists in localStorage/session
  - UI dynamically updates based on selected type:
    - Terminology changes (Teachers → Lecturers, Classes → Courses, etc.)
    - Navigation items change
    - Dashboard widgets change
    - Stats/metrics adapt to type
  - Smooth transitions when switching types
  - Clear visual indicator of current type throughout the UI

#### **Terminology Switching**
- Use a terminology service/mapper:
  ```typescript
  const getTerminology = (schoolType: SchoolType) => ({
    staff: schoolType === 'TERTIARY' ? 'Lecturers' : 'Teachers',
    courses: schoolType === 'TERTIARY' ? 'Courses' : 'Classes',
    periods: schoolType === 'TERTIARY' ? 'Semesters' : 'Terms',
  });
  ```

#### **Data Migration**
- Existing schools need type detection
- May need to migrate existing "courses" to "classes" for Primary/Secondary
- Gradual rollout with feature flags

### 9. **API Design**

```typescript
// Backend: Type-aware endpoints
GET /school-admin/dashboard
Response: {
  schoolType: { hasPrimary, hasSecondary, hasTertiary },
  stats: { ... }, // Type-specific stats
  widgets: [...], // Available widgets for this type
}

// Type-specific endpoints
GET /school-admin/classes (Primary/Secondary)
GET /school-admin/courses (Tertiary)
GET /school-admin/teachers (Primary/Secondary)
GET /school-admin/lecturers (Tertiary)
```

### 10. **User Experience Considerations**

1. **Clear Type Indicators**: Always show school type in header/navigation
2. **Consistent Terminology**: Use correct terms throughout the UI
3. **Smooth Transitions**: When switching types in mixed schools
4. **Helpful Tooltips**: Explain differences for users
5. **Progressive Disclosure**: Show relevant features only

## Recommendations

### **Immediate Actions**
1. ✅ Add school type context to all school-related API responses
2. ✅ Create `useSchoolType` hook in frontend
3. ✅ Create `useSchoolTypeSelector` hook for type switching (with localStorage persistence)
4. ✅ Add type selector dropdown to navbar (next to theme toggle)
5. ✅ Create terminology service/mapper for dynamic text switching
6. ✅ Update dashboard to detect and display school type
7. ✅ Add type-based conditional rendering infrastructure
8. ✅ Start with terminology switching (Teachers → Lecturers, Classes → Courses, etc.)

### **Short-term (1-2 months)**
1. Implement widget system
2. Create type-specific navigation
3. Build Primary/Secondary specific features
4. Build Tertiary specific features

### **Long-term (3-6 months)**
1. Full data model support for both types
2. Mixed school handling
3. Advanced type-specific features
4. Analytics and reporting per type

## Questions to Consider

1. **Should we support schools transitioning between types?** (e.g., adding tertiary to existing secondary)
2. **How do we handle historical data** when a school changes types?
3. **Should there be a "default" type** for mixed schools?
4. **Do we need separate admin roles** for different types? (e.g., Department Head for Tertiary)
5. **How do we handle cross-type features** like student transfers between Primary and Secondary in the same school?

## Conclusion

This customization will significantly improve user experience by providing relevant features and terminology for each school type. The phased approach allows for gradual implementation while maintaining system stability.

