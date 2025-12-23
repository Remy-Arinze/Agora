'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Loader2 } from 'lucide-react';

export default function TeacherDashboard() {
  const router = useRouter();

  useEffect(() => {
    // All teachers go to overview as their dashboard home
    router.replace('/dashboard/teacher/overview');
  }, [router]);

  return (
    <ProtectedRoute roles={['TEACHER']}>
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    </ProtectedRoute>
  );
}

