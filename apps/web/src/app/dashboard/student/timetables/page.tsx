'use client';

import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { motion } from 'framer-motion';
import { Clock, Loader2, AlertCircle } from 'lucide-react';
import {
  useGetMyStudentProfileQuery,
  useGetMyStudentClassesQuery,
  useGetTimetableForClassQuery,
  useGetTimetableForClassArmQuery,
  useGetMyStudentTimetableQuery,
  useGetActiveSessionQuery,
  useGetSessionsQuery,
} from '@/lib/store/api/schoolAdminApi';
import { TeacherTimetableGrid } from '@/components/timetable/TeacherTimetableGrid';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';

export default function StudentTimetablesPage() {
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  // Get student profile
  const { data: profileResponse } = useGetMyStudentProfileQuery();
  const student = profileResponse?.data;

  // Get student's classes to find the school ID
  const { data: classesResponse, isLoading: isLoadingClasses } = useGetMyStudentClassesQuery();
  const classes = classesResponse?.data || [];
  const classData = useMemo(() => {
    return classes[0] || null; // Get the active/primary class
  }, [classes]);
  
  // Get school ID from class data
  const schoolId = classData?.enrollment?.school?.id;

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

  // Get active session
  const { data: activeSessionResponse } = useGetActiveSessionQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );
  const activeSession = activeSessionResponse?.data;

  // Get all sessions to populate term selector
  const { data: sessionsResponse } = useGetSessionsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );

  // Determine which term to use (selected or active)
  const currentTermId = selectedTermId || activeSession?.term?.id || '';

  // For TERTIARY: Use getMyStudentTimetable (hybrid approach with course registrations)
  // For PRIMARY/SECONDARY: Use class and classArm timetables (same as calendar page)
  const isTertiary = currentType === 'TERTIARY';
  
  const { 
    data: studentTimetableResponse, 
    isLoading: isLoadingStudentTimetable, 
    error: studentTimetableError 
  } = useGetMyStudentTimetableQuery(
    { termId: currentTermId },
    { skip: !currentTermId || !isTertiary }
  );

  // Fallback for PRIMARY/SECONDARY: Get timetable for the class
  const { 
    data: classTimetableResponse, 
    isLoading: isLoadingClassTimetable, 
    error: classTimetableError 
  } = useGetTimetableForClassQuery(
    {
      schoolId: schoolId!,
      classId: classData?.id!,
      termId: currentTermId,
    },
    { skip: !schoolId || !classData?.id || !currentTermId || isTertiary }
  );

  // Also get timetable for classArm if student is in a classArm (PRIMARY/SECONDARY only)
  const classArmId = classData?.classArmId || classData?.enrollment?.classArmId;
  const { 
    data: classArmTimetableResponse, 
    isLoading: isLoadingClassArmTimetable 
  } = useGetTimetableForClassArmQuery(
    {
      schoolId: schoolId!,
      classArmId: classArmId!,
      termId: currentTermId,
    },
    { skip: !schoolId || !classArmId || !currentTermId || isTertiary }
  );

  // Combine timetables based on school type
  const timetable = useMemo(() => {
    if (isTertiary && studentTimetableResponse?.data) {
      // TERTIARY: Use student timetable (already includes merged home class + course registrations)
      return studentTimetableResponse.data;
    } else {
      // PRIMARY/SECONDARY: Combine class and classArm timetables
      const classPeriods = classTimetableResponse?.data || [];
      const classArmPeriods = classArmTimetableResponse?.data || [];
      
      // Combine and deduplicate by period id
      const allPeriods = [...classPeriods, ...classArmPeriods];
      const uniquePeriods = Array.from(
        new Map(allPeriods.map((p: any) => [p.id, p])).values()
      );
      
      return uniquePeriods;
    }
  }, [
    isTertiary,
    studentTimetableResponse,
    classTimetableResponse,
    classArmTimetableResponse
  ]);

  const isLoading = isLoadingClasses || 
    (isTertiary ? isLoadingStudentTimetable : (isLoadingClassTimetable || isLoadingClassArmTimetable));
  const error = isTertiary ? studentTimetableError : classTimetableError;

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
    
    // Sort by session name and term name
    return terms.sort((a, b) => {
      if (a.sessionName !== b.sessionName) {
        return b.sessionName.localeCompare(a.sessionName);
      }
      return b.name.localeCompare(a.name);
    });
  }, [sessionsResponse, currentType]);

  if (isLoading) {
    return (
      <ProtectedRoute roles={['STUDENT']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4 animate-spin" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Loading timetable...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute roles={['STUDENT']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Unable to load timetable
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute roles={['STUDENT']}>
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
            My Timetable
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            View your weekly class schedule
          </p>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Weekly Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timetable.length > 0 ? (
              <TeacherTimetableGrid
                timetable={timetable}
                schoolType={currentType}
                isLoading={isLoading}
                allTerms={allTerms}
                selectedTermId={currentTermId}
                onTermChange={setSelectedTermId}
                activeTermId={activeSession?.term?.id}
                terminology={terminology}
              />
            ) : (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                <p className="text-light-text-secondary dark:text-dark-text-secondary">
                  No timetable available for the selected {terminology.periodSingular.toLowerCase()}
                </p>
                {!currentTermId && (
                  <p className="text-sm text-light-text-muted dark:text-dark-text-muted mt-2">
                    Please select a {terminology.periodSingular.toLowerCase()} from the dropdown above to view your timetable.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
