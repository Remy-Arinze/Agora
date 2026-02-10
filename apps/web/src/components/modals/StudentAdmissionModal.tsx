'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Loader2, UserPlus, AlertCircle, User, Heart, GraduationCap } from 'lucide-react';
import { useGetMySchoolQuery, useAdmitStudentMutation, useGetClassesQuery, useGetClassArmsQuery, useGetClassLevelsQuery, useGenerateDefaultClassesMutation, useUploadStudentImageMutation, type AddStudentDto } from '@/lib/store/api/schoolAdminApi';
import { studentAdmissionFormSchema } from '@/lib/validations/school-forms';
import { useSchoolType } from '@/hooks/useSchoolType';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ImageUpload } from '@/components/ui/ImageUpload';

interface StudentAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromTransferId?: string | null;
}

export function StudentAdmissionModal({ isOpen, onClose, fromTransferId }: StudentAdmissionModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Get school data
  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;
  const { currentType } = useSchoolType();

  // Get classes for the current school type
  const { 
    data: classesResponse, 
    isLoading: isLoadingClasses,
    isFetching: isFetchingClasses 
  } = useGetClassesQuery(
    { schoolId: schoolId!, type: currentType || undefined },
    { skip: !schoolId }
  );
  const classes = classesResponse?.data || [];
  const hasClasses = classes.length > 0;
  const classesLoaded = !isLoadingClasses && !isFetchingClasses;

  // Get ClassArms for PRIMARY/SECONDARY schools
  const isPrimaryOrSecondary = currentType === 'PRIMARY' || currentType === 'SECONDARY';
  const { 
    data: classArmsResponse,
    isLoading: isLoadingClassArms,
    isFetching: isFetchingClassArms 
  } = useGetClassArmsQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId || !isPrimaryOrSecondary }
  );
  const classArms = classArmsResponse?.data || [];
  const hasClassArms = classArms.length > 0;
  const classArmsLoaded = !isLoadingClassArms && !isFetchingClassArms;
  const schoolUsesClassArms = classArms.length > 0;

  // Get ClassLevels for grouping ClassArms
  const { 
    data: classLevelsResponse,
    isLoading: isLoadingClassLevels,
    isFetching: isFetchingClassLevels 
  } = useGetClassLevelsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId || !isPrimaryOrSecondary }
  );
  const classLevels = classLevelsResponse?.data || [];
  const hasClassLevels = classLevels.length > 0;
  const classLevelsLoaded = !isLoadingClassLevels && !isFetchingClassLevels;

  // Group ClassArms by ClassLevel
  const classArmsByLevel = classLevels.reduce((acc, level) => {
    acc[level.id] = classArms.filter(arm => arm.classLevelId === level.id);
    return acc;
  }, {} as Record<string, typeof classArms>);

  // Student admission mutation
  const [admitStudent, { isLoading: isAdmitting }] = useAdmitStudentMutation();
  const [uploadStudentImage] = useUploadStudentImageMutation();
  
  // Generate default classes mutation
  const [generateDefaultClasses, { isLoading: isGeneratingClasses }] = useGenerateDefaultClassesMutation();

  // Handler for generating classes
  const handleGenerateClasses = async () => {
    if (!schoolId || !currentType) return;
    
    try {
      await generateDefaultClasses({
        schoolId,
        schoolType: currentType,
      }).unwrap();
      toast.success('Default classes generated successfully!');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to generate classes');
    }
  };
  
  // Image upload state
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str: string): string => {
    if (!str) return str;
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    age: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    classLevel: '',
    classArmId: '', 
    // Parent/Guardian Information
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    parentRelationship: '',
    // Health Information
    bloodGroup: '',
    allergies: '',
    medications: '',
    emergencyContact: '',
    emergencyContactPhone: '',
    medicalNotes: '',
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSubmitError(null);
      setErrors({});
      setProfileImage(null);
      setSelectedImageFile(null);
      setFormData({
        firstName: '',
        middleName: '',
        lastName: '',
        dateOfBirth: '',
        age: '',
        gender: '',
        email: '',
        phone: '',
        address: '',
        classLevel: '',
        classArmId: '',
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        parentRelationship: '',
        bloodGroup: '',
        allergies: '',
        medications: '',
        emergencyContact: '',
        emergencyContactPhone: '',
        medicalNotes: '',
      });
    }
  }, [isOpen]);

  const handleNameChange = (field: 'firstName' | 'lastName' | 'middleName' | 'parentName', value: string) => {
    const capitalized = capitalizeWords(value);
    setFormData({ ...formData, [field]: capitalized });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return '';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const handleDateOfBirthChange = (value: string) => {
    setFormData({ ...formData, dateOfBirth: value, age: calculateAge(value) });
    if (errors.dateOfBirth) {
      setErrors({ ...errors, dateOfBirth: undefined });
    }
  };

  const validateForm = (): { isValid: boolean; sanitizedData?: z.infer<typeof studentAdmissionFormSchema> } => {
    setErrors({});
    setSubmitError(null);

    const result = studentAdmissionFormSchema.safeParse({
      ...formData,
      email: formData.email || undefined,
      parentEmail: formData.parentEmail || undefined,
      middleName: formData.middleName || undefined,
      address: formData.address || undefined,
      bloodGroup: formData.bloodGroup || undefined,
      allergies: formData.allergies || undefined,
      medications: formData.medications || undefined,
      emergencyContact: formData.emergencyContact || undefined,
      emergencyContactPhone: formData.emergencyContactPhone || undefined,
      medicalNotes: formData.medicalNotes || undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      const errorMessages: string[] = [];
      
      result.error.issues.forEach((err) => {
        if (err.path && err.path.length > 0 && err.path[0]) {
          const fieldName = err.path[0] as string;
          fieldErrors[fieldName] = err.message;
          errorMessages.push(err.message);
        }
      });
      
      setErrors(fieldErrors);
      
      if (errorMessages.length === 1) {
        toast.error(errorMessages[0]);
      } else if (errorMessages.length > 1) {
        toast.error(`Please fix ${errorMessages.length} errors in the form`);
        setSubmitError(errorMessages[0]);
      } else {
        toast.error('Please check the form for errors');
      }
      
      return { isValid: false };
    }

    return { isValid: true, sanitizedData: result.data };
  };

  const isFormValid = (): boolean => {
    return !!(
      formData.firstName?.trim() &&
      formData.lastName?.trim() &&
      formData.dateOfBirth &&
      formData.gender &&
      formData.phone?.trim() &&
      formData.classLevel &&
      formData.parentName?.trim() &&
      formData.parentPhone?.trim() &&
      formData.parentRelationship?.trim()
    );
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});

    const validation = validateForm();
    if (!validation.isValid || !validation.sanitizedData) {
      return;
    }

    if (!schoolId) {
      setSubmitError('Unable to determine school. Please try refreshing the page.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const sanitized = validation.sanitizedData;
      const studentData: AddStudentDto = {
        firstName: sanitized.firstName,
        middleName: sanitized.middleName,
        lastName: sanitized.lastName,
        dateOfBirth: sanitized.dateOfBirth,
        email: sanitized.email,
        phone: sanitized.phone,
        address: sanitized.address,
        classLevel: sanitized.classArmId ? undefined : sanitized.classLevel,
        classArmId: sanitized.classArmId,
        academicYear: sanitized.academicYear,
        parentName: sanitized.parentName,
        parentPhone: sanitized.parentPhone,
        parentEmail: sanitized.parentEmail,
        parentRelationship: sanitized.parentRelationship,
        bloodGroup: sanitized.bloodGroup,
        allergies: sanitized.allergies,
        medications: sanitized.medications,
        emergencyContact: sanitized.emergencyContact,
        emergencyContactPhone: sanitized.emergencyContactPhone,
        medicalNotes: sanitized.medicalNotes,
      };

      const result = await admitStudent({
        schoolId,
        student: {
          ...studentData,
          profileImage: profileImage || undefined,
        },
      }).unwrap();

      if (selectedImageFile && result.id) {
        try {
          await uploadStudentImage({
            schoolId,
            studentId: result.id,
            file: selectedImageFile,
          }).unwrap();
          toast.success('Profile image uploaded successfully!');
        } catch (uploadError: any) {
          console.error('Failed to upload profile image:', uploadError);
          toast.error(uploadError?.data?.message || 'Failed to upload profile image.');
        }
      }

      toast.success(result.message || 'Student admitted successfully!');
      onClose();
    } catch (error: any) {
      setIsLoading(false);
      
      if (error?.data && Array.isArray(error.data)) {
        const fieldErrors: Record<string, string> = {};
        const errorMessages: string[] = [];
        
        const fieldLabels: Record<string, string> = {
          parentPhone: 'Parent/Guardian Phone',
          parentEmail: 'Parent/Guardian Email',
          phone: 'Phone Number',
          email: 'Email Address',
          firstName: 'First Name',
          lastName: 'Last Name',
          dateOfBirth: 'Date of Birth',
          classLevel: 'Class Level',
          parentName: 'Parent/Guardian Name',
          parentRelationship: 'Relationship',
          emergencyContact: 'Emergency Contact',
          emergencyContactPhone: 'Emergency Contact Phone',
        };
        
        error.data.forEach((err: any) => {
          const fieldName = err.path?.[0] || 'unknown';
          const fieldLabel = fieldLabels[fieldName] || fieldName;
          let userMessage = err.message || 'Invalid value';
          
          if (err.code === 'too_small') {
            if (err.minimum) {
              userMessage = `${fieldLabel} must be at least ${err.minimum} characters`;
            } else {
              userMessage = `${fieldLabel} is too short`;
            }
          } else if (err.code === 'invalid_format' || err.code === 'invalid_string') {
            if (fieldName.includes('email')) {
              userMessage = `${fieldLabel} must be a valid email address`;
            } else if (fieldName.includes('phone')) {
              userMessage = `${fieldLabel} must be a valid phone number`;
            } else {
              userMessage = `${fieldLabel} format is invalid`;
            }
          } else if (err.code === 'too_big') {
            userMessage = `${fieldLabel} is too long`;
          } else if (err.code === 'invalid_type') {
            userMessage = `${fieldLabel} has an invalid value`;
          }
          
          fieldErrors[fieldName] = userMessage;
          errorMessages.push(userMessage);
        });
        
        setErrors(fieldErrors);
        
        if (errorMessages.length === 1) {
          toast.error(errorMessages[0]);
        } else if (errorMessages.length > 1) {
          toast.error(`Please fix ${errorMessages.length} errors in the form`);
          setSubmitError(errorMessages[0]);
        } else {
          toast.error('Please check the form for errors');
        }
        return;
      }
      
      const errorMessage = error?.data?.message || error?.message || 'Failed to admit student. Please try again.';
      setSubmitError(errorMessage);
      
      if (error?.status === 409 || errorMessage.includes('already exists') || errorMessage.includes('transfer')) {
        toast.error(errorMessage, { duration: 6000 });
      } else {
        toast.error(errorMessage);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={fromTransferId ? 'Complete Transfer Application' : 'New Admission Application'}
      size="xl"
    >
      {submitError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-300 mb-1">
                Error
              </p>
              <p className="text-sm text-red-800 dark:text-red-400">
                {submitError}
              </p>
              {submitError.includes('transfer') && (
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      router.push('/dashboard/school/transfers?new=true');
                      onClose();
                    }}
                  >
                    Go to Transfers
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmitApplication} className="space-y-6">
        {/* Personal Information */}
        <div>
          <p className="font-medium text-light-text-secondary dark:text-dark-text-secondary mb-4 flex items-center gap-2" style={{ fontSize: 'var(--text-section-title)' }}>
            <User className="h-5 w-5" />
            Personal Information
          </p>
          {/* Profile Image Upload */}
          <div className="mb-6">
            <ImageUpload
              label="Profile Image (Optional)"
              value={profileImage}
              onChange={setProfileImage}
              onUpload={async (file) => {
                setSelectedImageFile(file);
                return URL.createObjectURL(file);
              }}
              helperText="Upload a passport-sized image (JPG, PNG, GIF, WEBP up to 5MB). Cropping will be applied."
              disabled={isLoading || isAdmitting}
              enableCrop={true}
              aspectRatio={1}
              cropShape="rect"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={formData.firstName}
              onChange={(e) => handleNameChange('firstName', e.target.value)}
              required
              error={errors.firstName}
            />
            <Input
              label="Middle Name"
              value={formData.middleName}
              onChange={(e) => handleNameChange('middleName', e.target.value)}
              error={errors.middleName}
            />
            <Input
              label="Last Name *"
              value={formData.lastName}
              onChange={(e) => handleNameChange('lastName', e.target.value)}
              required
              error={errors.lastName}
            />
            <Input
              label="Date of Birth *"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleDateOfBirthChange(e.target.value)}
              required
              error={errors.dateOfBirth}
            />
            <Input
              label="Age"
              value={formData.age}
              readOnly
              helperText="Calculated from date of birth"
            />
            <div>
              <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                Gender *
              </label>
              <select
                value={formData.gender}
                onChange={(e) => {
                  setFormData({ ...formData, gender: e.target.value });
                  if (errors.gender) {
                    setErrors({ ...errors, gender: undefined });
                  }
                }}
                className={`w-full px-3 py-2 border rounded-md bg-light-card dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.gender
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-light-border dark:border-dark-border'
                }`}
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {errors.gender && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.gender}</p>
              )}
            </div>
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) {
                  setErrors({ ...errors, email: undefined });
                }
              }}
              error={errors.email}
            />
            <Input
              label="Phone *"
              type="tel"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                if (errors.phone) {
                  setErrors({ ...errors, phone: undefined });
                }
              }}
              required
              error={errors.phone}
            />
            <Input
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="md:col-span-2"
            />
          </div>
        </div>

        {/* Academic Information */}
        <div>
          <p className="font-medium text-light-text-secondary dark:text-dark-text-secondary mb-4 flex items-center gap-2" style={{ fontSize: 'var(--text-section-title)' }}>
            <GraduationCap className="h-5 w-5" />
            Academic Information
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schoolUsesClassArms && isPrimaryOrSecondary ? (
              // ClassArm selector for PRIMARY/SECONDARY schools using ClassArms
              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                  ClassArm *
                </label>
                {isLoadingClassArms || isFetchingClassArms || isLoadingClassLevels || isFetchingClassLevels ? (
                  <div className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-card dark:bg-dark-surface">
                    <div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading class arms...</span>
                    </div>
                  </div>
                ) : !hasClassArms && classArmsLoaded && !hasClassLevels && classLevelsLoaded ? (
                  <div className="space-y-2">
                    <div className="w-full px-4 py-3 border border-yellow-500/50 dark:border-yellow-500/30 rounded-md bg-yellow-50/10 dark:bg-yellow-900/10">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">
                        No class arms found. You need to create classes first.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {currentType && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={handleGenerateClasses}
                            isLoading={isGeneratingClasses}
                          >
                            Generate Default Classes
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <select
                    value={formData.classArmId}
                    onChange={(e) => {
                      const selectedArmId = e.target.value;
                      const selectedArm = classArms.find(arm => arm.id === selectedArmId);
                      setFormData({ 
                        ...formData, 
                        classArmId: selectedArmId,
                        classLevel: selectedArm ? selectedArm.classLevelName : '',
                      });
                      if (errors.classArmId || errors.classLevel) {
                        setErrors({ ...errors, classArmId: undefined, classLevel: undefined });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md bg-light-card dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.classArmId || errors.classLevel
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-light-border dark:border-dark-border'
                    }`}
                    required
                  >
                    <option value="">Select ClassArm</option>
                    {classLevels.map((level) => {
                      const armsForLevel = classArmsByLevel[level.id] || [];
                      if (armsForLevel.length === 0) return null;
                      return (
                        <optgroup key={level.id} label={level.name}>
                          {armsForLevel.map((arm) => (
                            <option key={arm.id} value={arm.id}>
                              {level.name} {arm.name}
                              {arm.capacity && ` (${arm.capacity} max)`}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                )}
                {(errors.classArmId || errors.classLevel) && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.classArmId || errors.classLevel}</p>
                )}
                {!isLoadingClassArms && !isFetchingClassArms && hasClassArms && (
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                    Select the specific ClassArm (e.g., JSS 1 Gold, JSS 1 Blue)
                  </p>
                )}
              </div>
            ) : (
              // Class selector for TERTIARY or schools without ClassArms (backward compatibility)
              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                  Class Level *
                </label>
                {isLoadingClasses || isFetchingClasses ? (
                  <div className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-card dark:bg-dark-surface">
                    <div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading classes...</span>
                    </div>
                  </div>
                ) : !hasClasses && classesLoaded ? (
                  <div className="space-y-2">
                    <div className="w-full px-4 py-3 border border-yellow-500/50 dark:border-yellow-500/30 rounded-md bg-yellow-50/10 dark:bg-yellow-900/10">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">
                        No classes found. You need to create classes before adding students.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {currentType && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={handleGenerateClasses}
                            isLoading={isGeneratingClasses}
                          >
                            Generate Default Classes
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <select
                    value={formData.classLevel}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        classArmId: '',
                        classLevel: e.target.value,
                      });
                      if (errors.classLevel) {
                        setErrors({ ...errors, classLevel: undefined });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md bg-light-card dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.classLevel
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-light-border dark:border-dark-border'
                    }`}
                    required
                  >
                    <option value="">Select class level</option>
                    {classes.map((cls: any) => (
                      <option key={cls.id} value={cls.name}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.classLevel && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.classLevel}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Parent/Guardian Information */}
        <div>
          <p className="font-medium text-light-text-secondary dark:text-dark-text-secondary mb-4 flex items-center gap-2" style={{ fontSize: 'var(--text-section-title)' }}>
            <User className="h-5 w-5" />
            Parent/Guardian Information
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Parent/Guardian Name *"
              value={formData.parentName}
              onChange={(e) => handleNameChange('parentName', e.target.value)}
              required
              error={errors.parentName}
            />
            <Input
              label="Relationship *"
              value={formData.parentRelationship}
              onChange={(e) => {
                setFormData({ ...formData, parentRelationship: e.target.value });
                if (errors.parentRelationship) {
                  setErrors({ ...errors, parentRelationship: undefined });
                }
              }}
              placeholder="e.g., Father, Mother, Guardian"
              required
              error={errors.parentRelationship}
            />
            <Input
              label="Parent Phone *"
              type="tel"
              value={formData.parentPhone}
              onChange={(e) => {
                setFormData({ ...formData, parentPhone: e.target.value });
                if (errors.parentPhone) {
                  setErrors({ ...errors, parentPhone: undefined });
                }
              }}
              required
              error={errors.parentPhone}
            />
            <Input
              label="Parent Email"
              type="email"
              value={formData.parentEmail}
              onChange={(e) => {
                setFormData({ ...formData, parentEmail: e.target.value });
                if (errors.parentEmail) {
                  setErrors({ ...errors, parentEmail: undefined });
                }
              }}
              error={errors.parentEmail}
            />
          </div>
        </div>

        {/* Health Information */}
        <div>
          <p className="font-medium text-light-text-secondary dark:text-dark-text-secondary mb-4 flex items-center gap-2" style={{ fontSize: 'var(--text-section-title)' }}>
            <Heart className="h-5 w-5" />
            Health Information
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                Blood Group
              </label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-card dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select blood group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <Input
              label="Allergies"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              placeholder="e.g., Peanuts, Dust"
              helperText="Separate multiple allergies with commas"
            />
            <Input
              label="Medications"
              value={formData.medications}
              onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
              placeholder="e.g., Inhaler (as needed)"
              helperText="List any current medications"
            />
            <Input
              label="Emergency Contact Name"
              value={formData.emergencyContact}
              onChange={(e) => {
                const capitalized = capitalizeWords(e.target.value);
                setFormData({ ...formData, emergencyContact: capitalized });
                if (errors.emergencyContact) {
                  setErrors({ ...errors, emergencyContact: undefined });
                }
              }}
              error={errors.emergencyContact}
            />
            <Input
              label="Emergency Contact Phone"
              type="tel"
              value={formData.emergencyContactPhone}
              onChange={(e) => {
                setFormData({ ...formData, emergencyContactPhone: e.target.value });
                if (errors.emergencyContactPhone) {
                  setErrors({ ...errors, emergencyContactPhone: undefined });
                }
              }}
              error={errors.emergencyContactPhone}
            />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                Medical Notes
              </label>
              <textarea
                value={formData.medicalNotes}
                onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-card dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional medical information or notes..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || isAdmitting || !isFormValid()}
          >
            {isLoading || isAdmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Submit Application
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
