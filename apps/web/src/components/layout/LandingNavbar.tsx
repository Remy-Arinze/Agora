'use client';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import Link from 'next/link';

export function LandingNavbar() {
    const { user, getDashboardPath } = useAuth();

    return (
        <nav className="bg-[var(--light-bg)] dark:bg-dark-bg transition-all duration-300 fixed top-0 right-0 left-0 z-30 border-b border-gray-200 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center space-x-2">
                            <div className="h-6 w-7 bg-blue-600 dark:bg-blue-500 rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">Agora</span>
                        </Link>
                        {user && (
                            <div className="ml-10 flex items-center space-x-4">
                                <Link
                                    href={getDashboardPath()}
                                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    Dashboard
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-4">
                        <ThemeToggle />
                        {!user && (
                            <div className="flex items-center space-x-2">
                                <Link href="/auth/login">
                                    <Button variant="ghost" size="sm">
                                        Login
                                    </Button>
                                </Link>
                                <Link href="/auth/login">
                                    <Button variant="primary" size="sm">
                                        Get Started
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
