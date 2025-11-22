'use client';

import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/lib/store/store';
import { logout } from '@/lib/store/slices/authSlice';

export function useAuth() {
  const auth = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const router = useRouter();

  const isAuthenticated = !!auth.token && !!auth.user;
  const user = auth.user;

  const handleLogout = () => {
    dispatch(logout());
    router.push('/auth/login');
  };

  const getDashboardPath = (): string => {
    if (!user) return '/auth/login';
    const roleMap: Record<string, string> = {
      SUPER_ADMIN: '/dashboard/super-admin',
      SCHOOL_ADMIN: '/dashboard/school',
      TEACHER: '/dashboard/teacher',
      STUDENT: '/dashboard/student',
    };
    return roleMap[user.role] || '/dashboard';
  };

  return {
    user,
    token: auth.token,
    isAuthenticated,
    logout: handleLogout,
    getDashboardPath,
  };
}

