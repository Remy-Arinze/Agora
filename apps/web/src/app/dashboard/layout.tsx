'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SidebarNew } from '@/components/layout/SidebarNew';
import { Navbar } from '@/components/layout/Navbar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';

function MainContent({ children }: { children: React.ReactNode }) {
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  
  // Hide navbar for SUPER_ADMIN and SCHOOL_ADMIN
  const showNavbar = userRole !== 'SUPER_ADMIN' && userRole !== 'SCHOOL_ADMIN';
  
  return (
    <main 
      className="flex-1 overflow-y-auto p-8 transition-all duration-300 bg-[var(--dark-bg)] scrollbar-hide md:ml-[250px]"
    >
      {children}
    </main>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  
  // Hide navbar for SUPER_ADMIN and SCHOOL_ADMIN
  const showNavbar = userRole !== 'SUPER_ADMIN' && userRole !== 'SCHOOL_ADMIN';
  
  return (
    <div className="h-screen bg-[var(--dark-bg)] transition-colors duration-200 flex flex-col overflow-hidden">
      {showNavbar && <Navbar />}
      <div className={`flex flex-1 overflow-hidden relative ${showNavbar ? 'pt-16' : ''}`}>
        <SidebarNew />
        <MainContent>{children}</MainContent>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hide scrollbar on dashboard
  useEffect(() => {
    document.documentElement.classList.add('scrollbar-hide');
    document.body.classList.add('scrollbar-hide');
    
    return () => {
      document.documentElement.classList.remove('scrollbar-hide');
      document.body.classList.remove('scrollbar-hide');
    };
  }, []);

  return (
    <ProtectedRoute>
      <SidebarProvider open={true} setOpen={() => {}} animate={false}>
        <DashboardContent>{children}</DashboardContent>
      </SidebarProvider>
    </ProtectedRoute>
  );
}

