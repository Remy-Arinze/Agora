'use client';

import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { SidebarBody, SidebarLink, useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { useGetMyStudentProfileQuery } from '@/lib/store/api/schoolAdminApi';
import { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  GraduationCap,
  Upload,
  UserCheck,
  User,
  ArrowRightLeft,
  LogOut,
  Puzzle,
  BookOpen,
  BookMarked,
  Calendar,
  Clock,
  UserPlus,
  FileText,
  School,
  Award,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getActivePluginsForTeacher } from '@/lib/plugins';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';

interface NavItem {
  label: string | ((terminology: ReturnType<typeof getTerminology>) => string);
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const getNavItems = (terminology: ReturnType<typeof getTerminology>): NavItem[] => [
  // Super Admin sections - Overview first
  {
    label: 'Overview',
    href: '/dashboard/super-admin/overview',
    icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" />,
    roles: ['SUPER_ADMIN'],
  },
  {
    label: 'Schools',
    href: '/dashboard/super-admin/schools',
    icon: <Building2 className="h-5 w-5 flex-shrink-0" />,
    roles: ['SUPER_ADMIN'],
  },
  {
    label: 'Analytics',
    href: '/dashboard/super-admin/analytics',
    icon: <BarChart3 className="h-5 w-5 flex-shrink-0" />,
    roles: ['SUPER_ADMIN'],
  },
  {
    label: 'Plugins',
    href: '/dashboard/super-admin/plugins',
    icon: <Puzzle className="h-5 w-5 flex-shrink-0" />,
    roles: ['SUPER_ADMIN'],
  },
  // School sections
  {
    label: 'Overview',
    href: '/dashboard/school/overview',
    icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" />,
    roles: ['SCHOOL_ADMIN'],
  },
  {
    label: 'Students',
    href: '/dashboard/school/students',
    icon: <GraduationCap className="h-5 w-5 flex-shrink-0" />,
    roles: ['SCHOOL_ADMIN'],
  },
  {
    label: 'Staff',
    href: '/dashboard/school/teachers',
    icon: <Users className="h-5 w-5 flex-shrink-0" />,
    roles: ['SCHOOL_ADMIN'],
  },
  {
    label: () => terminology.courses,
    href: '/dashboard/school/courses',
    icon: <BookOpen className="h-5 w-5 flex-shrink-0" />,
    roles: ['SCHOOL_ADMIN'],
  },
  {
    label: 'Subjects',
    href: '/dashboard/school/subjects',
    icon: <BookMarked className="h-5 w-5 flex-shrink-0" />,
    roles: ['SCHOOL_ADMIN'],
  },
  {
    label: 'Timetables',
    href: '/dashboard/school/timetables',
    icon: <Clock className="h-5 w-5 flex-shrink-0" />,
    roles: ['SCHOOL_ADMIN'],
  },
  {
    label: 'Calendar',
    href: '/dashboard/school/calendar',
    icon: <Calendar className="h-5 w-5 flex-shrink-0" />,
    roles: ['SCHOOL_ADMIN'],
  },
  {
    label: 'Admissions',
    href: '/dashboard/school/admissions',
    icon: <UserPlus className="h-5 w-5 flex-shrink-0" />,
    roles: ['SCHOOL_ADMIN'],
  },
  {
    label: 'Transfers',
    href: '/dashboard/school/transfers',
    icon: <ArrowRightLeft className="h-5 w-5 flex-shrink-0" />,
    roles: ['SCHOOL_ADMIN'],
  },
  {
    label: 'Marketplace',
    href: '/dashboard/school/marketplace',
    icon: <Puzzle className="h-5 w-5 flex-shrink-0" />,
    roles: ['SCHOOL_ADMIN'],
  },
  // Student sections
  {
    label: 'Overview',
    href: '/dashboard/student/overview',
    icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" />,
    roles: ['STUDENT'],
  },
  {
    label: 'Classes',
    href: '/dashboard/student/classes',
    icon: <BookOpen className="h-5 w-5 flex-shrink-0" />,
    roles: ['STUDENT'],
  },
  {
    label: 'Timetables',
    href: '/dashboard/student/timetables',
    icon: <Clock className="h-5 w-5 flex-shrink-0" />,
    roles: ['STUDENT'],
  },
  {
    label: 'Results',
    href: '/dashboard/student/grades',
    icon: <FileText className="h-5 w-5 flex-shrink-0" />,
    roles: ['STUDENT'],
  },
  {
    label: 'Calendar',
    href: '/dashboard/student/calendar',
    icon: <Calendar className="h-5 w-5 flex-shrink-0" />,
    roles: ['STUDENT'],
  },
  {
    label: 'Resources',
    href: '/dashboard/student/resources',
    icon: <FileText className="h-5 w-5 flex-shrink-0" />,
    roles: ['STUDENT'],
  },
  {
    label: 'History',
    href: '/dashboard/student/history',
    icon: <GraduationCap className="h-5 w-5 flex-shrink-0" />,
    roles: ['STUDENT'],
  },
  {
    label: 'Transfers',
    href: '/dashboard/student/transfers',
    icon: <ArrowRightLeft className="h-5 w-5 flex-shrink-0" />,
    roles: ['STUDENT'],
  },
  // Teacher sections
  {
    label: 'Timetables',
    href: '/dashboard/teacher/timetables',
    icon: <Clock className="h-5 w-5 flex-shrink-0" />,
    roles: ['TEACHER'],
  },
  {
    label: 'Classes',
    href: '/dashboard/teacher/classes',
    icon: <BookOpen className="h-5 w-5 flex-shrink-0" />,
    roles: ['TEACHER'],
  },
  {
    label: 'Calendar',
    href: '/dashboard/teacher/calendar',
    icon: <Calendar className="h-5 w-5 flex-shrink-0" />,
    roles: ['TEACHER'],
  },
  {
    label: 'Transfers',
    href: '/dashboard/transfers',
    icon: <ArrowRightLeft className="h-5 w-5 flex-shrink-0" />,
    roles: ['PARENT'],
  },
];

function LogoSection() {
  const { open } = useSidebar();
  
  return (
    <div className="mb-8">
      <Link
        href="/"
        className="font-normal flex space-x-2 items-center text-sm text-gray-900 dark:text-dark-text-primary py-1 relative z-20"
      >
        <div className="h-5 w-6 bg-blue-600 dark:bg-blue-500 rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
        <motion.span
          animate={{
            display: open ? "inline-block" : "none",
            opacity: open ? 1 : 0,
          }}
          className="font-bold text-gray-900 dark:text-dark-text-primary whitespace-pre"
        >
          Agora
        </motion.span>
      </Link>
    </div>
  );
}

function UserProfileSection() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { open } = useSidebar();
  const pathname = usePathname();
  const [imageError, setImageError] = useState(false);

  // Get student profile if user is a student
  const { data: studentProfileResponse } = useGetMyStudentProfileQuery(undefined, {
    skip: user?.role !== 'STUDENT',
  });
  const studentProfile = studentProfileResponse?.data;

  if (!user) return null;

  // Get profile image and name
  const profileImage = user.role === 'STUDENT' ? studentProfile?.profileImage : null;
  const firstName = user.role === 'STUDENT' ? studentProfile?.firstName : null;
  const lastName = user.role === 'STUDENT' ? studentProfile?.lastName : null;
  
  // Get initials for fallback
  const getInitials = () => {
    if (user.role === 'STUDENT' && firstName && lastName) {
      return `${firstName[0]?.toUpperCase() || ''}${lastName[0]?.toUpperCase() || ''}`;
    }
    // Fallback to email/phone initials
    const identifier = user.email || user.phone || 'U';
    return identifier[0]?.toUpperCase() || 'U';
  };

  const initials = getInitials();
  const displayName = user.role === 'STUDENT' && firstName && lastName
    ? `${firstName} ${lastName}`
    : user.email || user.phone || 'User';

  // Determine if we should show the image
  const shouldShowImage = profileImage && !imageError && profileImage.trim() !== '';

  return (
    <div className="mb-6 pb-6 border-b border-gray-200 dark:border-dark-border">
      <Link
        href="/dashboard/profile"
        className={`flex items-center ${open ? 'gap-3' : 'justify-center'} p-3 rounded-lg transition-colors ${
          pathname === '/dashboard/profile'
            ? 'bg-blue-600 dark:bg-blue-500 text-white dark:text-white'
            : 'hover:bg-gray-100 dark:hover:bg-[var(--dark-hover)]'
        }`}
      >
        {shouldShowImage ? (
          <img
            src={profileImage!}
            alt={displayName}
            className={`${open ? 'h-10 w-10' : 'h-8 w-8'} flex-shrink-0 rounded-full object-cover border-2 border-light-border dark:border-dark-border`}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`${open ? 'h-10 w-10' : 'h-8 w-8'} rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center text-white font-semibold text-sm border-2 border-light-border dark:border-dark-border shadow-sm flex-shrink-0`}>
            {initials}
          </div>
        )}
        <motion.div
          animate={{
            display: open ? "block" : "none",
            opacity: open ? 1 : 0,
          }}
          className="flex-1 min-w-0"
        >
          <p className={`text-sm font-medium truncate ${
            pathname === '/dashboard/profile'
              ? 'text-white dark:text-white'
              : 'text-gray-900 dark:text-dark-text-primary'
          }`}>
            {displayName}
          </p>
          <p className={`text-xs capitalize truncate ${
            pathname === '/dashboard/profile'
              ? 'text-white/80 dark:text-white/80'
              : 'text-gray-500 dark:text-dark-text-secondary'
          }`}>
            {user.role.replace('_', ' ').toLowerCase()}
          </p>
        </motion.div>
      </Link>
    </div>
  );
}

function LogoutButton() {
  const { logout } = useAuth();
  const { open } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={logout}
      className="w-full justify-start gap-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-[var(--dark-hover)]"
    >
      <LogOut className="h-5 w-5 flex-shrink-0" />
      <motion.span
        animate={{
          display: open ? "inline-block" : "none",
          opacity: open ? 1 : 0,
        }}
        className="text-sm"
      >
        Logout
      </motion.span>
    </Button>
  );
}

export function SidebarNew() {
  const user = useSelector((state: RootState) => state.auth.user);
  const pathname = usePathname();
  
  // Get school type and terminology for SCHOOL_ADMIN
  const { currentType } = useSchoolType();
  const terminology = getTerminology(user?.role === 'SCHOOL_ADMIN' ? currentType : null);

  if (!user) return null;

  const navItems = getNavItems(terminology);
  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  // Add active plugins as tools for teachers
  let links = filteredNavItems.map((item) => ({
    label: typeof item.label === 'function' ? item.label(terminology) : item.label,
    href: item.href,
    icon: item.icon,
  }));

  // If user is a teacher, add active plugins as tools
  if (user.role === 'TEACHER') {
    // Remove History from links if it exists (it's now in profile)
    links = links.filter(link => link.href !== '/dashboard/teacher/history');
    
    const activePlugins = getActivePluginsForTeacher();
    const pluginLinks = activePlugins.map((plugin) => {
      const Icon = plugin.icon;
      return {
        label: plugin.name,
        href: `/dashboard/teacher/plugins/${plugin.slug}`,
        icon: <Icon className="h-5 w-5 flex-shrink-0" />,
      };
    });
    
    // Add plugins
    if (pluginLinks.length > 0) {
      links = [
        ...links,
        ...pluginLinks,
      ];
    }
  }

  return (
    <SidebarBody className="justify-between gap-10">
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <LogoSection />
        
        {/* User Profile at Top */}
        <UserProfileSection />

        {/* Navigation Links */}
        <div className="flex flex-col gap-2 flex-1">
          {links.map((link, idx) => {
            const isActive =
              pathname === link.href ||
              pathname.startsWith(link.href + '/') ||
              (link.href === '/dashboard/super-admin/overview' &&
                pathname === '/dashboard/super-admin') ||
              (link.href === '/dashboard/school/overview' &&
                (pathname === '/dashboard/school' || pathname === '/dashboard')) ||
              (link.href === '/dashboard/student/overview' &&
                (pathname === '/dashboard/student' || pathname === '/dashboard')) ||
              (link.href === '/dashboard/teacher/timetables' &&
                (pathname === '/dashboard/teacher' || pathname === '/dashboard'));
            return (
              <SidebarLink
                key={idx}
                link={link}
                isActive={isActive}
              />
            );
          })}
        </div>
      </div>

      {/* Logout Button at Bottom */}
      <div className="pt-4 border-t border-gray-200 dark:border-dark-border">
        <LogoutButton />
      </div>
    </SidebarBody>
  );
}

