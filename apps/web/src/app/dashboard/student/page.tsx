'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function StudentDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard/student/classes');
  }, [router]);

  return null;
}

