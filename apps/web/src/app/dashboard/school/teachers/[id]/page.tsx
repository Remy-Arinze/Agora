'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { 
  Users, 
  Mail, 
  Phone, 
  BookOpen, 
  GraduationCap,
  ArrowLeft,
  Edit,
  Clock,
  User,
  Calendar,
  MapPin,
  Award,
  Shield,
  Loader2,
  AlertCircle,
  Send
} from 'lucide-react';
import {
  useGetStaffMemberQuery,
  useGetAdminPermissionsQuery,
  useGetMySchoolQuery,
  useResendPasswordResetForStaffMutation,
  useGetClassesQuery,
  PermissionResource,
  PermissionType,
} from '@/lib/store/api/schoolAdminApi';
import { PermissionAssignmentModal } from '@/components/permissions/PermissionAssignmentModal';
import { EditTeacherProfileModal } from '@/components/modals/EditTeacherProfileModal';
import toast from 'react-hot-toast';

const RESOURCE_LABELS: Record<PermissionResource, string> = {
  OVERVIEW: 'Dashboard Overview',
  ANALYTICS: 'Analytics',
  SUBSCRIPTIONS: 'Subscriptions',
  STUDENTS: 'Students',
  STAFF: 'Staff',
  CLASSES: 'Classes',
  SUBJECTS: 'Subjects',
  TIMETABLES: 'Timetables',
  CALENDAR: 'Calendar',
  ADMISSIONS: 'Admissions',
  SESSIONS: 'Sessions',
  EVENTS: 'Events',
};

const TYPE_LABELS: Record<PermissionType, string> = {
  READ: 'Read',
  WRITE: 'Write',
  ADMIN: 'Admin (Full Access)',
};

type TabType = 'profile' | 'permissions';

// Passport-style photo component
const PassportPhoto = ({
  profileImage,
  firstName,
  lastName,
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

  return (
    <div className="flex justify-center">
      <div className="relative w-48 h-60 bg-white dark:bg-gray-800 border-4 border-gray-300 dark:border-gray-600 shadow-lg overflow-hidden">
        {profileImage && !imageError ? (
          <img
            src={profileImage}
            alt={`${firstName} ${lastName}`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center">
            <span className="text-white font-bold text-4xl">
              {getInitials(firstName, lastName)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Get school ID
  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;

  // Get staff member data
  const { data: staffResponse, isLoading, error, refetch: refetchStaff } = useGetStaffMemberQuery(
    { schoolId: schoolId!, staffId },
    { skip: !schoolId || !staffId }
  );

  const staff = staffResponse?.data;
  const isTeacher = staff?.type === 'teacher';
  const isAdmin = staff?.type === 'admin';

  // Get admin permissions if this is an admin
  const { data: permissionsResponse } = useGetAdminPermissionsQuery(
    { schoolId: schoolId!, adminId: staffId },
    { skip: !schoolId || !staffId || !isAdmin }
  );

  // Get classes assigned to teacher (only if teacher, not admin)
  const { data: classesResponse } = useGetClassesQuery(
    { schoolId: schoolId!, teacherId: isTeacher ? staffId : undefined },
    { skip: !schoolId || !staffId || !isTeacher }
  );

  const teacherClasses = classesResponse?.data || [];
  const permissions = permissionsResponse?.data?.permissions || [];
  const isPrincipal = isAdmin && staff?.role?.toLowerCase() === 'principal';
  
  // Resend password reset mutation
  const [resendPasswordReset, { isLoading: isResendingPasswordReset }] = useResendPasswordResetForStaffMutation();
  
  // Check if user hasn't set their password yet
  const hasNotSetPassword = staff?.user?.accountStatus === 'SHADOW';
  
  const handleResendPasswordReset = async () => {
    if (!schoolId || !staffId) return;
    
    try {
      await resendPasswordReset({ schoolId, staffId }).unwrap();
      toast.success('Password reset email sent successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to send password reset email');
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    ...(isAdmin ? [{ id: 'permissions' as TabType, label: 'Permissions', icon: <Shield className="h-4 w-4" /> }] : []),
  ];

  if (isLoading) {
    return (
      <ProtectedRoute roles={['SCHOOL_ADMIN']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4 animate-spin" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Loading staff details...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !staff) {
    return (
      <ProtectedRoute roles={['SCHOOL_ADMIN']}>
        <div className="w-full">
          <Link href="/dashboard/school/teachers">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Staff
            </Button>
          </Link>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Staff member not found or error loading details.
            </p>
          </div>
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
          <Link href="/dashboard/school/teachers">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Staff
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                {staff.firstName} {staff.lastName}
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                {staff.role || (isAdmin ? 'Administrator' : 'Teacher')} {staff.subject ? `• ${staff.subject}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasNotSetPassword && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleResendPasswordReset}
                  disabled={isResendingPasswordReset}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isResendingPasswordReset ? 'Sending...' : 'Resend Password Setup Email'}
                </Button>
              )}
              {isAdmin && !isPrincipal && (
                <Button variant="ghost" size="sm" onClick={() => setShowPermissionModal(true)}>
                  <Shield className="h-4 w-4 mr-2" />
                  Manage Permissions
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowEditProfileModal(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
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
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                        Personal Information
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Full Name
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {staff.firstName} {staff.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Email
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {staff.email || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Phone
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {staff.phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Role
                        </p>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isPrincipal
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                              : staff.role === 'Teacher'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                        >
                          {staff.role || (isAdmin ? 'Administrator' : 'Teacher')}
                        </span>
                      </div>
                      {staff.subject && (
                        <div>
                          <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                            Subject
                          </p>
                          <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                            {staff.subject}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Status
                        </p>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            staff.status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {staff.status}
                        </span>
                      </div>
                      {staff.employeeId && (
                        <div>
                          <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                            Employee ID
                          </p>
                          <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                            {staff.employeeId}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Classes Assigned (only for teachers) */}
                {staff.type === 'teacher' && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                          Classes Assigned
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {teacherClasses.length === 0 ? (
                        <div className="text-center py-8">
                          <BookOpen className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                          <p className="text-light-text-secondary dark:text-dark-text-secondary">
                            This teacher is not assigned to any classes yet.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {teacherClasses.map((classItem) => {
                            // Find the teacher's assignment for this class
                            const assignment = classItem.teachers?.find(
                              (t) => t.teacherId === staffId
                            );
                            return (
                              <div
                                key={classItem.id}
                                className="border border-light-border dark:border-dark-border rounded-lg p-4 hover:bg-light-surface dark:hover:bg-dark-surface transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-1">
                                      {classItem.name}
                                    </h3>
                                    <div className="space-y-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                      {classItem.classLevel && (
                                        <p>
                                          <span className="font-medium">Level:</span> {classItem.classLevel}
                                        </p>
                                      )}
                                      {assignment?.subject && (
                                        <p>
                                          <span className="font-medium">Subject:</span> {assignment.subject}
                                        </p>
                                      )}
                                      {assignment?.isPrimary && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                          Primary Teacher
                                        </span>
                                      )}
                                      <p>
                                        <span className="font-medium">Academic Year:</span> {classItem.academicYear}
                                      </p>
                                      <p>
                                        <span className="font-medium">Students:</span> {classItem.studentsCount || 0}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Passport Photo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                      Photo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PassportPhoto
                      profileImage={staff.profileImage || null}
                      firstName={staff.firstName}
                      lastName={staff.lastName}
                    />
                  </CardContent>
                </Card>

                {/* Additional Information */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                        Additional Information
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Created At
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {new Date(staff.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {staff.isTemporary && (
                        <div>
                          <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                            Employment Type
                          </p>
                          <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                            Temporary
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && isAdmin && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                      Assigned Permissions
                    </CardTitle>
                  </div>
                  {!isPrincipal && (
                    <Button variant="primary" size="sm" onClick={() => setShowPermissionModal(true)}>
                      <Shield className="h-4 w-4 mr-2" />
                      Manage Permissions
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isPrincipal ? (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
                    <p className="text-light-text-primary dark:text-dark-text-primary font-semibold mb-2">
                      Principal - Full Access
                    </p>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary">
                      Principals have full administrative access to all resources and features.
                    </p>
                  </div>
                ) : permissions.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                    <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                      No permissions assigned yet.
                    </p>
                    <Button variant="primary" size="sm" onClick={() => setShowPermissionModal(true)}>
                      <Shield className="h-4 w-4 mr-2" />
                      Assign Permissions
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(
                      permissions.reduce((acc, perm) => {
                        if (!acc[perm.resource]) {
                          acc[perm.resource] = [];
                        }
                        acc[perm.resource].push(perm);
                        return acc;
                      }, {} as Record<PermissionResource, typeof permissions>)
                    ).map(([resource, resourcePerms]) => (
                      <div key={resource} className="border border-light-border dark:border-dark-border rounded-lg p-4">
                        <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-3">
                          {RESOURCE_LABELS[resource as PermissionResource]}
                        </h3>
                        <div className="space-y-2">
                          {resourcePerms.map((perm) => (
                            <div
                              key={perm.id}
                              className="flex items-center justify-between p-2 bg-light-surface dark:bg-dark-surface rounded"
                            >
                              <span className="text-sm text-light-text-primary dark:text-dark-text-primary">
                                {TYPE_LABELS[perm.type]}
                              </span>
                              {perm.type === PermissionType.ADMIN && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                  Full Access
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Permission Assignment Modal */}
        {showPermissionModal && isAdmin && (
          <PermissionAssignmentModal
            isOpen={showPermissionModal}
            onClose={() => setShowPermissionModal(false)}
            adminId={staffId}
            adminName={`${staff.firstName} ${staff.lastName}`}
            adminRole={staff.role || 'Administrator'}
          />
        )}

        {/* Edit Profile Modal */}
        {showEditProfileModal && staff && (
          <EditTeacherProfileModal
            isOpen={showEditProfileModal}
            onClose={() => setShowEditProfileModal(false)}
            teacher={{
              id: staff.id,
              firstName: staff.firstName,
              lastName: staff.lastName,
              phone: staff.phone,
              subject: staff.subject,
              isTemporary: staff.isTemporary,
              role: staff.role,
              profileImage: staff.profileImage || null,
            }}
            schoolId={schoolId!}
            staffType={staff.type}
            onSuccess={() => {
              // Refetch staff data
              refetchStaff();
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
