'use client';

import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { motion } from 'framer-motion';
import { Clock, Loader2, AlertCircle } from 'lucide-react';
import {
  useGetMyStudentClassesQuery,
  useGetMyStudentTimetableQuery,
  useGetActiveSessionQuery,
  useGetSessionsQuery,
} from '@/lib/store/api/schoolAdminApi';
import { TeacherTimetableGrid } from '@/components/timetable/TeacherTimetableGrid';
import { useStudentSchoolType, getStudentTerminology } from '@/hooks/useStudentDashboard';

export default function StudentTimetablesPage() {
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  // Get school type from student's enrollment (not localStorage)
  const { schoolType: currentType, schoolId, isLoading: isLoadingSchoolType } = useStudentSchoolType();
  const terminology = getStudentTerminology(currentType);

  // Get student's classes to find the class data
  const { data: classesResponse, isLoading: isLoadingClasses } = useGetMyStudentClassesQuery();
  const classes = classesResponse?.data || [];
  const classData = useMemo(() => {
    return classes[0] || null; // Get the active/primary class
  }, [classes]);

  // Get active session (for term selector)
  const { data: activeSessionResponse } = useGetActiveSessionQuery(
    { schoolId: schoolId || '' },
    { skip: !schoolId }
  );
  const activeSession = activeSessionResponse?.data;

  // Get all sessions to populate term selector
  const { data: sessionsResponse } = useGetSessionsQuery(
    { schoolId: schoolId || '' },
    { skip: !schoolId }
  );

  // Determine which term to use (selected or active)
  const currentTermId = selectedTermId || activeSession?.term?.id || '';

  // Use the unified student timetable endpoint which handles:
  // - PRIMARY/SECONDARY: Automatically uses ClassArm or Class timetable
  // - TERTIARY: Merges home class + course registrations
  const { 
    data: timetableResponse, 
    isLoading: isLoadingTimetable, 
    error: timetableError 
  } = useGetMyStudentTimetableQuery(
    { termId: currentTermId || undefined },
    { skip: !classData } // Skip until we have class data (to ensure student is enrolled)
  );

  const timetable = timetableResponse?.data || [];

  const isLoading = isLoadingSchoolType || isLoadingClasses || isLoadingTimetable;

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

  if (timetableError) {
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
