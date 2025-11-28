import { useMemo } from 'react';
import { useGetStaffListQuery, useGetClassesQuery } from '@/lib/store/api/schoolAdminApi';

interface UseClassTeachersParams {
  schoolId: string | undefined;
  isPrimary: boolean;
  showAssignTeacher: boolean;
  classData: any; // Class data to check existing assignments
}

interface UseClassTeachersReturn {
  teachers: any[];
  allTeachers: any[];
  isLoading: boolean;
}

/**
 * Hook to manage class teachers with filtering logic
 * Separates business logic for teacher filtering from UI components
 * For PRIMARY schools: excludes teachers already assigned to other classes
 * For SECONDARY/TERTIARY: shows all teachers (can be assigned to multiple classes)
 */
export function useClassTeachers({
  schoolId,
  isPrimary,
  showAssignTeacher,
  classData,
}: UseClassTeachersParams): UseClassTeachersReturn {
  // Get staff list for teacher assignment - filter by role 'Teacher' to get only teachers
  const { data: staffResponse, isLoading: isLoadingTeachers } = useGetStaffListQuery(
    { limit: 100, role: 'Teacher' },
    { skip: !showAssignTeacher }
  );

  // Get all PRIMARY classes to check teacher assignments (only for PRIMARY schools)
  const { data: primaryClassesResponse } = useGetClassesQuery(
    { schoolId: schoolId!, type: 'PRIMARY' },
    { skip: !schoolId || !isPrimary || !showAssignTeacher }
  );

  // Filter staff list to only include teachers (type === 'teacher')
  // This is a safety check since we're already filtering by role, but ensures we only get teachers
  const allTeachers = useMemo(() => {
    const staffItems = staffResponse?.data?.items || [];
    return staffItems.filter((staff) => staff.type === 'teacher');
  }, [staffResponse]);

  const primaryClasses = primaryClassesResponse?.data || [];

  // Filter teachers for PRIMARY schools: exclude those already assigned to other PRIMARY classes
  // For SECONDARY/TERTIARY: teachers can handle multiple subjects/courses, so show all teachers
  const teachers = useMemo(() => {
    // For SECONDARY/TERTIARY, return all teachers immediately (no filtering needed)
    // Teachers can be assigned to multiple classes (one per subject/course)
    if (!isPrimary) {
      return allTeachers;
    }

    // For PRIMARY schools, we need to filter out teachers already assigned to other classes
    // If primary classes data is still loading, return empty array to prevent showing all teachers
    // (which would allow selecting a teacher that's already assigned)
    if (isPrimary && primaryClassesResponse === undefined) {
      return []; // Still loading, return empty
    }

    // Get all teacher IDs that are already assigned to other PRIMARY classes
    const assignedTeacherIds = new Set<string>();
    primaryClasses.forEach((cls: any) => {
      // Skip the current class
      if (cls.id === classData?.id) {
        return;
      }
      
      // Collect teacher IDs from this class
      if (cls.teachers && Array.isArray(cls.teachers)) {
        cls.teachers.forEach((teacher: any) => {
          if (teacher.id) {
            assignedTeacherIds.add(teacher.id);
          }
        });
      }
    });

    // Filter out teachers that are already assigned to other classes
    return allTeachers.filter((teacher) => !assignedTeacherIds.has(teacher.id));
  }, [allTeachers, isPrimary, primaryClasses, primaryClassesResponse, classData?.id]);

  return {
    teachers,
    allTeachers,
    isLoading: isLoadingTeachers,
  };
}

