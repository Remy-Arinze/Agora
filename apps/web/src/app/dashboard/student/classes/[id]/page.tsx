'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Users, 
  FileText,
  ArrowLeft,
  Clock,
  User,
  Mail,
  Phone,
  Download,
  Loader2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { 
  useGetMyStudentClassesQuery,
  useGetMyStudentTimetableQuery,
  useGetActiveSessionQuery,
  useGetSessionsQuery,
} from '@/lib/store/api/schoolAdminApi';
import { TeacherTimetableGrid } from '@/components/timetable/TeacherTimetableGrid';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';

type TabType = 'overview' | 'teachers' | 'resources' | 'timetable';

export default function StudentClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  const { currentType } = useSchoolType();
  const terminology = getTerminology(currentType) || {
    courses: 'Classes',
    courseSingular: 'Class',
    staff: 'Teachers',
    staffSingular: 'Teacher',
    periods: 'Terms',
    periodSingular: 'Term',
    subjects: 'Subjects',
    subjectSingular: 'Subject',
  };

  // Get student's classes
  const { data: classesResponse, isLoading: isLoadingClasses } = useGetMyStudentClassesQuery();
  const classes = classesResponse?.data || [];
  const classData = useMemo(() => {
    return classes.find((c: any) => c.id === classId);
  }, [classes, classId]);

  // Get school ID from class data or first class
  const schoolId = classData?.enrollment?.school?.id || classes[0]?.enrollment?.school?.id;

  // Get active session
  const { data: activeSessionResponse } = useGetActiveSessionQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );
  const activeSession = activeSessionResponse?.data;

  // Get all sessions for term selector
  const { data: sessionsResponse } = useGetSessionsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );

  // Determine which term to use
  const currentTermId = selectedTermId || activeSession?.term?.id || '';

  // Get timetable for student
  const { data: timetableResponse, isLoading: isLoadingTimetable } = useGetMyStudentTimetableQuery(
    { termId: currentTermId },
    { skip: !currentTermId }
  );
  const timetable = timetableResponse?.data || [];

  // Extract all terms from sessions for selector - filtered by school type and deduplicated
  const allTerms = useMemo(() => {
    if (!sessionsResponse?.data) return [];
    
    // Filter sessions by current school type to avoid duplicates
    const filteredSessions = sessionsResponse.data.filter((session: any) => {
      if (!currentType) return !session.schoolType;
      return session.schoolType === currentType;
    });
    
    // Deduplicate sessions by name (keep first/latest)
    const uniqueSessionsMap = new Map<string, any>();
    filteredSessions.forEach((session: any) => {
      if (!uniqueSessionsMap.has(session.name)) {
        uniqueSessionsMap.set(session.name, session);
      }
    });
    
    const terms: Array<{ id: string; name: string; sessionName: string }> = [];
    Array.from(uniqueSessionsMap.values()).forEach((session: any) => {
      if (session.terms) {
        session.terms.forEach((term: any) => {
          terms.push({
            id: term.id,
            name: term.name,
            sessionName: session.name,
          });
        });
      }
    });
    
    return terms.sort((a, b) => {
      if (a.sessionName !== b.sessionName) {
        return b.sessionName.localeCompare(a.sessionName);
      }
      return b.name.localeCompare(a.name);
    });
  }, [sessionsResponse, currentType]);

  const isLoading = isLoadingClasses || isLoadingTimetable;

  const tabs = [
    {
      id: 'overview' as TabType,
      label: 'Overview',
      icon: <BookOpen className="h-4 w-4" />,
      available: true,
    },
    {
      id: 'teachers' as TabType,
      label: terminology.staff,
      icon: <Users className="h-4 w-4" />,
      available: true,
    },
    {
      id: 'resources' as TabType,
      label: 'Resources',
      icon: <FileText className="h-4 w-4" />,
      available: true,
    },
    {
      id: 'timetable' as TabType,
      label: 'Timetable',
      icon: <Clock className="h-4 w-4" />,
      available: true,
    },
  ];

  if (isLoading) {
    return (
      <ProtectedRoute roles={['STUDENT']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4 animate-spin" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Loading {terminology.courseSingular.toLowerCase()}...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!classData) {
    return (
      <ProtectedRoute roles={['STUDENT']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
              {terminology.courseSingular} not found
            </p>
            <Link href="/dashboard/student/classes">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {terminology.courses}
              </Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute roles={['STUDENT']}>
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/dashboard/student/classes">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {terminology.courses}
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                {classData.name}
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                {classData.code && `${classData.code} • `}
                {classData.classLevel && `${classData.classLevel} • `}
                {classData.academicYear}
                {activeSession?.term && ` • ${activeSession.term.name}`}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6 border-b border-light-border dark:border-dark-border">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                    {terminology.courseSingular} Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {classData.description && (
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                          Description
                        </p>
                        <p className="text-light-text-primary dark:text-dark-text-primary">
                          {classData.description}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                          Academic Year
                        </p>
                        <p className="text-light-text-primary dark:text-dark-text-primary">
                          {classData.academicYear}
                        </p>
                      </div>
                      {classData.type && (
                        <div>
                          <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                            Type
                          </p>
                          <p className="text-light-text-primary dark:text-dark-text-primary capitalize">
                            {classData.type.toLowerCase()}
                          </p>
                        </div>
                      )}
                    </div>
                    {classData.enrollment && (
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                          Enrollment Date
                        </p>
                        <p className="text-light-text-primary dark:text-dark-text-primary">
                          {new Date(classData.enrollment.enrollmentDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Teachers Tab */}
          {activeTab === 'teachers' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                    {terminology.staff}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {classData.teachers && classData.teachers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {classData.teachers.map((teacher: any) => (
                        <Card key={teacher.id} className="border border-light-border dark:border-dark-border">
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-1">
                                  {teacher.firstName} {teacher.lastName}
                                  {teacher.isPrimary && (
                                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Primary)</span>
                                  )}
                                </h3>
                                {teacher.subject && (
                                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
                                    {teacher.subject}
                                  </p>
                                )}
                                <div className="space-y-1">
                                  {teacher.email && (
                                    <div className="flex items-center gap-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                      <Mail className="h-4 w-4" />
                                      <a href={`mailto:${teacher.email}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                                        {teacher.email}
                                      </a>
                                    </div>
                                  )}
                                  {teacher.phone && (
                                    <div className="flex items-center gap-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                      <Phone className="h-4 w-4" />
                                      <a href={`tel:${teacher.phone}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                                        {teacher.phone}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary">
                        No {terminology.staffSingular.toLowerCase()} assigned to this {terminology.courseSingular.toLowerCase()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                    Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {classData.resources && classData.resources.length > 0 ? (
                    <div className="space-y-3">
                      {classData.resources.map((resource: any) => (
                        <Card key={resource.id} className="border border-light-border dark:border-dark-border">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary truncate">
                                    {resource.name}
                                  </h3>
                                  {resource.description && (
                                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary truncate">
                                      {resource.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                                    {resource.fileType} • {new Date(resource.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary">
                        No resources available for this {terminology.courseSingular.toLowerCase()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Timetable Tab */}
          {activeTab === 'timetable' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                    Weekly Timetable
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {timetable.length > 0 ? (
                    <TeacherTimetableGrid
                      periods={timetable}
                      allTerms={allTerms}
                      selectedTermId={currentTermId}
                      onTermChange={setSelectedTermId}
                      activeTermId={activeSession?.term?.id}
                      terminologyProp={terminology}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <Clock className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary">
                        No timetable available for the selected {terminology.periodSingular.toLowerCase()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}

