'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { motion } from 'framer-motion';
import { ArrowLeft, UserPlus, Users } from 'lucide-react';
import { useAddTeacher, useAddAdmin } from '@/hooks/useSchools';
import { addTeacherFormSchema, addAdminFormSchema } from '@/lib/validations/school-forms';
import { z } from 'zod';
import type { RootState } from '@/lib/store/store';
import { useApi } from '@/hooks/useApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';

type StaffType = 'teacher' | 'admin';

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  subject?: string;
  adminRole?: string;
  employeeId?: string;
  [key: string]: string | undefined;
}

export default function AddStaffPage() {
  const router = useRouter();
  const { apiCall } = useApi();
  const user = useSelector((state: RootState) => state.auth.user);
  const [isLoading, setIsLoading] = useState(false);
  const [staffType, setStaffType] = useState<StaffType>('teacher');
  const [adminRole, setAdminRole] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  
  const { addTeacher, isLoading: isAddingTeacher } = useAddTeacher(schoolId);
  const { addAdmin, isLoading: isAddingAdmin } = useAddAdmin(schoolId);
  
  // Get school type and terminology
  const { currentType } = useSchoolType();
  const terminology = getTerminology(currentType);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    subject: '',
    employeeId: '',
    isTemporary: false,
  });

  // Get school ID from localStorage (stored during login) or fetch from API
  useEffect(() => {
    const getSchoolId = async () => {
      if (!user?.id || user.role !== 'SCHOOL_ADMIN') return;

      // First, try to get from localStorage (stored during login)
      const storedSchoolId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentSchoolId') 
        : null;
      
      if (storedSchoolId) {
        setSchoolId(storedSchoolId);
        return;
      }

      // Fallback: Fetch from API (get first school admin is associated with)
      try {
        const response = await apiCall<Array<{ id: string }>>('/schools', {
          requireAuth: true,
        });

        if (response.success && Array.isArray(response.data) && response.data.length > 0) {
          // For now, use the first school (works for single-school admins)
          // In a multi-tenant setup, this would be determined by the JWT context
          setSchoolId(response.data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch school ID:', error);
      }
    };

    getSchoolId();
  }, [user, apiCall]);

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str: string): string => {
    if (!str) return str;
    return str
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Helper function to capitalize first letter only
  const capitalizeFirst = (str: string): string => {
    if (!str) return str;
    return str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase();
  };

  const validateForm = (): boolean => {
    setErrors({});
    setSubmitError(null);

    try {
      if (staffType === 'teacher') {
        addTeacherFormSchema.parse({
          ...formData,
          subject: formData.subject || undefined,
          employeeId: formData.employeeId || undefined,
        });
      } else {
        if (!adminRole.trim()) {
          setErrors({ adminRole: 'Role is required' });
          return false;
        }
        addAdminFormSchema.parse({
          ...formData,
          role: adminRole,
          employeeId: formData.employeeId || undefined,
        });
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: FormErrors = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    if (!schoolId) {
      setSubmitError('Unable to determine school. Please try refreshing the page.');
      return;
    }

    setIsLoading(true);

    try {
      if (staffType === 'teacher') {
        const teacherData = {
          firstName: capitalizeWords(formData.firstName),
          lastName: capitalizeWords(formData.lastName),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          subject: formData.subject.trim() ? capitalizeWords(formData.subject) : undefined,
          isTemporary: formData.isTemporary,
          employeeId: formData.employeeId.trim() || undefined,
        };

        await addTeacher(teacherData);
        router.push('/dashboard/school/teachers');
      } else {
        const adminData = {
          firstName: capitalizeWords(formData.firstName),
          lastName: capitalizeWords(formData.lastName),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          role: capitalizeWords(adminRole),
          employeeId: formData.employeeId.trim() || undefined,
        };

        await addAdmin(adminData);
        router.push('/dashboard/school/teachers');
      }
    } catch (error: any) {
      // Error handling is done in the hooks (toast notifications)
      // But we can also set a local error state for additional feedback
      const errorMessage =
        error?.data?.message ||
        error?.message ||
        'Failed to add staff member. Please try again.';
      setSubmitError(errorMessage);
      setIsLoading(false);
    }
  };

  const isTeacher = staffType === 'teacher';
  const isLoadingState = isLoading || isAddingTeacher || isAddingAdmin;

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="w-full max-w-4xl mx-auto">
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
          <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
            Add New {terminology.staffSingular}
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Register a new {terminology.staffSingular.toLowerCase()} in your school
          </p>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
              Staff Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submitError && (
              <Alert variant="error" className="mb-6">
                {submitError}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Staff Type Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                  Staff Type *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setStaffType('teacher');
                      setErrors({});
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      staffType === 'teacher'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-light-border dark:border-dark-border hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users
                        className={`h-5 w-5 ${
                          staffType === 'teacher'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-light-text-secondary dark:text-dark-text-secondary'
                        }`}
                      />
                      <div className="text-left">
                        <p
                          className={`font-semibold ${
                            staffType === 'teacher'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-light-text-primary dark:text-dark-text-primary'
                          }`}
                        >
                          {terminology.staffSingular}
                        </p>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                          Teaching staff
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffType('admin');
                      setErrors({});
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      staffType === 'admin'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-light-border dark:border-dark-border hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <UserPlus
                        className={`h-5 w-5 ${
                          staffType === 'admin'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-light-text-secondary dark:text-dark-text-secondary'
                        }`}
                      />
                      <div className="text-left">
                        <p
                          className={`font-semibold ${
                            staffType === 'admin'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-light-text-primary dark:text-dark-text-primary'
                          }`}
                        >
                          Administrator
                        </p>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                          Admin staff (VP, Bursar, etc.)
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Role Input for Admin */}
              {staffType === 'admin' && (
                <div className="space-y-3">
                  <Input
                    label="Role *"
                    name="adminRole"
                    value={adminRole}
                    onChange={(e) => {
                      setAdminRole(e.target.value);
                      if (errors.adminRole) {
                        setErrors({ ...errors, adminRole: undefined });
                      }
                    }}
                    onBlur={(e) => {
                      const capitalized = capitalizeWords(e.target.value);
                      if (capitalized !== e.target.value) {
                        setAdminRole(capitalized);
                      }
                    }}
                    placeholder="e.g., Administrator, Vice Principal, Bursar, Guidance Counselor"
                    required
                    helperText="Enter the administrative role (e.g., Vice Principal, Bursar, Administrator, etc.)"
                    error={errors.adminRole}
                  />
                </div>
              )}

              {/* Personal Information */}
              <div className="pt-4 border-t border-light-border dark:border-dark-border">
                <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name *"
                    name="firstName"
                    value={formData.firstName}
                    onChange={(e) => {
                      setFormData({ ...formData, firstName: e.target.value });
                      if (errors.firstName) {
                        setErrors({ ...errors, firstName: undefined });
                      }
                    }}
                    onBlur={(e) => {
                      const capitalized = capitalizeWords(e.target.value);
                      if (capitalized !== e.target.value) {
                        setFormData({ ...formData, firstName: capitalized });
                      }
                    }}
                    required
                    error={errors.firstName}
                  />
                  <Input
                    label="Last Name *"
                    name="lastName"
                    value={formData.lastName}
                    onChange={(e) => {
                      setFormData({ ...formData, lastName: e.target.value });
                      if (errors.lastName) {
                        setErrors({ ...errors, lastName: undefined });
                      }
                    }}
                    onBlur={(e) => {
                      const capitalized = capitalizeWords(e.target.value);
                      if (capitalized !== e.target.value) {
                        setFormData({ ...formData, lastName: capitalized });
                      }
                    }}
                    required
                    error={errors.lastName}
                  />
                  <Input
                    label="Email *"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) {
                        setErrors({ ...errors, email: undefined });
                      }
                    }}
                    required
                    error={errors.email}
                  />
                  <Input
                    label="Phone *"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (errors.phone) {
                        setErrors({ ...errors, phone: undefined });
                      }
                    }}
                    required
                    placeholder="+234 801 234 5678"
                    error={errors.phone}
                  />
                  <Input
                    label="Employee ID"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => {
                      setFormData({ ...formData, employeeId: e.target.value });
                      if (errors.employeeId) {
                        setErrors({ ...errors, employeeId: undefined });
                      }
                    }}
                    placeholder="Optional employee ID"
                    helperText="Optional internal identifier for this staff member"
                    error={errors.employeeId}
                  />
                </div>
              </div>

              {/* Teacher-Specific Fields */}
              {isTeacher && (
                <div className="pt-4 border-t border-light-border dark:border-dark-border">
                  <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
                    Teaching Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Subject"
                      name="subject"
                      value={formData.subject}
                      onChange={(e) => {
                        setFormData({ ...formData, subject: e.target.value });
                        if (errors.subject) {
                          setErrors({ ...errors, subject: undefined });
                        }
                      }}
                      onBlur={(e) => {
                        const capitalized = capitalizeWords(e.target.value);
                        if (capitalized !== e.target.value) {
                          setFormData({ ...formData, subject: capitalized });
                        }
                      }}
                      placeholder="e.g., Mathematics, English"
                      error={errors.subject}
                    />
                    <div className="flex items-center gap-3 pt-6">
                      <input
                        type="checkbox"
                        id="isTemporary"
                        checked={formData.isTemporary}
                        onChange={(e) =>
                          setFormData({ ...formData, isTemporary: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-light-border dark:border-dark-border rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor="isTemporary"
                        className="text-sm text-light-text-primary dark:text-dark-text-primary cursor-pointer"
                      >
                        Temporary Staff
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
                <Link href="/dashboard/school/teachers">
                  <Button type="button" variant="ghost" disabled={isLoadingState}>
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" isLoading={isLoadingState}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add {terminology.staffSingular}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
