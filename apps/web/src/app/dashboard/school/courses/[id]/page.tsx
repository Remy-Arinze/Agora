'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  BookOpen,
  Calendar,
  FileText,
  Clock,
  UserPlus,
  GraduationCap,
  Mail,
  Phone,
  Search,
  CheckCircle,
  XCircle,
  Plus,
  Loader2,
} from 'lucide-react';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';
import {
  useGetMySchoolQuery,
  useGetClassByIdQuery,
  useAssignTeacherToClassMutation,
  useRemoveTeacherFromClassMutation,
  useGetStaffListQuery,
  type Class,
  type ClassTeacher,
} from '@/lib/store/api/schoolAdminApi';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'teachers' | 'students' | 'curriculum' | 'timetable' | 'resources';

export default function ClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignStudents, setShowAssignStudents] = useState(false);
  const [showAssignTeacher, setShowAssignTeacher] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const { currentType } = useSchoolType();
  const terminology = getTerminology(currentType);
  const isPrimary = currentType === 'PRIMARY';
  const isSecondary = currentType === 'SECONDARY';

  // Get school data
  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;

  // Get class data
  const {
    data: classResponse,
    isLoading: isLoadingClass,
    error: classError,
  } = useGetClassByIdQuery(
    { schoolId: schoolId!, classId },
    { skip: !schoolId || !classId }
  );

  const classData = classResponse?.data;

  // Get staff list for teacher assignment
  const { data: staffResponse } = useGetStaffListQuery(
    { limit: 100, role: 'teacher' },
    { skip: !showAssignTeacher }
  );

  const teachers = staffResponse?.data?.items || [];

  // Mutations
  const [assignTeacher, { isLoading: isAssigningTeacher }] = useAssignTeacherToClassMutation();
  const [removeTeacher, { isLoading: isRemovingTeacher }] = useRemoveTeacherFromClassMutation();

  const handleAssignTeacher = async () => {
    if (!schoolId || !classId || !selectedTeacherId) {
      toast.error('Please select a teacher');
      return;
    }

    if (isSecondary && !selectedSubject) {
      toast.error('Please enter a subject for secondary school classes');
      return;
    }

    try {
      await assignTeacher({
        schoolId,
        classId,
        assignment: {
          teacherId: selectedTeacherId,
          subject: selectedSubject || (isPrimary ? 'Class Teacher' : undefined),
          isPrimary: isPrimary ? true : undefined,
        },
      }).unwrap();

      toast.success('Teacher assigned successfully');
      setShowAssignTeacher(false);
      setSelectedTeacherId('');
      setSelectedSubject('');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to assign teacher');
    }
  };

  const handleRemoveTeacher = async (teacherId: string, subject?: string) => {
    if (!schoolId || !classId) return;

    if (!confirm('Are you sure you want to remove this teacher?')) return;

    try {
      await removeTeacher({
        schoolId,
        classId,
        teacherId,
        subject,
      }).unwrap();

      toast.success('Teacher removed successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to remove teacher');
    }
  };

  // Check if class has teachers
  const hasTeachers = classData?.teachers && classData.teachers.length > 0;
  const showAssignTeacherButton =
    isPrimary ? !hasTeachers : true; // Primary: only if no teachers, Secondary: always

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'teachers', label: terminology.staff, icon: <Users className="h-4 w-4" /> },
    { id: 'students', label: 'Students', icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'curriculum', label: 'Curriculum', icon: <FileText className="h-4 w-4" /> },
    { id: 'timetable', label: 'Timetable', icon: <Clock className="h-4 w-4" /> },
    { id: 'resources', label: 'Resources', icon: <FileText className="h-4 w-4" /> },
  ];

  if (isLoadingClass) {
    return (
      <ProtectedRoute roles={['SCHOOL_ADMIN']}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </ProtectedRoute>
    );
  }

  if (classError || !classData) {
    return (
      <ProtectedRoute roles={['SCHOOL_ADMIN']}>
        <div className="w-full">
          <Alert variant="error" className="mb-4">
            {classError ? 'Failed to load class data' : 'Class not found'}
          </Alert>
          <Link href="/dashboard/school/courses">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {terminology.courses}
            </Button>
          </Link>
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
          <Link href="/dashboard/school/courses">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {terminology.courses}
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                {classData.name}
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                {classData.classLevel || classData.name} • Academic Year {classData.academicYear}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Card className="mb-6">
          <CardContent className="pt-0">
            <div className="flex space-x-1 border-b border-light-border dark:border-dark-border overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Class Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Class Name
                      </p>
                      <p className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                        {classData.name}
                      </p>
                    </div>
                    {classData.classLevel && (
                      <div>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          Level
                        </p>
                        <p className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                          {classData.classLevel}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Academic Year
                      </p>
                      <p className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                        {classData.academicYear}
                      </p>
                    </div>
                    {classData.code && (
                      <div>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          Course Code
                        </p>
                        <p className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                          {classData.code}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        {terminology.staff}
                      </span>
                      <span className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                        {classData.teachers?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Students
                      </span>
                      <span className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                        {classData.studentsCount || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Teachers Tab */}
          {activeTab === 'teachers' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    {terminology.staff} ({classData.teachers?.length || 0})
                  </CardTitle>
                  {showAssignTeacherButton && (
                    <Button variant="primary" size="sm" onClick={() => setShowAssignTeacher(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {isPrimary ? 'Assign Teacher' : 'Add Teacher'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!hasTeachers ? (
                  <div className="py-12 text-center">
                    <Users className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                    <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                      No {terminology.staff.toLowerCase()} assigned to this class yet.
                    </p>
                    {showAssignTeacherButton && (
                      <Button variant="primary" onClick={() => setShowAssignTeacher(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        {isPrimary ? 'Assign Teacher' : 'Add Teacher'}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classData.teachers.map((teacher: ClassTeacher) => (
                      <motion.div
                        key={teacher.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 border border-light-border dark:border-dark-border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                              {teacher.firstName} {teacher.lastName}
                            </h4>
                            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                              {teacher.isPrimary ? 'Class Teacher' : 'Subject Teacher'}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {teacher.subject && (
                            <div className="flex items-center gap-2 text-sm">
                              <BookOpen className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
                              <span className="text-light-text-secondary dark:text-dark-text-secondary">
                                {teacher.subject}
                              </span>
                            </div>
                          )}
                          {teacher.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
                              <span className="text-light-text-secondary dark:text-dark-text-secondary">
                                {teacher.email}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTeacher(teacher.teacherId, teacher.subject || undefined)}
                            disabled={isRemovingTeacher}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Remove
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                    {showAssignTeacherButton && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 border-2 border-dashed border-light-border dark:border-dark-border rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer flex items-center justify-center min-h-[200px]"
                        onClick={() => setShowAssignTeacher(true)}
                      >
                        <div className="text-center">
                          <UserPlus className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted mx-auto mb-2" />
                          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                            Add {terminology.staff.slice(0, -1)}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    Students ({classData.studentsCount || 0})
                  </CardTitle>
                  <Button variant="primary" size="sm" onClick={() => setShowAssignStudents(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign Students
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!classData.studentsCount || classData.studentsCount === 0 ? (
                  <div className="py-12 text-center">
                    <GraduationCap className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                    <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                      No students assigned to this class yet.
                    </p>
                    <Button variant="primary" onClick={() => setShowAssignStudents(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign Students
                    </Button>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                      <Input
                        placeholder="Search students by name, admission number, or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Curriculum Tab */}
          {activeTab === 'curriculum' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Curriculum</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="py-12 text-center">
                  <FileText className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    Curriculum information will be available here.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timetable Tab */}
          {activeTab === 'timetable' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Timetable</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="py-12 text-center">
                  <Clock className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    Timetable information will be available here.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Resources</CardTitle>
                  <Button variant="primary" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Resource
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="py-12 text-center">
                  <FileText className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    No resources uploaded yet.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Assign Teacher Modal */}
        {showAssignTeacher && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-light-card dark:bg-dark-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                    {isPrimary ? 'Assign Teacher' : 'Add Teacher'} to {classData.name}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAssignTeacher(false);
                      setSelectedTeacherId('');
                      setSelectedSubject('');
                    }}
                    className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                      Select Teacher
                    </label>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-lg bg-light-card dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
                    >
                      <option value="">Select a teacher...</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.firstName} {teacher.lastName}
                          {teacher.subject && ` - ${teacher.subject}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isSecondary && (
                    <div>
                      <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="e.g., Mathematics, English, Physics"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full"
                      />
                      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                        Required for secondary school classes
                      </p>
                    </div>
                  )}

                  {isPrimary && (
                    <div>
                      <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                        Subject (Optional)
                      </label>
                      <Input
                        placeholder="e.g., Class Teacher"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowAssignTeacher(false);
                      setSelectedTeacherId('');
                      setSelectedSubject('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleAssignTeacher}
                    disabled={isAssigningTeacher || !selectedTeacherId || (isSecondary && !selectedSubject)}
                  >
                    {isAssigningTeacher ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign Teacher
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Assign Students Modal */}
        {showAssignStudents && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-light-card dark:bg-dark-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                    Assign Students to {classData.name}
                  </h2>
                  <button
                    onClick={() => setShowAssignStudents(false)}
                    className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
                <div className="mb-4">
                  <Input
                    placeholder="Search students to assign..."
                    className="w-full"
                  />
                </div>
                <div className="py-12 text-center">
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    Student assignment functionality will be available here.
                  </p>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="ghost" onClick={() => setShowAssignStudents(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
