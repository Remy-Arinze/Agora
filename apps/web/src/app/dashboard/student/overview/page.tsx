'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Clock, 
  FileText, 
  GraduationCap, 
  Award, 
  TrendingUp,
  Calendar,
  Loader2,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import {
  useGetMyStudentProfileQuery,
  useGetMyStudentEnrollmentsQuery,
  useGetMyStudentClassesQuery,
  useGetMyStudentGradesQuery,
  useGetMyStudentTimetableQuery,
  useGetTimetableForClassQuery,
  useGetTimetableForClassArmQuery,
  useGetMyStudentCalendarQuery,
  useGetActiveSessionQuery,
  useGetUpcomingEventsQuery,
} from '@/lib/store/api/schoolAdminApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';
import { format, isToday, parseISO, startOfDay } from 'date-fns';
import toast from 'react-hot-toast';

export default function StudentOverviewPage() {
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

  // Get student profile
  const { data: profileResponse, isLoading: isLoadingProfile } = useGetMyStudentProfileQuery();
  const student = profileResponse?.data;

  // Get enrollments
  const { data: enrollmentsResponse, isLoading: isLoadingEnrollments } = useGetMyStudentEnrollmentsQuery();
  const enrollments = enrollmentsResponse?.data || [];
  
  // Get active enrollment (current school)
  const activeEnrollment = useMemo(() => {
    return enrollments.find((e: any) => e.isActive) || enrollments[0];
  }, [enrollments]);
  
  // Get school ID from active enrollment
  const schoolId = activeEnrollment?.school?.id;

  // Get student's classes to find class data for timetable
  const { data: classesResponse, isLoading: isLoadingClasses } = useGetMyStudentClassesQuery();
  const classes = classesResponse?.data || [];
  const classData = useMemo(() => {
    return classes[0] || null; // Get the active/primary class
  }, [classes]);

  // Get active session
  const { data: activeSessionResponse } = useGetActiveSessionQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );
  const activeSession = activeSessionResponse?.data;
  const activeTermId = activeSession?.term?.id;

  // Get recent grades (last 5) - only published grades
  const { data: gradesResponse, isLoading: isLoadingGrades } = useGetMyStudentGradesQuery(
    { termId: activeTermId },
    { skip: !activeTermId }
  );
  const allGrades = gradesResponse?.data || [];
  
  // Filter to only published grades and get recent ones
  const publishedGrades = useMemo(() => {
    return allGrades.filter((g: any) => g.isPublished !== false);
  }, [allGrades]);
  
  const recentGrades = useMemo(() => {
    return publishedGrades
      .sort((a: any, b: any) => {
        // Sort by published date (updatedAt or createdAt) - most recent first
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [publishedGrades]);

  // Get recently published grades count (last 7 days)
  const recentlyPublishedGrades = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return publishedGrades.filter((g: any) => {
      const publishedDate = new Date(g.updatedAt || g.createdAt);
      return publishedDate >= sevenDaysAgo;
    });
  }, [publishedGrades]);

  // Get timetable - use same approach as timetables page
  const isTertiary = currentType === 'TERTIARY';
  
  // For TERTIARY: Use getMyStudentTimetable
  const { 
    data: studentTimetableResponse, 
    isLoading: isLoadingStudentTimetable 
  } = useGetMyStudentTimetableQuery(
    { termId: activeTermId },
    { skip: !activeTermId || !isTertiary }
  );

  // For PRIMARY/SECONDARY: Use class and classArm timetables
  const { 
    data: classTimetableResponse, 
    isLoading: isLoadingClassTimetable 
  } = useGetTimetableForClassQuery(
    {
      schoolId: schoolId!,
      classId: classData?.id!,
      termId: activeTermId!,
    },
    { skip: !schoolId || !classData?.id || !activeTermId || isTertiary }
  );

  const classArmId = classData?.classArmId || classData?.enrollment?.classArmId;
  const { 
    data: classArmTimetableResponse, 
    isLoading: isLoadingClassArmTimetable 
  } = useGetTimetableForClassArmQuery(
    {
      schoolId: schoolId!,
      classArmId: classArmId!,
      termId: activeTermId!,
    },
    { skip: !schoolId || !classArmId || !activeTermId || isTertiary }
  );

  // Combine timetables based on school type
  const timetable = useMemo(() => {
    if (isTertiary && studentTimetableResponse?.data) {
      return studentTimetableResponse.data;
    } else {
      const classPeriods = classTimetableResponse?.data || [];
      const classArmPeriods = classArmTimetableResponse?.data || [];
      const allPeriods = [...classPeriods, ...classArmPeriods];
      return Array.from(
        new Map(allPeriods.map((p: any) => [p.id, p])).values()
      );
    }
  }, [
    isTertiary,
    studentTimetableResponse,
    classTimetableResponse,
    classArmTimetableResponse
  ]);

  const isLoadingTimetable = isTertiary 
    ? isLoadingStudentTimetable 
    : (isLoadingClassTimetable || isLoadingClassArmTimetable);

  // Get today's schedule
  const todaySchedule = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    
    return timetable.filter((period: any) => {
      return period.dayOfWeek === dayOfWeek;
    }).sort((a: any, b: any) => {
      return a.startTime.localeCompare(b.startTime);
    });
  }, [timetable]);

  // Get calendar data (events + timetable) for next 7 days
  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);
  const endDateStr = endDate.toISOString().split('T')[0];

  const { data: calendarResponse } = useGetMyStudentCalendarQuery(
    { startDate, endDate: endDateStr },
    { skip: !schoolId }
  );
  const calendarData = calendarResponse?.data;
  const calendarEvents = calendarData?.events || [];

  // Get upcoming events (fallback to events query if calendar doesn't have events)
  const { data: upcomingEventsResponse } = useGetUpcomingEventsQuery(
    { schoolId: schoolId!, days: 7, schoolType: currentType || undefined },
    { skip: !schoolId || (calendarEvents && calendarEvents.length > 0) }
  );
  const upcomingEvents = calendarEvents.length > 0 ? calendarEvents : (upcomingEventsResponse?.data || []);

  // Calculate stats
  const stats = useMemo(() => {
    // Calculate GPA/Average (only from published grades)
    let totalScore = 0;
    let totalMaxScore = 0;
    publishedGrades.forEach((grade: any) => {
      totalScore += grade.score || 0;
      totalMaxScore += grade.maxScore || 0;
    });
    const average = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    // Count active classes
    const activeClassesCount = enrollments.filter((e: any) => e.isActive).length;

    return {
      average,
      activeClassesCount,
      totalGrades: publishedGrades.length,
      recentlyPublished: recentlyPublishedGrades.length,
    };
  }, [publishedGrades, enrollments, recentlyPublishedGrades]);

  const isLoading = isLoadingProfile || isLoadingEnrollments || isLoadingClasses || isLoadingGrades || isLoadingTimetable;

  if (isLoading) {
    return (
      <ProtectedRoute roles={['STUDENT']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4 animate-spin" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Loading dashboard...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!student) {
    return (
      <ProtectedRoute roles={['STUDENT']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Unable to load student profile
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const studentName = `${student.firstName} ${student.lastName}`.trim();

  return (
    <ProtectedRoute roles={['STUDENT']}>
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
            Welcome back, {studentName}!
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            {activeEnrollment?.classLevel ? (
              <>Currently enrolled in <span className="font-semibold">{activeEnrollment.classLevel}</span></>
            ) : (
              'View your academic progress, classes, and results'
            )}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                    Average Score
                  </p>
                  <p className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mt-2">
                    {stats.average}%
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                    Active {terminology.courses}
                  </p>
                  <p className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mt-2">
                    {stats.activeClassesCount}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                    Grades Published
                  </p>
                  <p className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mt-2">
                    {stats.totalGrades}
                  </p>
                  {stats.recentlyPublished > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {stats.recentlyPublished} new this week
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Award className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                    Today's Classes
                  </p>
                  <p className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mt-2">
                    {todaySchedule.length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Recent Grades */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  Recent Grades
                </CardTitle>
                <Link href="/dashboard/student/grades">
                  <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400">
                    View All →
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentGrades.length > 0 ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide pr-2">
                  {recentGrades.map((grade: any) => (
                    <motion.div
                      key={grade.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-gray-50 dark:bg-dark-surface rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                            {grade.subject || grade.assessmentName || 'Assessment'}
                          </h4>
                          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                            {grade.enrollment?.classLevel || 'Class'} • {grade.term || 'Term'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                            {grade.percentage?.toFixed(1)}%
                          </p>
                          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                            {grade.score}/{grade.maxScore}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    No grades published yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  Today's Schedule
                </CardTitle>
                <Link href="/dashboard/student/timetable">
                  <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400">
                    View Timetable →
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {todaySchedule.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide pr-2">
                  {todaySchedule.map((period: any, index: number) => {
                    // Check if class is currently ongoing
                    const now = new Date();
                    const [startHour, startMin] = period.startTime.split(':').map(Number);
                    const [endHour, endMin] = period.endTime.split(':').map(Number);
                    const startTime = new Date();
                    startTime.setHours(startHour, startMin, 0, 0);
                    const endTime = new Date();
                    endTime.setHours(endHour, endMin, 0, 0);
                    const isOngoing = now >= startTime && now <= endTime;
                    const isUpcoming = now < startTime;
                    
                    // Check if it's a free period (no subject/course or type is not LESSON)
                    const isFreePeriod = period.type !== 'LESSON' || 
                      (!period.subjectName && !period.subject?.name && !period.courseName && !period.course?.name);
                    
                    const periodTitle = isFreePeriod 
                      ? 'Free Period'
                      : (period.subjectName || period.subject?.name || period.courseName || period.course?.name || 'Class');
                    
                    return (
                      <motion.div
                        key={period.id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isOngoing 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-500' 
                            : isUpcoming
                            ? 'bg-gray-50 dark:bg-dark-surface border-gray-200 dark:border-dark-border'
                            : 'bg-gray-50 dark:bg-dark-surface border-gray-200 dark:border-dark-border opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                                {periodTitle}
                              </h4>
                              {isOngoing && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded-full">
                                  Now
                                </span>
                              )}
                              {period.isFromCourseRegistration && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-purple-500 text-white rounded-full">
                                  CO
                                </span>
                              )}
                            </div>
                            {period.roomName || period.room?.name ? (
                              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                                {period.roomName || period.room.name}
                              </p>
                            ) : null}
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                              {period.startTime} - {period.endTime}
                            </p>
                            {period.hasConflict && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                Conflict
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    No classes scheduled for today
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  Upcoming Events
                </CardTitle>
                <Link href="/dashboard/student/calendar">
                  <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400">
                    View Calendar →
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.slice(0, 5).map((event: any) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 bg-gray-50 dark:bg-dark-surface rounded-lg flex items-center gap-4"
                  >
                    <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary truncate">
                        {event.title}
                      </h4>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        {format(parseISO(event.startDate), 'MMM d, yyyy • h:mm a')}
                        {event.location && ` • ${event.location}`}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/dashboard/student/classes">
                <Button className="w-full" variant="primary">
                  <BookOpen className="h-4 w-4 mr-2" />
                  My {terminology.courses}
                </Button>
              </Link>
              <Link href="/dashboard/student/timetable">
                <Button className="w-full" variant="ghost">
                  <Clock className="h-4 w-4 mr-2" />
                  Timetable
                </Button>
              </Link>
              <Link href="/dashboard/student/grades">
                <Button className="w-full" variant="ghost">
                  <Award className="h-4 w-4 mr-2" />
                  Grades
                </Button>
              </Link>
              <Link href="/dashboard/student/calendar">
                <Button className="w-full" variant="ghost">
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
