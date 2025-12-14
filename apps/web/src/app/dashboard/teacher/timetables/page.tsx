'use client';

import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { Clock, Calendar, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { 
  useGetMyTeacherSchoolQuery, 
  useGetMyTeacherProfileQuery,
  useGetActiveSessionQuery,
  useGetSessionsQuery,
  useGetTimetableForTeacherQuery,
} from '@/lib/store/api/schoolAdminApi';
import { TeacherTimetableGrid } from '@/components/timetable/TeacherTimetableGrid';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';

export default function TeacherTimetablesPage() {
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  // Get teacher's school and profile
  const { data: schoolResponse } = useGetMyTeacherSchoolQuery();
  const { data: teacherResponse } = useGetMyTeacherProfileQuery();
  const schoolId = schoolResponse?.data?.id;
  const teacherId = teacherResponse?.data?.id; // Database ID

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

  // Get timetable for teacher
  const { data: timetableResponse, isLoading, error } = useGetTimetableForTeacherQuery(
    {
      schoolId: schoolId!,
      teacherId: teacherId!,
      termId: currentTermId,
    },
    { skip: !schoolId || !teacherId || !currentTermId }
  );

  const timetable = timetableResponse?.data || [];

  // Get all terms from sessions for term selector - filtered by school type and deduplicated
  const allTerms = useMemo(() => {
    if (!sessionsResponse?.data) return [];
    
    // Filter sessions by current school type to avoid duplicates
    const filteredSessions = sessionsResponse.data.filter((session) => {
      if (!currentType) return !session.schoolType;
      return session.schoolType === currentType;
    });
    
    // Deduplicate sessions by name (keep first/latest)
    const uniqueSessionsMap = new Map<string, typeof filteredSessions[0]>();
    filteredSessions.forEach((session) => {
      if (!uniqueSessionsMap.has(session.name)) {
        uniqueSessionsMap.set(session.name, session);
      }
    });
    
    const terms: Array<{ id: string; name: string; sessionName: string }> = [];
    Array.from(uniqueSessionsMap.values()).forEach((session) => {
      if (session.terms) {
        session.terms.forEach((term) => {
          terms.push({
            id: term.id,
            name: term.name,
            sessionName: session.name,
          });
        });
      }
    });
    
    // Sort by session name (desc) then term number
    return terms.sort((a, b) => {
      const sessionCompare = b.sessionName.localeCompare(a.sessionName);
      if (sessionCompare !== 0) return sessionCompare;
      return a.name.localeCompare(b.name);
    });
  }, [sessionsResponse, currentType]);

  // Set default term to active term when available
  useMemo(() => {
    if (!selectedTermId && activeSession?.term?.id) {
      setSelectedTermId(activeSession.term.id);
    }
  }, [activeSession, selectedTermId]);

  return (
    <ProtectedRoute roles={['TEACHER']}>
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
            My Timetable
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            View your weekly teaching schedule for the current {terminology.periodSingular.toLowerCase()}
          </p>
        </motion.div>


        {/* Error State */}
        {error && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Failed to load timetable</p>
                  <p className="text-sm text-light-text-muted dark:text-dark-text-muted">
                    Please try refreshing the page or contact support if the issue persists.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4 animate-spin" />
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Loading timetable...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Timetable Grid */}
        {!isLoading && !error && (
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
        )}

        {/* Empty State - No Term Selected */}
        {!isLoading && !error && !currentTermId && (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
              <p className="text-light-text-secondary dark:text-dark-text-secondary mb-2">
                No {terminology.periodSingular.toLowerCase()} selected
              </p>
              <p className="text-sm text-light-text-muted dark:text-dark-text-muted">
                Please select a {terminology.periodSingular.toLowerCase()} from the dropdown above to view your timetable.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
