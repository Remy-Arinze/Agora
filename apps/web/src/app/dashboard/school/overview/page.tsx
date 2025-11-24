'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/dashboard/StatCard';
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { motion } from 'framer-motion';
import { GraduationCap, Users, BookOpen, UserPlus, Palette, Loader2, AlertCircle, Calendar, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGetSchoolAdminDashboardQuery, useGetActiveSessionQuery, useGetMySchoolQuery, useEndTermMutation } from '@/lib/store/api/schoolAdminApi';
import { EndTermModal } from '@/components/modals';
import toast from 'react-hot-toast';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';

// Helper function to format numbers with commas
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

// Helper function to format change percentage
const formatChange = (change: number, isPercentage: boolean = true): string => {
  const sign = change >= 0 ? '+' : '';
  if (isPercentage) {
    return `${sign}${change}%`;
  }
  return `${sign}${change}`;
};

// Helper function to determine change type
const getChangeType = (change: number): 'positive' | 'negative' | 'neutral' => {
  if (change > 0) return 'positive';
  if (change < 0) return 'negative';
  return 'neutral';
};

export default function AdminOverviewPage() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useGetSchoolAdminDashboardQuery();
  
  // Get school type and terminology
  const { currentType } = useSchoolType();
  const terminology = getTerminology(currentType);

  // Get school and active session
  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;
  const { data: activeSessionResponse, refetch: refetchActiveSession } = useGetActiveSessionQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );
  const activeSession = activeSessionResponse?.data;

  const [endTerm, { isLoading: isEndingTerm }] = useEndTermMutation();
  const [showEndTermModal, setShowEndTermModal] = useState(false);

  // Determine button state
  const hasActiveSession = !!activeSession?.session;
  const hasActiveTerm = !!activeSession?.term;
  
  const getButtonConfig = () => {
    if (!hasActiveSession) {
      return {
        text: 'Start Session',
        icon: Calendar,
        onClick: () => router.push('/dashboard/school/settings/session'),
        variant: 'primary' as const,
      };
    } else if (!hasActiveTerm) {
      return {
        text: 'Start Term',
        icon: Calendar,
        onClick: () => router.push('/dashboard/school/settings/session'),
        variant: 'primary' as const,
      };
    } else {
      return {
        text: 'End Term',
        icon: XCircle,
        onClick: () => setShowEndTermModal(true),
        variant: 'danger' as const,
      };
    }
  };

  const handleEndTerm = async () => {
    if (!schoolId) {
      toast.error('School not found');
      return;
    }

    try {
      await endTerm({ schoolId }).unwrap();
      toast.success('Term ended successfully');
      setShowEndTermModal(false);
      refetchActiveSession();
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to end term');
    }
  };

  const buttonConfig = getButtonConfig();
  const ButtonIcon = buttonConfig.icon;

  // Extract dashboard data
  const dashboard = data?.data;
  const stats = dashboard?.stats;
  const growthTrends = dashboard?.growthTrends || [];
  const weeklyActivity = dashboard?.weeklyActivity || [];
  const recentStudents = dashboard?.recentStudents || [];

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                School Overview
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Manage your school, students, teachers, and academic activities
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={buttonConfig.variant}
                size="sm"
                onClick={buttonConfig.onClick}
                disabled={isEndingTerm}
                className="flex items-center gap-2"
              >
                {isEndingTerm ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Ending Term...
                  </>
                ) : (
                  <>
                    <ButtonIcon className="h-4 w-4" />
                    {buttonConfig.text}
                  </>
                )}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push('/dashboard/school/site-builder/templates')}
                className="flex items-center gap-2"
              >
                <Palette className="h-4 w-4" />
                Site Builder
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <Alert variant="error" className="mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Failed to load dashboard data</p>
                <p className="text-sm mt-1">
                  {error && 'data' in error
                    ? (error.data as any)?.message || 'An error occurred while loading dashboard data'
                    : 'An error occurred while loading dashboard data'}
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

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="ml-3 text-light-text-secondary dark:text-dark-text-secondary">
              Loading dashboard data...
            </span>
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && !error && stats && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <StatCard
                title="Total Students"
                value={formatNumber(stats.totalStudents)}
                change={formatChange(stats.studentsChange)}
                changeType={getChangeType(stats.studentsChange)}
                icon={
                  <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                }
              />
          <StatCard
            title={`Total ${terminology.staff}`}
            value={formatNumber(stats.totalTeachers)}
            change={formatChange(stats.teachersChange)}
            changeType={getChangeType(stats.teachersChange)}
            icon={
              <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
            }
          />
          <StatCard
            title={`Active ${terminology.courses}`}
            value={formatNumber(stats.activeCourses)}
            change={formatChange(stats.coursesChange)}
            changeType={getChangeType(stats.coursesChange)}
            icon={
              <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            }
          />
              <StatCard
                title="Pending Admissions"
                value={formatNumber(stats.pendingAdmissions)}
                change={formatChange(stats.pendingAdmissionsChange, false)}
                changeType={getChangeType(stats.pendingAdmissionsChange)}
                icon={
                  <UserPlus className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                }
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <AnalyticsChart
                title="Growth Trends"
                data={growthTrends}
                type="line"
                dataKeys={['students', 'teachers', 'courses']}
                colors={['#3b82f6', '#10b981', '#a855f7']}
              />
              <AnalyticsChart
                title="Student Distribution"
                data={growthTrends}
                type="donut"
                dataKeys={['students']}
                colors={['#3b82f6', '#10b981', '#f59e0b', '#ef4444']}
              />
            </div>

            {/* Recent Activity */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  title="Weekly Activity"
                  data={weeklyActivity}
                  type="horizontal"
                  dataKeys={['admissions', 'transfers']}
                  colors={['#3b82f6', '#10b981']}
                />
              </CardContent>
            </Card>

            {/* Recent Students */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                    Recent Students
                  </CardTitle>
                  <Link href="/dashboard/school/students">
                    <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400">
                      View All →
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentStudents.length === 0 ? (
                  <div className="text-center py-8 text-light-text-secondary dark:text-dark-text-secondary">
                    <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No recent students found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentStudents.map((student) => (
                      <Link
                        key={student.id}
                        href={`/dashboard/school/students/${student.id}`}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-gray-50 dark:bg-dark-surface rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface/80 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                                {student.name}
                              </h4>
                              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                                {student.classLevel} • {student.admissionNumber}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                student.status === 'active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                              }`}
                            >
                              {student.status}
                            </span>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* End Term Modal */}
        <EndTermModal
          isOpen={showEndTermModal}
          onClose={() => setShowEndTermModal(false)}
          onConfirm={handleEndTerm}
          isLoading={isEndingTerm}
          termName={activeSession?.term?.name}
          sessionName={activeSession?.session?.name}
        />
      </div>
    </ProtectedRoute>
  );
}

