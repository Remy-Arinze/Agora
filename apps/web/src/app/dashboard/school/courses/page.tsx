'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Search, Users, GraduationCap, Calendar, Loader2 } from 'lucide-react';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';
import {
  useGetMySchoolQuery,
  useGetClassesQuery,
  useCreateClassMutation,
  useDeleteClassMutation,
  useGetActiveSessionQuery,
  type Class,
} from '@/lib/store/api/schoolAdminApi';
import toast from 'react-hot-toast';

export default function ClassesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddClass, setShowAddClass] = useState(false);
  const { currentType } = useSchoolType();
  const terminology = getTerminology(currentType);

  // Get school data
  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;

  // Get active session
  const { data: activeSessionResponse } = useGetActiveSessionQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );
  const activeSession = activeSessionResponse?.data;

  // Get classes filtered by current school type
  const {
    data: classesResponse,
    isLoading: isLoadingClasses,
    error: classesError,
    refetch: refetchClasses,
  } = useGetClassesQuery(
    { schoolId: schoolId!, type: currentType || undefined },
    { skip: !schoolId }
  );

  // Refetch classes when school type changes
  useEffect(() => {
    if (schoolId && currentType) {
      refetchClasses();
    }
  }, [currentType, schoolId, refetchClasses]);

  const classes = classesResponse?.data || [];

  // Mutations
  const [deleteClass, { isLoading: isDeletingClass }] = useDeleteClassMutation();

  const filteredClasses = useMemo(() => {
    if (!searchQuery) return classes;
    const query = searchQuery.toLowerCase();
    return classes.filter(
      (classItem: Class) =>
        classItem.name.toLowerCase().includes(query) ||
        classItem.classLevel?.toLowerCase().includes(query) ||
        classItem.teachers?.some((t) =>
          `${t.firstName} ${t.lastName}`.toLowerCase().includes(query)
        )
    );
  }, [classes, searchQuery]);

  const handleClassClick = (classId: string) => {
    router.push(`/dashboard/school/courses/${classId}`);
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!schoolId) return;
    
    if (!confirm(`Are you sure you want to delete ${className}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteClass({ schoolId, classId }).unwrap();
      toast.success('Class deleted successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete class');
    }
  };

  if (isLoadingClasses) {
    return (
      <ProtectedRoute roles={['SCHOOL_ADMIN']}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </ProtectedRoute>
    );
  }

  if (classesError) {
    return (
      <ProtectedRoute roles={['SCHOOL_ADMIN']}>
        <div className="w-full">
          <Alert variant="error" className="mb-4">
            Failed to load classes. Please try again.
          </Alert>
        </div>
      </ProtectedRoute>
    );
  }

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
                {terminology.courses}
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary mb-1">
                Manage all {terminology.courses.toLowerCase()} in your school
              </p>
              {activeSession?.session && (
                <div className="flex items-center gap-2 mt-2">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Active Session: {activeSession.session.name}
                    {activeSession.term && ` - ${activeSession.term.name}`}
                  </span>
                </div>
              )}
            </div>
            <Button variant="primary" onClick={() => setShowAddClass(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add {terminology.courseSingular}
            </Button>
          </div>
        </motion.div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
              <Input
                placeholder={`Search by ${terminology.courseSingular.toLowerCase()} name, level, or teacher...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Classes Grid */}
        {filteredClasses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                {searchQuery
                  ? `No ${terminology.courses.toLowerCase()} found matching your search.`
                  : `No ${terminology.courses.toLowerCase()} found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map((classItem: Class, index: number) => {
              const primaryTeacher = classItem.teachers?.find((t) => t.isPrimary);
              const teacherName = primaryTeacher
                ? `${primaryTeacher.firstName} ${primaryTeacher.lastName}`
                : classItem.teachers && classItem.teachers.length > 0
                ? `${classItem.teachers.length} ${terminology.staff.toLowerCase()}`
                : 'No teacher assigned';

              return (
                <motion.div
                  key={classItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
                    <CardContent
                      className="pt-6 flex-1 cursor-pointer"
                      onClick={() => handleClassClick(classItem.id)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                            {classItem.name}
                          </h3>
                          {classItem.classLevel && (
                            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                              {classItem.classLevel}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            classItem.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {classItem.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
                          <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                            {teacherName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
                          <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                            {classItem.studentsCount || 0} students
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
                          <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                            {classItem.academicYear}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                    <div className="px-6 pb-4 pt-0 border-t border-light-border dark:border-dark-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClass(classItem.id, classItem.name);
                        }}
                        disabled={isDeletingClass}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
