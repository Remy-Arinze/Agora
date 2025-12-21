'use client';

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology, Terminology } from '@/lib/utils/terminology';
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  GraduationCap,
  UserPlus,
  ArrowRightLeft,
  Puzzle,
  BookOpen,
  BookMarked,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  Library,
  LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
  schoolTypes?: Array<'PRIMARY' | 'SECONDARY' | 'TERTIARY'>;
  badge?: string | number;
}

export interface SidebarSection {
  title?: string;
  items: NavItem[];
}

/**
 * Hook to get sidebar configuration based on user role and school type
 * This centralizes all sidebar logic for easier maintenance
 */
export function useSidebarConfig(): {
  sections: SidebarSection[];
  terminology: Terminology;
  currentType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
} {
  const user = useSelector((state: RootState) => state.auth.user);
  const { currentType } = useSchoolType();
  const terminology = getTerminology(user?.role === 'SCHOOL_ADMIN' ? currentType : null);

  const sections = useMemo(() => {
    if (!user) return [];

    const role = user.role;

    // Super Admin sidebar
    if (role === 'SUPER_ADMIN') {
      return [
        {
          items: [
            { label: 'Overview', href: '/dashboard/super-admin/overview', icon: LayoutDashboard },
            { label: 'Schools', href: '/dashboard/super-admin/schools', icon: Building2 },
            { label: 'Analytics', href: '/dashboard/super-admin/analytics', icon: BarChart3 },
            { label: 'Plugins', href: '/dashboard/super-admin/plugins', icon: Puzzle },
          ],
        },
      ];
    }

    // School Admin sidebar - dynamic based on school type
    if (role === 'SCHOOL_ADMIN') {
      const baseItems: NavItem[] = [
        { label: 'Overview', href: '/dashboard/school/overview', icon: LayoutDashboard },
        { label: 'Students', href: '/dashboard/school/students', icon: GraduationCap },
        { label: 'Staff', href: '/dashboard/school/teachers', icon: Users },
      ];

      // Add Faculties for tertiary (before Departments/Classes)
      if (currentType === 'TERTIARY') {
        baseItems.push({
          label: 'Faculties',
          href: '/dashboard/school/faculties',
          icon: Library,
          schoolTypes: ['TERTIARY'],
        });
      }

      // Add Classes/Departments based on type
      baseItems.push({
        label: currentType === 'TERTIARY' ? 'Departments' : terminology.courses,
        href: '/dashboard/school/courses',
        icon: BookOpen,
      });

      // Common items after Classes/Departments
      baseItems.push(
        { label: currentType === 'TERTIARY' ? 'Courses' : 'Subjects', href: '/dashboard/school/subjects', icon: BookMarked },
        { label: 'Timetables', href: '/dashboard/school/timetables', icon: Clock },
        { label: 'Calendar', href: '/dashboard/school/calendar', icon: Calendar },
        { label: 'Admissions', href: '/dashboard/school/admissions', icon: UserPlus },
        { label: 'Transfers', href: '/dashboard/school/transfers', icon: ArrowRightLeft },
        { label: 'Subscription', href: '/dashboard/school/subscription', icon: CreditCard }
      );

      return [{ items: baseItems }];
    }

    // Teacher sidebar
    if (role === 'TEACHER') {
      return [
        {
          items: [
            { label: 'Timetables', href: '/dashboard/teacher/timetables', icon: Clock },
            { label: 'Classes', href: '/dashboard/teacher/classes', icon: BookOpen },
            { label: 'Calendar', href: '/dashboard/teacher/calendar', icon: Calendar },
          ],
        },
      ];
    }

    // Student sidebar
    if (role === 'STUDENT') {
      return [
        {
          items: [
            { label: 'Overview', href: '/dashboard/student/overview', icon: LayoutDashboard },
            { label: 'Classes', href: '/dashboard/student/classes', icon: BookOpen },
            { label: 'Timetables', href: '/dashboard/student/timetables', icon: Clock },
            { label: 'Results', href: '/dashboard/student/grades', icon: FileText },
            { label: 'Calendar', href: '/dashboard/student/calendar', icon: Calendar },
            { label: 'Resources', href: '/dashboard/student/resources', icon: FileText },
            { label: 'History', href: '/dashboard/student/history', icon: GraduationCap },
            { label: 'Transfers', href: '/dashboard/student/transfers', icon: ArrowRightLeft },
          ],
        },
      ];
    }

    // Parent sidebar
    if (role === 'PARENT') {
      return [
        {
          items: [
            { label: 'Transfers', href: '/dashboard/transfers', icon: ArrowRightLeft },
          ],
        },
      ];
    }

    return [];
  }, [user, currentType, terminology]);

  return {
    sections,
    terminology,
    currentType,
  };
}

/**
 * Get flat list of nav items (for backwards compatibility with existing sidebar)
 */
export function useFlatNavItems(): NavItem[] {
  const { sections } = useSidebarConfig();
  return sections.flatMap((section) => section.items);
}

