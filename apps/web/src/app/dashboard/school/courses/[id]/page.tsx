'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { motion } from 'framer-motion';
import { useClassGrades } from '@/hooks/useClassGrades';
import { useClassTeachers } from '@/hooks/useClassTeachers';
import { useClassResources } from '@/hooks/useClassResources';
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
  AlertCircle,
  Upload,
  Download,
  Trash2,
  Image as ImageIcon,
  File,
  Award,
  X,
} from 'lucide-react';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';
import {
  useGetMySchoolQuery,
  useGetClassByIdQuery,
  useAssignTeacherToClassMutation,
  useRemoveTeacherFromClassMutation,
  useGetStaffListQuery,
  useGetActiveSessionQuery,
  useGetClassArmsQuery,
  useGetClassLevelsQuery,
  useGetTimetableForClassArmQuery,
  useGetTimetableForClassQuery,
  useGetSessionsQuery,
  useGetSubjectsQuery,
  useGetCoursesQuery,
  useGetClassesQuery,
  useCreateTimetablePeriodMutation,
  useUpdateTimetablePeriodMutation,
  useDeleteTimetablePeriodMutation,
  useGetStudentsByClassQuery,
  useGetCurriculumForClassQuery,
  type Class,
  type ClassTeacher,
  type TimetablePeriod,
  type DayOfWeek,
  type PeriodType,
  type ClassResource,
  type StudentWithEnrollment,
  type GradeType,
} from '@/lib/store/api/schoolAdminApi';
import { TimetableBuilder } from '@/components/timetable/TimetableBuilder';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'teachers' | 'students' | 'curriculum' | 'grades' | 'timetable' | 'resources';

export default function ClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [resourceSearchQuery, setResourceSearchQuery] = useState('');
  const [showAssignStudents, setShowAssignStudents] = useState(false);
  const [showAssignTeacher, setShowAssignTeacher] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showUploadResource, setShowUploadResource] = useState(false);

  const { currentType } = useSchoolType();
  const terminology = getTerminology(currentType);
  const isPrimary = currentType === 'PRIMARY';
  const isSecondary = currentType === 'SECONDARY';

  // Get school data
  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;

  // Get active session
  const { data: activeSessionResponse } = useGetActiveSessionQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );
  const activeSession = activeSessionResponse?.data;

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

  // Get curriculum for class
  const { data: curriculumResponse } = useGetCurriculumForClassQuery(
    {
      schoolId: schoolId!,
      classId,
      subject: classData?.teachers?.[0]?.subject || undefined,
      academicYear: classData?.academicYear || activeSession?.session?.name,
      termId: activeSession?.term?.id || undefined,
    },
    { skip: !schoolId || !classId || activeTab !== 'curriculum' || !classData }
  );

  // Use custom hook for grades management
  const {
    grades,
    uniqueSequences,
    gradeTypeFilter,
    termFilter,
    sequenceFilter,
    setGradeTypeFilter,
    setTermFilter,
    setSequenceFilter,
  } = useClassGrades({
    schoolId,
    classId,
    activeTab,
  });

  // Use custom hook for teachers management
  const { teachers, allTeachers, isLoading: isLoadingTeachers } = useClassTeachers({
    schoolId,
    isPrimary,
    showAssignTeacher,
    classData,
    currentType,
  });

  // Mutations
  const [assignTeacher, { isLoading: isAssigningTeacher }] = useAssignTeacherToClassMutation();
  const [removeTeacher, { isLoading: isRemovingTeacher }] = useRemoveTeacherFromClassMutation();

  const handleAssignTeacher = async () => {
    if (!schoolId || !classId || !selectedTeacherId) {
      toast.error('Please select a teacher');
      return;
    }

    // Subject is not required for form teachers

    try {
      await assignTeacher({
        schoolId,
        classId,
        assignment: {
          teacherId: selectedTeacherId,
          subject: isPrimary ? undefined : (selectedSubject || undefined),
          // For primary schools: isPrimary indicates the main class teacher
          // For secondary schools: isPrimary: true indicates form teacher (no subject required)
          isPrimary: isPrimary ? true : (isSecondary ? true : undefined),
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

  // Get class resources
  // Use custom hook for resources management
  const {
    resources,
    isUploading,
    isDeleting,
    selectedFile,
    resourceDescription,
    setSelectedFile,
    setResourceDescription,
    handleUpload,
    handleDelete: handleDeleteResource,
    refetchResources,
  } = useClassResources({
    schoolId,
    classId,
    activeTab,
  });

  const handleUploadResource = async () => {
    await handleUpload();
    setShowUploadResource(false);
  };

  const handleDownloadResource = (resource: ClassResource) => {
    if (!schoolId || !classId) return;

    const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/schools/${schoolId}/classes/${classId}/resources/${resource.id}/download`;
    
    // Get token from localStorage
    const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('accessToken')) : null;
    
    fetch(downloadUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resource.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch((error) => {
        toast.error('Failed to download resource');
        console.error('Download error:', error);
      });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'IMAGE':
        return <ImageIcon className="h-5 w-5" />;
      case 'PDF':
        return <FileText className="h-5 w-5" />;
      case 'DOCX':
        return <File className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'teachers', label: terminology.staff, icon: <Users className="h-4 w-4" /> },
    { id: 'students', label: 'Students', icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'curriculum', label: 'Curriculum', icon: <FileText className="h-4 w-4" /> },
    { id: 'grades', label: 'Grades', icon: <Award className="h-4 w-4" /> },
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
              <p className="text-light-text-secondary dark:text-dark-text-secondary mb-1">
                {classData.classLevel || classData.name} • Academic Year {classData.academicYear}
              </p>
              {activeSession?.session && (
                <div className="flex items-center gap-2 mt-2">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Active: {activeSession.session.name}
                    {activeSession.term && ` - ${activeSession.term.name}`}
                  </span>
                </div>
              )}
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
                    {activeSession?.session && (
                      <div>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          Active Session
                        </p>
                        <p className="font-semibold text-blue-600 dark:text-blue-400">
                          {activeSession.session.name}
                          {activeSession.term && ` - ${activeSession.term.name}`}
                        </p>
                      </div>
                    )}
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
                      {isPrimary ? 'Assign Teacher' : currentType === 'SECONDARY' ? 'Assign Form Teacher' : 'Add Teacher'}
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
                        {isPrimary ? 'Assign Teacher' : currentType === 'SECONDARY' ? 'Assign Form Teacher' : 'Add Teacher'}
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
          {activeTab === 'students' && <ClassStudentsTab classData={classData} schoolId={schoolId} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}

          {/* Curriculum Tab */}
          {activeTab === 'curriculum' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                    Curriculum Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {curriculumResponse?.data ? (
                    <div className="space-y-6">
                      {curriculumResponse.data.items.map((item, index) => (
                        <div
                          key={item.id || index}
                          className="pb-6 border-b border-light-border dark:border-dark-border last:border-0 last:pb-0"
                        >
                          <div className="flex items-start gap-4 mb-4">
                            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <span className="text-blue-600 dark:text-blue-400 font-bold text-sm text-center leading-tight">
                                Week {item.week}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                                {item.topic}
                              </h3>
                              {item.objectives && item.objectives.length > 0 && (
                                <div className="space-y-2 mb-3">
                                  <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                                    Learning Objectives:
                                  </p>
                                  <ul className="list-disc list-inside space-y-1 ml-2">
                                    {item.objectives.map((objective, objIndex) => (
                                      <li
                                        key={objIndex}
                                        className="text-sm text-light-text-secondary dark:text-dark-text-secondary"
                                      >
                                        {objective}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {item.resources && item.resources.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                                    Resources:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {item.resources.map((resource, resIndex) => (
                                      <span
                                        key={resIndex}
                                        className="px-3 py-1 bg-light-bg dark:bg-dark-surface rounded-md text-xs text-light-text-secondary dark:text-dark-text-secondary"
                                      >
                                        {resource}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                        No curriculum created yet.
                      </p>
                      <p className="text-sm text-light-text-muted dark:text-dark-text-muted mb-4">
                        Teachers can create a curriculum with weekly topics, objectives, and resources.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Grades Tab */}
          {activeTab === 'grades' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                      Grades
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {/* Filters */}
                      <div className="flex items-center gap-2">
                        <select
                          value={gradeTypeFilter}
                          onChange={(e) => setGradeTypeFilter(e.target.value as GradeType | '')}
                          className="text-xs px-2 py-1.5 border border-[var(--light-border)] dark:border-dark-border rounded-md bg-[var(--light-bg)] dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
                          style={{ width: '100px' }}
                        >
                          <option value="">All Types</option>
                          <option value="CA">CA</option>
                          <option value="ASSIGNMENT">Assignment</option>
                          <option value="EXAM">Exam</option>
                        </select>
                        <select
                          value={termFilter}
                          onChange={(e) => setTermFilter(e.target.value)}
                          className="text-xs px-2 py-1.5 border border-[var(--light-border)] dark:border-dark-border rounded-md bg-[var(--light-bg)] dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
                          style={{ width: '100px' }}
                        >
                          <option value="">All Terms</option>
                          {activeSession?.session?.terms?.map((term: any) => (
                            <option key={term.id} value={term.id}>
                              {term.name}
                            </option>
                          ))}
                        </select>
                        {uniqueSequences.length > 0 && (
                          <select
                            value={sequenceFilter}
                            onChange={(e) => setSequenceFilter(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="text-xs px-2 py-1.5 border border-[var(--light-border)] dark:border-dark-border rounded-md bg-[var(--light-bg)] dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
                            style={{ width: '80px' }}
                          >
                            <option value="">All Seq</option>
                            {uniqueSequences.map((seq) => (
                              <option key={seq} value={seq}>
                                {seq}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Grades Table */}
                    {grades.length === 0 ? (
                      <div className="text-center py-12">
                        <Award className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                        <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                          No grades found.
                        </p>
                        <p className="text-sm text-light-text-muted dark:text-dark-text-muted">
                          Grades will appear here once teachers enter them for students in this class.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-light-surface dark:bg-dark-surface">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase">
                                Student
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase">
                                Assessment
                                <span className="block text-[10px] font-normal normal-case text-light-text-muted dark:text-dark-text-muted">
                                  (Sequence)
                                </span>
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase">
                                Type
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase">
                                Subject
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase">
                                Score
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase">
                                Percentage
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-light-border dark:divide-dark-border">
                            {grades.map((grade: any) => {
                              const percentage = grade.maxScore > 0
                                ? ((grade.score / grade.maxScore) * 100).toFixed(1)
                                : '0.0';
                              const studentName = grade.student
                                ? `${grade.student.firstName} ${grade.student.lastName}`
                                : 'Unknown';

                              return (
                                <tr key={grade.id} className="hover:bg-light-surface dark:hover:bg-[var(--dark-hover)]">
                                  <td className="px-4 py-3">
                                    <div>
                                      <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                                        {studentName}
                                      </p>
                                      {grade.student?.uid && (
                                        <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                                          {grade.student.uid}
                                        </p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div>
                                      <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                                        {grade.assessmentName || '-'}
                                      </p>
                                      {grade.sequence !== null && grade.sequence !== undefined && (
                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-0.5">
                                          Sequence: {grade.sequence}
                                        </p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                      grade.gradeType === 'CA'
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                                        : grade.gradeType === 'ASSIGNMENT'
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
                                    }`}>
                                      {grade.gradeType}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                      {grade.subject || '-'}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                      {grade.assessmentDate
                                        ? new Date(grade.assessmentDate).toLocaleDateString()
                                        : '-'}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                                      {grade.score} / {grade.maxScore}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                                      {percentage}%
                                    </p>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Timetable Tab */}
          {activeTab === 'timetable' && <ClassTimetableTab classData={classData} schoolId={schoolId} currentType={currentType} />}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-xl">Resources ({resources.length})</CardTitle>
                  <div className="flex items-center gap-3 flex-1 max-w-md">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
                      <Input
                        type="text"
                        placeholder="Search resources..."
                        value={resourceSearchQuery}
                        onChange={(e) => setResourceSearchQuery(e.target.value)}
                        className="pl-10 pr-10"
                      />
                      {resourceSearchQuery && (
                        <button
                          onClick={() => setResourceSearchQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Button variant="primary" size="sm" onClick={() => setShowUploadResource(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Resource
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Filter resources based on search query
                  const filteredResources = resources.filter((resource: ClassResource) => {
                    if (!resourceSearchQuery.trim()) return true;
                    const query = resourceSearchQuery.toLowerCase();
                    return (
                      resource.name.toLowerCase().includes(query) ||
                      resource.description?.toLowerCase().includes(query) ||
                      resource.fileType.toLowerCase().includes(query) ||
                      resource.fileName.toLowerCase().includes(query)
                    );
                  });

                  if (filteredResources.length === 0 && resources.length > 0) {
                    return (
                      <div className="py-12 text-center">
                        <Search className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                        <p className="text-light-text-secondary dark:text-dark-text-secondary mb-2">
                          No resources found matching "{resourceSearchQuery}"
                        </p>
                        <Button variant="ghost" size="sm" onClick={() => setResourceSearchQuery('')}>
                          Clear search
                        </Button>
                      </div>
                    );
                  }

                  if (filteredResources.length === 0) {
                    return (
                      <div className="py-12 text-center">
                        <FileText className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                        <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                          No resources uploaded yet.
                        </p>
                        <Button variant="primary" onClick={() => setShowUploadResource(true)}>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Resource
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {filteredResources.map((resource: ClassResource) => (
                        <motion.div
                          key={resource.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 border border-light-border dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                                {getFileIcon(resource.fileType)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary truncate mb-1">
                                  {resource.name}
                                </h4>
                                {resource.description && (
                                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary truncate mb-1">
                                    {resource.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-light-text-muted dark:text-dark-text-muted">
                                  <span>{formatFileSize(resource.fileSize)}</span>
                                  <span>•</span>
                                  <span>{resource.fileType}</span>
                                  <span>•</span>
                                  <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                                  {resource.uploadedByName && (
                                    <>
                                      <span>•</span>
                                      <span className="text-light-text-secondary dark:text-dark-text-secondary">
                                        By {resource.uploadedByName}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadResource(resource)}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteResource(resource.id)}
                                disabled={isDeleting}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  );
                })()}
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
                    {isPrimary ? 'Assign Teacher' : currentType === 'SECONDARY' ? 'Assign Form Teacher' : 'Add Teacher'} to {classData.name}
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
                    {isPrimary && teachers.length === 0 && allTeachers.length > 0 && (
                      <div className="mb-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          <AlertCircle className="h-4 w-4 inline mr-2" />
                          All available teachers are already assigned to other classes. Please remove a teacher from another class first.
                        </p>
                      </div>
                    )}
                    {isLoadingTeachers ? (
                      <div className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-light-card dark:bg-dark-surface text-light-text-secondary dark:text-dark-text-secondary">
                        Loading teachers...
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto border-2 border-gray-300 dark:border-gray-600 rounded-lg p-2">
                        {teachers.length === 0 && !isLoadingTeachers ? (
                          <div className="w-full px-3 py-2 text-light-text-secondary dark:text-dark-text-secondary text-center">
                            No teachers available
                          </div>
                        ) : (
                          <>
                            {!selectedTeacherId && (
                              <p className="text-xs text-light-text-muted dark:text-dark-text-muted px-2 py-1">
                                Select a teacher...
                              </p>
                            )}
                            {teachers.map((teacher) => {
                            const initials = `${teacher.firstName?.[0] || ''}${teacher.lastName?.[0] || ''}`.toUpperCase();
                            const isSelected = selectedTeacherId === teacher.id;
                            return (
                              <button
                                key={teacher.id}
                                type="button"
                                onClick={() => setSelectedTeacherId(teacher.id)}
                                disabled={isPrimary && teachers.length === 0}
                                className={`w-full flex items-center gap-3 px-3 py-2 border-2 rounded-lg transition-colors ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-300 dark:border-gray-600 bg-light-card dark:bg-dark-surface hover:border-blue-300 dark:hover:border-blue-700'
                                } ${isPrimary && teachers.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                  {teacher.profileImage ? (
                                    <img
                                      src={teacher.profileImage}
                                      alt={`${teacher.firstName} ${teacher.lastName}`}
                                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                                      onError={(e) => {
                                        // Fallback to initials if image fails to load
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          const fallback = parent.querySelector('.avatar-fallback') as HTMLElement;
                                          if (fallback) fallback.style.display = 'flex';
                                        }
                                      }}
                                    />
                                  ) : null}
                                  <div
                                    className={`avatar-fallback w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white ${
                                      teacher.profileImage ? 'hidden' : 'flex'
                                    } ${
                                      isSelected
                                        ? 'bg-blue-500'
                                        : 'bg-gray-400 dark:bg-gray-600'
                                    }`}
                                  >
                                    {initials || '?'}
                                  </div>
                                </div>
                                {/* Teacher Info */}
                                <div className="flex-1 text-left">
                                  <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                    {teacher.firstName} {teacher.lastName}
                                  </p>
                                  {teacher.subject && (
                                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                      {teacher.subject}
                                    </p>
                                  )}
                                </div>
                                {/* Selection Indicator */}
                                {isSelected && (
                                  <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                )}
                              </button>
                            );
                          })}
                          </>
                        )}
                      </div>
                    )}
                    {isPrimary && allTeachers.length > teachers.length && (
                      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                        {allTeachers.length - teachers.length} teacher(s) are already assigned to other classes
                      </p>
                    )}
                  </div>

                  {currentType === 'TERTIARY' && (
                    <div>
                      <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                        Subject
                      </label>
                      <Input
                        placeholder="e.g., Course Module/Topic"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full"
                      />
                      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                        Optional: Course module or topic the teacher handles
                      </p>
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
                    disabled={isAssigningTeacher || !selectedTeacherId}
                  >
                    {isAssigningTeacher ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        {isPrimary ? 'Assign Teacher' : currentType === 'SECONDARY' ? 'Assign Form Teacher' : 'Add Teacher'}
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

        {/* Upload Resource Modal */}
        {showUploadResource && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-light-card dark:bg-dark-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                    Upload Resource
                  </h2>
                  <button
                    onClick={() => {
                      setShowUploadResource(false);
                      setSelectedFile(null);
                      setResourceDescription('');
                    }}
                    className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                      Select File <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-light-border dark:border-dark-border rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validate file size (50MB max)
                            if (file.size > 50 * 1024 * 1024) {
                              toast.error('File size exceeds 50MB limit');
                              return;
                            }
                            
                            // Validate file type - only documents and spreadsheets, no images
                            const allowedMimeTypes = [
                              'application/pdf',
                              'application/msword',
                              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                              'application/vnd.ms-excel',
                              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                              'application/vnd.ms-powerpoint',
                              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                              'text/plain',
                              'text/csv',
                            ];
                            
                            if (!allowedMimeTypes.includes(file.type)) {
                              toast.error(`File type ${file.type} is not allowed. Only documents and spreadsheets are permitted (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV). Images are not allowed.`);
                              return;
                            }
                            
                            setSelectedFile(file);
                          }
                        }}
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <Upload className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted mb-2" />
                        <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                        </span>
                        <span className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                          PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV (Max 50MB)
                        </span>
                      </label>
                    </div>
                    {selectedFile && (
                      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">
                        Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                      Description (Optional)
                    </label>
                    <Input
                      placeholder="Add a description for this resource..."
                      value={resourceDescription}
                      onChange={(e) => setResourceDescription(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowUploadResource(false);
                      setSelectedFile(null);
                      setResourceDescription('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleUploadResource}
                    disabled={isUploading || !selectedFile}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Resource
                      </>
                    )}
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

// Students Tab Component
function ClassStudentsTab({
  classData,
  schoolId,
  searchQuery,
  setSearchQuery,
}: {
  classData?: Class;
  schoolId?: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  // Get students enrolled in this class
  const { data: studentsResponse, isLoading: isLoadingStudents } = useGetStudentsByClassQuery(
    { schoolId: schoolId!, classLevel: classData?.name || '' },
    { skip: !schoolId || !classData?.name }
  );

  const students = studentsResponse?.data || [];
  
  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const query = searchQuery.toLowerCase();
    return students.filter(
      (student: StudentWithEnrollment) =>
        student.firstName.toLowerCase().includes(query) ||
        student.lastName.toLowerCase().includes(query) ||
        student.uid.toLowerCase().includes(query) ||
        (student.middleName?.toLowerCase().includes(query) ?? false)
    );
  }, [students, searchQuery]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">
            Students ({filteredStudents.length})
          </CardTitle>
          <Button variant="primary" size="sm" onClick={() => window.location.href = '/dashboard/school/admissions?new=true'}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingStudents ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4 animate-spin" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Loading students...
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-12 text-center">
            <GraduationCap className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
              {searchQuery ? 'No students found matching your search.' : 'No students enrolled in this class yet.'}
            </p>
            <Button variant="primary" onClick={() => window.location.href = '/dashboard/school/admissions?new=true'}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                <Input
                  placeholder="Search students by name or student ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
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
                  {filteredStudents.map((student: StudentWithEnrollment, index: number) => (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                            {student.firstName} {student.middleName ? `${student.middleName} ` : ''}{student.lastName}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        {student.uid}
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
                      <td className="py-4 px-4">
                        <Link href={`/dashboard/school/students/${student.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Timetable Tab Component
function ClassTimetableTab({ 
  classData, 
  schoolId, 
  currentType 
}: { 
  classData?: Class; 
  schoolId?: string; 
  currentType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
}) {
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  // Get active session
  const { data: activeSessionResponse } = useGetActiveSessionQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );
  const activeSession = activeSessionResponse?.data;

  // Get all sessions
  const { data: sessionsResponse } = useGetSessionsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );

  // Get timetable for this class
  const { data: timetableResponse, isLoading: isLoadingTimetable, refetch: refetchTimetable } = useGetTimetableForClassQuery(
    {
      schoolId: schoolId!,
      classId: classData?.id || '',
      termId: selectedTermId,
    },
    { skip: !schoolId || !classData?.id || !selectedTermId }
  );

  // Get subjects and courses
  const { data: subjectsResponse } = useGetSubjectsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );

  const { data: coursesResponse } = useGetCoursesQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId || currentType !== 'TERTIARY' }
  );

  // Note: These mutations are not used in read-only mode, but kept for type compatibility
  const [createPeriod, { isLoading: isCreating }] = useCreateTimetablePeriodMutation();
  const [updatePeriod, { isLoading: isUpdating }] = useUpdateTimetablePeriodMutation();
  const [deletePeriod, { isLoading: isDeleting }] = useDeleteTimetablePeriodMutation();

  const subjects = subjectsResponse?.data || [];
  const courses = coursesResponse?.data || [];
  const timetable = timetableResponse?.data || [];

  // Get all terms from sessions
  const allTerms = useMemo(() => {
    if (!sessionsResponse?.data) return [];
    return sessionsResponse.data.flatMap((session) =>
      session.terms.map((term) => ({
        ...term,
        sessionName: session.name,
      }))
    );
  }, [sessionsResponse]);

  // Auto-select active term if available
  useEffect(() => {
    if (activeSession?.term?.id && !selectedTermId) {
      setSelectedTermId(activeSession.term.id);
    } else if (allTerms.length > 0 && !selectedTermId) {
      setSelectedTermId(allTerms[0].id);
    }
  }, [activeSession, allTerms, selectedTermId]);

  const handlePeriodUpdate = async (
    slot: { dayOfWeek: DayOfWeek; period: { startTime: string; endTime: string; type: string }; periodData?: TimetablePeriod },
    subjectId?: string,
    courseId?: string
  ) => {
    if (!schoolId || !classData?.id || !selectedTermId) return;

    try {
      if (slot.periodData) {
        await updatePeriod({
          schoolId,
          periodId: slot.periodData.id,
          data: {
            subjectId: currentType !== 'TERTIARY' ? subjectId : undefined,
            courseId: currentType === 'TERTIARY' ? courseId : undefined,
            teacherId: slot.periodData.teacherId || undefined,
            roomId: slot.periodData.roomId || undefined,
            startTime: slot.periodData.startTime,
            endTime: slot.periodData.endTime,
          },
        }).unwrap();
        toast.success('Period updated successfully');
      } else {
        await createPeriod({
          schoolId,
          data: {
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.period.startTime,
            endTime: slot.period.endTime,
            type: slot.period.type as PeriodType,
            subjectId: currentType !== 'TERTIARY' ? subjectId : undefined,
            courseId: currentType === 'TERTIARY' ? courseId : undefined,
            classId: classData.id,
            termId: selectedTermId,
          },
        }).unwrap();
        toast.success('Period created successfully');
      }
      refetchTimetable();
    } catch (error: any) {
      if (error?.status === 409) {
        toast.error(error?.data?.message || 'Conflict detected: Teacher or room already booked');
      } else {
        toast.error(error?.data?.message || 'Failed to save period');
      }
    }
  };

  const handlePeriodDelete = async (periodId: string) => {
    if (!schoolId) return;

    try {
      await deletePeriod({
        schoolId,
        periodId,
      }).unwrap();
      toast.success('Period deleted successfully');
      refetchTimetable();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete period');
    }
  };

  if (!classData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Class data not available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timetable Builder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Timetable for {classData.name}</CardTitle>
            <div className="w-[25%]">
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
              >
                <option value="">Select a term...</option>
                {allTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.sessionName} - {term.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedTermId ? (
            isLoadingTimetable ? (
              <div className="py-12 text-center">
                <Loader2 className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4 animate-spin" />
                <p className="text-light-text-secondary dark:text-dark-text-secondary">
                  Loading timetable...
                </p>
              </div>
            ) : timetable.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                <p className="text-light-text-secondary dark:text-dark-text-secondary">
                  No timetable periods found for {classData.name}. Create a timetable in the Timetables page.
                </p>
              </div>
            ) : (
              <TimetableBuilder
                schoolType={currentType}
                subjects={subjects.map((s) => ({ id: s.id, name: s.name, code: s.code, type: 'subject' as const }))}
                courses={courses.map((c) => ({ id: c.id, name: c.name, code: c.code, type: 'course' as const }))}
                timetable={timetable}
                classArmId={''} // Not used when classId is provided
                termId={selectedTermId}
                onPeriodUpdate={handlePeriodUpdate}
                onPeriodDelete={handlePeriodDelete}
                isLoading={isCreating || isUpdating || isDeleting}
                readOnly={true}
              />
            )
          ) : (
            <div className="py-12 text-center">
              <Clock className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Please select a term to view the timetable.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
