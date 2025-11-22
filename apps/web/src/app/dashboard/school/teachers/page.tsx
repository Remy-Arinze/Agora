'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { motion } from 'framer-motion';
import { Users, Plus, Search, FileSpreadsheet, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useGetStaffListQuery } from '@/lib/store/api/schoolAdminApi';
import { useDebounce } from '@/hooks/useDebounce';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';

export default function StaffPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get school type and terminology
  const { currentType } = useSchoolType();
  const terminology = getTerminology(currentType);

  // Debounce search query to avoid too many API calls
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch staff list from API
  const {
    data: staffResponse,
    isLoading,
    error,
    refetch,
  } = useGetStaffListQuery({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearch || undefined,
    role: roleFilter !== 'All' ? roleFilter : undefined,
  });

  const staffList = staffResponse?.data;
  const staff = staffList?.items || [];
  const meta = staffList?.meta;
  const availableRoles = staffList?.availableRoles || [];

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, roleFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Format phone number for display
  const formatPhone = (phone: string) => {
    return phone;
  };

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                {terminology.staff}
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Manage all {terminology.staff.toLowerCase()} in your school
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/school/teachers/add">
                <Button variant="primary" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add {terminology.staffSingular}
                </Button>
              </Link>
              <Link href="/dashboard/school/import">
                <Button variant="ghost" size="sm">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <Alert variant="error" className="mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <div className="flex-1">
                <p className="font-semibold">Failed to load staff list</p>
                <p className="text-sm mt-1">
                  {error && 'data' in error
                    ? (error.data as any)?.message || 'An error occurred while loading staff data'
                    : 'An error occurred while loading staff data'}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                  <Input
                    placeholder="Search by name, email, or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-48">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-light-border dark:border-dark-border rounded-lg bg-light-bg dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="All">All Roles</option>
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                All {terminology.staff} {meta ? `(${meta.total})` : ''}
              </CardTitle>
              {/* Pagination at top right */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!meta.hasPrev || isLoading}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === meta.totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            disabled={isLoading}
                            className="min-w-[40px] disabled:opacity-50"
                          >
                            {page}
                          </Button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span
                            key={page}
                            className="px-2 text-light-text-secondary dark:text-dark-text-secondary"
                          >
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!meta.hasNext || isLoading}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="ml-3 text-light-text-secondary dark:text-dark-text-secondary">
                  Loading staff...
                </span>
              </div>
            ) : staff.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                <p className="text-light-text-secondary dark:text-dark-text-secondary">
                  {searchQuery || roleFilter !== 'All'
                    ? `No ${terminology.staff.toLowerCase()} found matching your criteria.`
                    : `No ${terminology.staff.toLowerCase()} found. Click "Add ${terminology.staffSingular}" to get started.`}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-light-border dark:border-dark-border">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                          Role
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                          Subject
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                          Contact
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((staffMember, index) => (
                        <motion.tr
                          key={staffMember.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/dashboard/school/teachers/${staffMember.id}`)}
                        >
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                {staffMember.firstName} {staffMember.lastName}
                              </p>
                              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                                {staffMember.email || 'No email'}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                staffMember.role === 'Principal'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                  : staffMember.role === 'Teacher'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}
                            >
                              {staffMember.role || 'N/A'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                            {staffMember.subject || 'N/A'}
                          </td>
                          <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                            {formatPhone(staffMember.phone)}
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                staffMember.status === 'active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                              }`}
                            >
                              {staffMember.status}
                            </span>
                          </td>
                          <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center space-x-2">
                              <Link href={`/dashboard/school/teachers/${staffMember.id}`}>
                                <Button variant="ghost" size="sm">
                                  View
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination info at bottom */}
                {meta && (
                  <div className="mt-6 pt-4 border-t border-light-border dark:border-dark-border text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Showing {meta.page === 1 ? 1 : (meta.page - 1) * meta.limit + 1} to{' '}
                    {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} {terminology.staff.toLowerCase()}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
