import { useMemo, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useGetMySchoolQuery, useGetMyStudentSchoolQuery, useGetMyTeacherSchoolQuery } from '@/lib/store/api/schoolAdminApi';
import type { SchoolType } from '@/lib/store/api/schoolAdminApi';

export interface SchoolTypeInfo {
  hasPrimary: boolean;
  hasSecondary: boolean;
  hasTertiary: boolean;
  isMixed: boolean;
  availableTypes: SchoolType[];
  primaryType: SchoolType | 'MIXED';
  currentType: SchoolType | null;
  setCurrentType: (type: SchoolType) => void;
}

/**
 * Hook to get school type information and manage current type selection
 * For mixed schools, allows switching between types
 * Works for school admins, students, and teachers
 */
export function useSchoolType(): SchoolTypeInfo {
  const user = useSelector((state: RootState) => state.auth.user);
  
  // Use appropriate endpoint based on user role
  const { data: schoolAdminResponse } = useGetMySchoolQuery(undefined, {
    skip: user?.role !== 'SCHOOL_ADMIN',
  });
  const { data: studentSchoolResponse } = useGetMyStudentSchoolQuery(undefined, {
    skip: user?.role !== 'STUDENT',
  });
  const { data: teacherSchoolResponse } = useGetMyTeacherSchoolQuery(undefined, {
    skip: user?.role !== 'TEACHER',
  });
  
  // Get school from appropriate response
  const school = useMemo(() => {
    if (user?.role === 'STUDENT') return studentSchoolResponse?.data;
    if (user?.role === 'TEACHER') return teacherSchoolResponse?.data;
    return schoolAdminResponse?.data;
  }, [user?.role, studentSchoolResponse, teacherSchoolResponse, schoolAdminResponse]);
    
  const [currentType, setCurrentTypeState] = useState<SchoolType | null>(null);

  // Get school type context from school data
  const schoolType = useMemo(() => {
    if (!school) {
      return {
        hasPrimary: false,
        hasSecondary: false,
        hasTertiary: false,
        isMixed: false,
        availableTypes: [] as SchoolType[],
        primaryType: 'PRIMARY' as SchoolType | 'MIXED',
      };
    }

    // Use schoolType from API if available, otherwise compute from flags
    if (school.schoolType) {
      return school.schoolType;
    }

    // Fallback: compute from flags
    const availableTypes: SchoolType[] = [];
    if (school.hasPrimary) availableTypes.push('PRIMARY');
    if (school.hasSecondary) availableTypes.push('SECONDARY');
    if (school.hasTertiary) availableTypes.push('TERTIARY');

    const isMixed = availableTypes.length > 1;
    const primaryType: SchoolType | 'MIXED' = 
      isMixed ? 'MIXED' : (availableTypes[0] || 'PRIMARY');

    return {
      hasPrimary: school.hasPrimary,
      hasSecondary: school.hasSecondary,
      hasTertiary: school.hasTertiary,
      isMixed,
      availableTypes,
      primaryType,
    };
  }, [school]);

  // Initialize and sync current type from localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || schoolType.availableTypes.length === 0) {
      return;
    }

    const stored = localStorage.getItem('selectedSchoolType');
    if (stored && schoolType.availableTypes.includes(stored as SchoolType)) {
      setCurrentTypeState(stored as SchoolType);
    } else {
      // Default to first available type or primary type
      const defaultType = schoolType.availableTypes.length > 0
        ? schoolType.availableTypes[0]
        : (schoolType.primaryType !== 'MIXED' ? schoolType.primaryType : null);
      if (defaultType) {
        setCurrentTypeState(defaultType);
        localStorage.setItem('selectedSchoolType', defaultType);
      }
    }
  }, [schoolType]);

  // Listen for type changes from other components
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleTypeChange = () => {
      const stored = localStorage.getItem('selectedSchoolType');
      if (stored && schoolType.availableTypes.includes(stored as SchoolType)) {
        setCurrentTypeState(stored as SchoolType);
      }
    };

    window.addEventListener('schoolTypeChanged', handleTypeChange);
    return () => window.removeEventListener('schoolTypeChanged', handleTypeChange);
  }, [schoolType]);

  // Set current type
  const setCurrentType = (type: SchoolType) => {
    if (typeof window !== 'undefined' && schoolType.availableTypes.includes(type)) {
      localStorage.setItem('selectedSchoolType', type);
      setCurrentTypeState(type);
      window.dispatchEvent(new Event('schoolTypeChanged'));
    }
  };

  return {
    ...schoolType,
    currentType,
    setCurrentType,
  };
}

