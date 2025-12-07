'use client';

import { useState, useMemo, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import {
  Clock,
  Plus,
  Loader2,
  AlertCircle,
  BookOpen,
  Calendar,
  Edit,
  Trash2,
  MousePointerClick,
  GripVertical,
} from 'lucide-react';
import {
  useGetMySchoolQuery,
  useGetActiveSessionQuery,
  useGetSessionsQuery,
  useGetClassesQuery,
  useGetTimetableForClassQuery,
  useGetTimetablesForSchoolTypeQuery,
  useCreateTimetablePeriodMutation,
  useUpdateTimetablePeriodMutation,
  useDeleteTimetablePeriodMutation,
  useDeleteTimetableForClassMutation,
  useGetSubjectsQuery,
  useGetCoursesQuery,
  useGetRoomsQuery,
  useGetStaffListQuery,
  useCreateMasterScheduleMutation,
  type TimetablePeriod,
  type Class,
  type DayOfWeek,
  type PeriodType,
} from '@/lib/store/api/schoolAdminApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import { TimetableBuilder } from '@/components/timetable/TimetableBuilder';
import { EditableTimetableTable } from '@/components/timetable/EditableTimetableTable';
import { getScheduleForSchoolType } from '@/lib/utils/nigerianSchoolSchedule';
import { ConfirmModal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TimetablesPage() {
  const router = useRouter();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTimetableClassId, setNewTimetableClassId] = useState<string>('');
  const [newTimetableTermId, setNewTimetableTermId] = useState<string>('');

  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;
  const { currentType } = useSchoolType();

  const { data: activeSessionResponse } = useGetActiveSessionQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId }
  );

  const { data: sessionsResponse } = useGetSessionsQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId }
  );

  // Get classes filtered by school type (same as courses page)
  const { data: classesResponse } = useGetClassesQuery(
    { schoolId: schoolId!, type: currentType || undefined },
    { skip: !schoolId }
  );

  // Get all timetables for current school type
  const { data: timetablesResponse, refetch: refetchTimetables } = useGetTimetablesForSchoolTypeQuery(
    {
      schoolId: schoolId!,
      schoolType: currentType || undefined,
      termId: selectedTermId || undefined,
    },
    { skip: !schoolId }
  );

  // Get timetable for selected class
  const { data: timetableResponse, refetch: refetchTimetable, isLoading: isLoadingTimetable } = useGetTimetableForClassQuery(
    {
      schoolId: schoolId!,
      classId: selectedClassId,
      termId: selectedTermId,
    },
    { skip: !schoolId || !selectedClassId || !selectedTermId }
  );

  const { data: subjectsResponse } = useGetSubjectsQuery(
    {
      schoolId: schoolId!,
      schoolType: currentType || undefined,
    },
    { skip: !schoolId }
  );

  const { data: coursesResponse } = useGetCoursesQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId || currentType !== 'TERTIARY' }
  );

  const { data: roomsResponse } = useGetRoomsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );

  const { data: staffResponse } = useGetStaffListQuery(
    { role: 'teacher', limit: 100 },
    { skip: !schoolId }
  );

  const [createPeriod, { isLoading: isCreating }] = useCreateTimetablePeriodMutation();
  const [updatePeriod, { isLoading: isUpdating }] = useUpdateTimetablePeriodMutation();
  const [deletePeriod, { isLoading: isDeleting }] = useDeleteTimetablePeriodMutation();
  const [deleteTimetable, { isLoading: isDeletingTimetable }] = useDeleteTimetableForClassMutation();
  const [createMasterSchedule, { isLoading: isCreatingMaster }] = useCreateMasterScheduleMutation();
  
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ classId: string; className: string; termId: string } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const classes = classesResponse?.data || [];
  const subjects = subjectsResponse?.data || [];
  const courses = coursesResponse?.data || [];
  const rooms = roomsResponse?.data || [];
  const teachers = staffResponse?.data?.items || [];
  const timetable = timetableResponse?.data || [];
  const timetablesByClass = timetablesResponse?.data || {};

  // Get all terms from sessions
  const allTerms = useMemo(() => {
    if (!sessionsResponse?.data) return [];
    return sessionsResponse.data.flatMap((session) =>
      session.terms.map((term) => ({
        ...term,
        sessionName: session.name,
      }))
    );
  }, [sessionsResponse]);

  // Auto-select active term if available, reset when school type changes
  useEffect(() => {
    if (activeSessionResponse?.data?.term?.id) {
      setSelectedTermId(activeSessionResponse.data.term.id);
    } else {
      setSelectedTermId('');
    }
    // Also reset selected class when school type changes
    setSelectedClassId('');
  }, [activeSessionResponse, currentType]);

  const handleCreateTimetable = async () => {
    if (!schoolId || !newTimetableClassId || !newTimetableTermId) {
      toast.error('Please select a class and term');
      return;
    }

    // Check if subjects are available for the school type (before creating)
    // This is a synchronous check, so we'll validate in the UI instead

    // Use Nigerian school schedule based on school type
    const schedule = getScheduleForSchoolType(currentType);
    const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    const periods = schedule.periods
      .filter((p) => p.type === 'LESSON')
      .flatMap((period) =>
        DAYS.map((day) => ({
          dayOfWeek: day,
          startTime: period.startTime,
          endTime: period.endTime,
          type: 'LESSON' as PeriodType,
        }))
      );

    try {
      // Create master schedule for the selected class
      // Note: We'll need to update createMasterSchedule to support classId
      // For now, we'll create periods directly
      for (const periodDef of periods) {
        await createPeriod({
          schoolId,
          data: {
            ...periodDef,
            classId: newTimetableClassId,
            termId: newTimetableTermId,
          },
        }).unwrap();
      }

      toast.success('Timetable created successfully');
      setShowCreateModal(false);
      setNewTimetableClassId('');
      setNewTimetableTermId('');
      refetchTimetables();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create timetable');
    }
  };

  const handlePeriodUpdate = async (
    slot: { dayOfWeek: DayOfWeek; period: { startTime: string; endTime: string; type: string }; periodData?: TimetablePeriod },
    subjectId?: string,
    courseId?: string,
    startTime?: string,
    endTime?: string
  ) => {
    if (!schoolId || !selectedClassId || !selectedTermId) return;

    try {
      if (slot.periodData) {
        // For Free Period, explicitly pass null to clear the subject/course
        // undefined means "don't change", null means "clear it"
        const isFreeperiod = subjectId === undefined && courseId === undefined;
        
        await updatePeriod({
          schoolId,
          periodId: slot.periodData.id,
          data: {
            subjectId: currentType !== 'TERTIARY' 
              ? (isFreeperiod ? null : subjectId) 
              : undefined,
            courseId: currentType === 'TERTIARY' 
              ? (isFreeperiod ? null : courseId) 
              : undefined,
            teacherId: slot.periodData.teacherId || undefined,
            roomId: slot.periodData.roomId || undefined,
            startTime: slot.periodData.startTime,
            endTime: slot.periodData.endTime,
          },
        }).unwrap();
        toast.success('Period updated successfully');
      } else {
        await createPeriod({
          schoolId,
          data: {
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.period.startTime,
            endTime: slot.period.endTime,
            type: slot.period.type as PeriodType,
            subjectId: currentType !== 'TERTIARY' ? subjectId : undefined,
            courseId: currentType === 'TERTIARY' ? courseId : undefined,
            classId: selectedClassId,
            termId: selectedTermId,
          },
        }).unwrap();
        toast.success('Period created successfully');
      }
      // Refetch to update the UI with new times
      await refetchTimetable();
      refetchTimetables();
    } catch (error: any) {
      if (error?.status === 409) {
        toast.error(error?.data?.message || 'Conflict detected: Teacher or room already booked');
      } else {
        toast.error(error?.data?.message || 'Failed to save period');
      }
    }
  };

  const handlePeriodDelete = async (periodId: string) => {
    if (!schoolId) return;
    try {
      await deletePeriod({ schoolId, periodId }).unwrap();
      toast.success('Period deleted successfully');
      refetchTimetable();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete period');
    }
  };

  const handleAutoGenerate = async (generatedPeriods: Array<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    type: 'LESSON' | 'BREAK' | 'LUNCH' | 'ASSEMBLY';
    subjectId?: string;
    subjectName?: string;
    courseId?: string;
    courseName?: string;
  }>) => {
    if (!schoolId || !selectedClassId || !selectedTermId) return;

    try {
      // Create a map of existing periods with their IDs for updates
      const existingMap = new Map<string, TimetablePeriod>();
      timetable.forEach((period) => {
        const key = `${period.dayOfWeek}-${period.startTime}-${period.endTime}`;
        existingMap.set(key, period);
      });

      let createdCount = 0;
      let updatedCount = 0;
      
      for (const period of generatedPeriods) {
        const key = `${period.dayOfWeek}-${period.startTime}-${period.endTime}`;
        const existingPeriod = existingMap.get(key);
        
        if (existingPeriod) {
          // Period exists - check if we need to update it
          const existingHasSubject = existingPeriod.subjectId || existingPeriod.courseId;
          const newHasSubject = period.subjectId || period.courseId;
          
          // Only update if:
          // 1. Existing period has no subject (is a free period) AND new period has a subject
          // 2. Or it's a break/lunch/assembly type update
          if ((!existingHasSubject && newHasSubject) || period.type !== 'LESSON') {
            await updatePeriod({
              schoolId,
              periodId: existingPeriod.id,
              data: {
                type: period.type as PeriodType,
                subjectId: currentType !== 'TERTIARY' ? period.subjectId : undefined,
                courseId: currentType === 'TERTIARY' ? period.courseId : undefined,
              },
            }).unwrap();
            updatedCount++;
          }
        } else {
          // Period doesn't exist - create new one
          await createPeriod({
            schoolId,
            data: {
              dayOfWeek: period.dayOfWeek,
              startTime: period.startTime,
              endTime: period.endTime,
              type: period.type as PeriodType,
              subjectId: currentType !== 'TERTIARY' ? period.subjectId : undefined,
              courseId: currentType === 'TERTIARY' ? period.courseId : undefined,
              classId: selectedClassId,
              termId: selectedTermId,
            },
          }).unwrap();
          createdCount++;
        }
      }

      const totalChanges = createdCount + updatedCount;
      if (totalChanges > 0) {
        toast.success(`Timetable generated! ${createdCount} created, ${updatedCount} updated.`);
      } else {
        toast.success('Timetable is already up to date!');
      }
      await refetchTimetable();
      refetchTimetables();
    } catch (error: any) {
      if (error?.status === 409) {
        toast.error(error?.data?.message || 'Conflict detected');
      } else {
        toast.error(error?.data?.message || 'Failed to generate timetable');
      }
    }
  };

  const handleDeleteTimetable = async () => {
    if (!schoolId || !deleteConfirmModal) return;
    try {
      await deleteTimetable({
        schoolId,
        classId: deleteConfirmModal.classId,
        termId: deleteConfirmModal.termId,
      }).unwrap();
      toast.success('Timetable deleted successfully');
      setDeleteConfirmModal(null);
      setSelectedClassId('');
      refetchTimetables();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete timetable');
    }
  };

  const handleBulkSave = async (periods: Array<{
    id?: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    subjectId?: string;
    courseId?: string;
    type: 'LESSON' | 'BREAK' | 'LUNCH' | 'ASSEMBLY';
  }>) => {
    if (!schoolId || !selectedClassId || !selectedTermId) return;

    try {
      // Get all existing period IDs
      const existingPeriodIds = new Set(timetable.map((p) => p.id));
      const updatedPeriodIds = new Set(periods.filter((p) => p.id).map((p) => p.id!));

      // Delete periods that are no longer in the edited list
      const periodsToDelete = timetable.filter((p) => !updatedPeriodIds.has(p.id));
      for (const period of periodsToDelete) {
        await deletePeriod({ schoolId, periodId: period.id }).unwrap();
      }

      // Update or create periods
      for (const period of periods) {
        if (period.id && existingPeriodIds.has(period.id)) {
          // Update existing period
          await updatePeriod({
            schoolId,
            periodId: period.id,
            data: {
              subjectId: currentType !== 'TERTIARY' ? period.subjectId : undefined,
              courseId: currentType === 'TERTIARY' ? period.courseId : undefined,
              startTime: period.startTime,
              endTime: period.endTime,
              dayOfWeek: period.dayOfWeek,
              type: period.type as PeriodType,
            },
          }).unwrap();
        } else {
          // Create new period
          await createPeriod({
            schoolId,
            data: {
              dayOfWeek: period.dayOfWeek,
              startTime: period.startTime,
              endTime: period.endTime,
              type: period.type as PeriodType,
              subjectId: currentType !== 'TERTIARY' ? period.subjectId : undefined,
              courseId: currentType === 'TERTIARY' ? period.courseId : undefined,
              classId: selectedClassId,
              termId: selectedTermId,
            },
          }).unwrap();
        }
      }

      toast.success('Timetable updated successfully');
      setIsEditMode(false);
      await refetchTimetable();
      refetchTimetables();
    } catch (error: any) {
      if (error?.status === 409) {
        toast.error(error?.data?.message || 'Conflict detected: Teacher or room already booked');
      } else {
        toast.error(error?.data?.message || 'Failed to save timetable');
      }
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedTerm = allTerms.find((t) => t.id === selectedTermId);

  // Get classes that have timetables
  const classesWithTimetables = useMemo(() => {
    return classes.filter((cls) => {
      const classTimetable = timetablesByClass[cls.id];
      return classTimetable && classTimetable.length > 0;
    });
  }, [classes, timetablesByClass]);

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                Timetables
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Manage class schedules and timetables for {currentType || 'all school types'}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Timetable
            </Button>
          </div>
        </motion.div>

        {/* Timetables List */}
        {selectedTermId ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {classesWithTimetables.map((cls) => {
              const classTimetable = timetablesByClass[cls.id] || [];
              return (
                <Card
                  key={cls.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    // Toggle: if already selected, deselect it
                    if (selectedClassId === cls.id) {
                      setSelectedClassId('');
                    } else {
                      setSelectedClassId(cls.id);
                      if (!selectedTermId && activeSessionResponse?.data?.term?.id) {
                        setSelectedTermId(activeSessionResponse.data.term.id);
                      }
                    }
                  }}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{cls.name}</CardTitle>
                      <BookOpen className="h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        <Clock className="h-4 w-4 mr-2" />
                        {classTimetable.length} periods
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                        <MousePointerClick className="h-3.5 w-3.5" />
                        <span>Click to expand timetable</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClassId(cls.id);
                            if (!selectedTermId && activeSessionResponse?.data?.term?.id) {
                              setSelectedTermId(activeSessionResponse.data.term.id);
                            }
                          }}
                        >
                          View Timetable
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmModal({
                              classId: cls.id,
                              className: cls.name,
                              termId: selectedTermId,
                            });
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
              <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                Select a term to view timetables
              </p>
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-surface"
              >
                <option value="">Select a term...</option>
                {allTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.sessionName} - {term.name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        {/* Timetable Builder for Selected Class */}
        {selectedClassId && selectedTermId && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  Timetable for {selectedClass?.name}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsEditMode(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Timetable
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeleteConfirmModal({
                        classId: selectedClassId,
                        className: selectedClass?.name || '',
                        termId: selectedTermId,
                      });
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Timetable
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/dashboard/school/courses/${selectedClassId}`)}
                  >
                    View Class Details
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTimetable ? (
                <div className="py-12 text-center">
                  <Loader2 className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4 animate-spin" />
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    Loading timetable...
                  </p>
                </div>
              ) : timetable.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                  <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                    No timetable periods found for {selectedClass?.name}.
                  </p>
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Timetable
                  </Button>
                </div>
              ) : (
                <>
                  {/* Drag and drop hint */}
                  <div className="inline-flex items-center gap-2 mb-4 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <GripVertical className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <span className="font-medium">Tip:</span> Drag subjects from the left panel and drop them onto the timetable slots to assign them.
                    </p>
                  </div>
                  <TimetableBuilder
                    schoolType={currentType}
                    subjects={subjects.map((s) => ({ id: s.id, name: s.name, code: s.code, type: 'subject' as const }))}
                    courses={courses.map((c) => ({ id: c.id, name: c.name, code: c.code, type: 'course' as const }))}
                    timetable={timetable}
                    classArmId={''} // Not used when classId is provided
                    termId={selectedTermId}
                    onPeriodUpdate={handlePeriodUpdate}
                    onPeriodDelete={handlePeriodDelete}
                    onAutoGenerate={handleAutoGenerate}
                    isLoading={isCreating || isUpdating || isDeleting}
                  />
                  {isEditMode && (
                    <EditableTimetableTable
                      timetable={timetable}
                      subjects={subjects}
                      courses={courses}
                      schoolType={currentType}
                      onSave={handleBulkSave}
                      onClose={() => setIsEditMode(false)}
                      isLoading={isUpdating}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create Timetable Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-dark-surface rounded-lg p-6 max-w-md w-full mx-4"
            >
              <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
                Create New Timetable
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                    Select Class
                  </label>
                  <select
                    value={newTimetableClassId}
                    onChange={(e) => setNewTimetableClassId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-surface"
                  >
                    <option value="">Select a class...</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                    Select Term
                  </label>
                  <select
                    value={newTimetableTermId}
                    onChange={(e) => setNewTimetableTermId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-surface"
                  >
                    <option value="">Select a term...</option>
                    {allTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.sessionName} - {term.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="primary"
                    onClick={handleCreateTimetable}
                    disabled={isCreatingMaster || !newTimetableClassId || !newTimetableTermId}
                    className="flex-1"
                  >
                    {isCreatingMaster ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={!!deleteConfirmModal}
          onClose={() => setDeleteConfirmModal(null)}
          onConfirm={handleDeleteTimetable}
          title="Delete Timetable"
          message={`Are you sure you want to delete the timetable for ${deleteConfirmModal?.className}? This will remove all ${timetablesByClass[deleteConfirmModal?.classId || '']?.length || 0} periods and cannot be undone.`}
          confirmText="Delete Timetable"
          cancelText="Cancel"
          variant="danger"
          isLoading={isDeletingTimetable}
        />
      </div>
    </ProtectedRoute>
  );
}
