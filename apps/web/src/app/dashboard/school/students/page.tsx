'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { motion } from 'framer-motion';
import { GraduationCap, Plus, Search, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useGetStudentsQuery, useGetMySchoolQuery } from '@/lib/store/api/schoolAdminApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import { StudentImportModal } from '@/components/modals/StudentImportModal';

// Avatar component for students
const StudentAvatar = ({ 
  profileImage, 
  firstName, 
  lastName 
}: { 
  profileImage?: string | null; 
  firstName?: string; 
  lastName?: string; 
}) => {
  const [imageError, setImageError] = useState(false);
  
  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0]?.toUpperCase() || '';
    const last = lastName?.[0]?.toUpperCase() || '';
    return first + last || '?';
  };
  
  if (profileImage && !imageError) {
    return (
      <div className="relative w-12 h-12 flex-shrink-0">
        <img
          src={profileImage}
          alt={`${firstName} ${lastName}`}
          className="w-12 h-12 rounded-full object-cover border-2 border-light-border dark:border-dark-border shadow-sm"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }
  
  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center text-white font-semibold text-sm border-2 border-light-border dark:border-dark-border shadow-sm flex-shrink-0">
      {getInitials(firstName, lastName)}
    </div>
  );
};

export default function StudentsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  const [showImportModal, setShowImportModal] = useState(false);

  // Get school ID and school type
  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;
  const { currentType } = useSchoolType();

  const { data: studentsResponse, isLoading, error } = useGetStudentsQuery(
    { schoolId: schoolId!, page, limit, schoolType: currentType || undefined },
    { skip: !schoolId }
  );
  const students = studentsResponse?.data?.items || [];
  const pagination = studentsResponse?.data;
  
  // Calculate pagination helpers
  const hasNext = pagination ? pagination.page < pagination.totalPages : false;
  const hasPrev = pagination ? pagination.page > 1 : false;

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const query = searchQuery.toLowerCase();
    return students.filter(
      (student) =>
        student.firstName.toLowerCase().includes(query) ||
        student.lastName.toLowerCase().includes(query) ||
        student.uid.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

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
                Students
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Manage all students in your school
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="primary" size="sm" onClick={() => router.push('/dashboard/school/admissions?new=true')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowImportModal(true)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                All Students ({filteredStudents.length})
              </CardTitle>
              <div className="w-[40%]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                  <Input
                    placeholder="Search by name, student ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4 animate-spin" />
                <p className="text-light-text-secondary dark:text-dark-text-secondary">
                  Loading students...
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                <p className="text-light-text-secondary dark:text-dark-text-secondary">
                  Error loading students. Please try again.
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                <p className="text-light-text-secondary dark:text-dark-text-secondary">
                  {searchQuery ? 'No students found matching your search.' : 'No students found. Click "Add Student" to get started.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-light-border dark:border-dark-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                        Student ID
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                        Class
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                        Date of Birth
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
                    {filteredStudents.map((student, index) => (
                      <motion.tr
                        key={student.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/school/students/${student.id}`)}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              <StudentAvatar
                                profileImage={student.profileImage}
                                firstName={student.firstName}
                                lastName={student.lastName}
                              />
                            </div>
                            {/* Name */}
                            <div>
                              <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                {student.firstName} {student.middleName ? `${student.middleName} ` : ''}{student.lastName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          {student.uid}
                        </td>
                        <td className="py-4 px-4 text-sm text-light-text-primary dark:text-dark-text-primary font-medium">
                          {student.enrollment?.classLevel || 'N/A'}
                        </td>
                        <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          {new Date(student.dateOfBirth).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              !student.profileLocked
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {student.profileLocked ? 'Locked' : 'Active'}
                          </span>
                        </td>
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center space-x-2">
                            <Link href={`/dashboard/school/students/${student.id}`}>
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
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-light-border dark:border-dark-border">
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} students
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!hasPrev}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!hasNext}
                        onClick={() => setPage(page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import Modal */}
        {schoolId && (
          <StudentImportModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            schoolId={schoolId}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

