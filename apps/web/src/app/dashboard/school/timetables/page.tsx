'use client';

import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { motion } from 'framer-motion';
import {
  Clock,
  Plus,
  Search,
  BookOpen,
  Users,
  Loader2,
  AlertCircle,
  X,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import {
  useGetMySchoolQuery,
  useGetActiveSessionQuery,
  useGetSessionsQuery,
  useGetClassArmsQuery,
  useGetTimetableForClassArmQuery,
  useCreateTimetablePeriodMutation,
  useUpdateTimetablePeriodMutation,
  useDeleteTimetablePeriodMutation,
  useGetSubjectsQuery,
  useGetRoomsQuery,
  useGetStaffListQuery,
  useCreateMasterScheduleMutation,
  type TimetablePeriod,
  type ClassArm,
  type Subject,
  type Room,
  type DayOfWeek,
  type PeriodType,
} from '@/lib/store/api/schoolAdminApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import toast from 'react-hot-toast';

const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

export default function TimetablesPage() {
  const [selectedClassArmId, setSelectedClassArmId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<{
    periodId?: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');

  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;
  const { currentType } = useSchoolType();

  const { data: activeSessionResponse } = useGetActiveSessionQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );

  const { data: sessionsResponse } = useGetSessionsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );

  const { data: classArmsResponse } = useGetClassArmsQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId }
  );

  const { data: timetableResponse, refetch: refetchTimetable } = useGetTimetableForClassArmQuery(
    {
      schoolId: schoolId!,
      classArmId: selectedClassArmId,
      termId: selectedTermId,
    },
    { skip: !schoolId || !selectedClassArmId || !selectedTermId }
  );

  const { data: subjectsResponse } = useGetSubjectsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
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
  const [createMasterSchedule, { isLoading: isCreatingMaster }] = useCreateMasterScheduleMutation();

  const classArms = classArmsResponse?.data || [];
  const subjects = subjectsResponse?.data || [];
  const rooms = roomsResponse?.data || [];
  const teachers = staffResponse?.data?.items || [];
  const timetable = timetableResponse?.data || [];

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

  // Group periods by day and time
  const timetableGrid = useMemo(() => {
    const grid: Record<string, Record<string, TimetablePeriod>> = {};

    timetable.forEach((period) => {
      if (!grid[period.dayOfWeek]) {
        grid[period.dayOfWeek] = {};
      }
      grid[period.dayOfWeek][period.startTime] = period;
    });

    return grid;
  }, [timetable]);

  // Get unique time slots
  const timeSlots = useMemo(() => {
    const times = new Set<string>();
    timetable.forEach((period) => {
      times.add(period.startTime);
    });
    return Array.from(times).sort();
  }, [timetable]);

  const selectedClassArm = classArms.find((ca) => ca.id === selectedClassArmId);
  const selectedTerm = allTerms.find((t) => t.id === selectedTermId);

  const handlePeriodClick = (dayOfWeek: DayOfWeek, startTime: string, endTime: string) => {
    const existingPeriod = timetableGrid[dayOfWeek]?.[startTime];
    if (existingPeriod) {
      setSelectedPeriod({
        periodId: existingPeriod.id,
        dayOfWeek,
        startTime,
        endTime,
      });
      setSelectedSubjectId(existingPeriod.subjectId || '');
      setSelectedTeacherId(existingPeriod.teacherId || '');
      setSelectedRoomId(existingPeriod.roomId || '');
    } else {
      setSelectedPeriod({
        dayOfWeek,
        startTime,
        endTime,
      });
      setSelectedSubjectId('');
      setSelectedTeacherId('');
      setSelectedRoomId('');
    }
    setShowAssignDialog(true);
  };

  const handleSavePeriod = async () => {
    if (!schoolId || !selectedClassArmId || !selectedTermId || !selectedPeriod) return;

    try {
      if (selectedPeriod.periodId) {
        // Update existing period
        await updatePeriod({
          schoolId,
          periodId: selectedPeriod.periodId,
          data: {
            subjectId: selectedSubjectId || undefined,
            teacherId: selectedTeacherId || undefined,
            roomId: selectedRoomId || undefined,
          },
        }).unwrap();
        toast.success('Period updated successfully');
      } else {
        // Create new period
        await createPeriod({
          schoolId,
          data: {
            dayOfWeek: selectedPeriod.dayOfWeek,
            startTime: selectedPeriod.startTime,
            endTime: selectedPeriod.endTime,
            type: 'LESSON' as PeriodType,
            subjectId: selectedSubjectId || undefined,
            teacherId: selectedTeacherId || undefined,
            roomId: selectedRoomId || undefined,
            classArmId: selectedClassArmId,
            termId: selectedTermId,
          },
        }).unwrap();
        toast.success('Period created successfully');
      }
      setShowAssignDialog(false);
      refetchTimetable();
    } catch (error: any) {
      if (error?.status === 409) {
        toast.error(error?.data?.message || 'Conflict detected: Teacher or room already booked');
      } else {
        toast.error(error?.data?.message || 'Failed to save period');
      }
    }
  };

  const handleDeletePeriod = async () => {
    if (!schoolId || !selectedPeriod?.periodId) return;

    try {
      await deletePeriod({
        schoolId,
        periodId: selectedPeriod.periodId,
      }).unwrap();
      toast.success('Period deleted successfully');
      setShowAssignDialog(false);
      refetchTimetable();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete period');
    }
  };

  const handleCreateMasterSchedule = async () => {
    if (!schoolId || !selectedTermId) {
      toast.error('Please select a term first');
      return;
    }

    // Default periods (8:00 AM to 3:00 PM, 1 hour each)
    const periods = [];
    for (let hour = 8; hour < 15; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      for (const day of DAYS) {
        periods.push({
          dayOfWeek: day,
          startTime,
          endTime,
          type: 'LESSON' as PeriodType,
        });
      }
    }

    try {
      const result = await createMasterSchedule({
        schoolId,
        data: {
          termId: selectedTermId,
          periods,
        },
      }).unwrap();
      toast.success(`Master schedule created: ${result.data.created} periods created, ${result.data.skipped} skipped`);
      refetchTimetable();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create master schedule');
    }
  };

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
                Manage class schedules and timetables
              </p>
            </div>
            {selectedTermId && (
              <Button
                variant="primary"
                onClick={handleCreateMasterSchedule}
                disabled={isCreatingMaster}
              >
                {isCreatingMaster ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Master Schedule
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                  Select Term
                </label>
                <select
                  value={selectedTermId}
                  onChange={(e) => {
                    setSelectedTermId(e.target.value);
                    setSelectedClassArmId('');
                  }}
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
              <div>
                <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                  Select Class Arm
                </label>
                <select
                  value={selectedClassArmId}
                  onChange={(e) => setSelectedClassArmId(e.target.value)}
                  disabled={!selectedTermId}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-surface disabled:opacity-50"
                >
                  <option value="">Select a class arm...</option>
                  {classArms.map((arm) => (
                    <option key={arm.id} value={arm.id}>
                      {arm.classLevelName} - {arm.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedClassArm && selectedTerm && (
                <div className="flex items-end">
                  <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    <p>
                      <strong>{selectedClassArm.classLevelName} {selectedClassArm.name}</strong>
                    </p>
                    <p>{selectedTerm.sessionName} - {selectedTerm.name}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timetable Grid */}
        {selectedClassArmId && selectedTermId ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                {selectedClassArm?.classLevelName} {selectedClassArm?.name} - {selectedTerm?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeSlots.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                  <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                    No timetable periods found. Create a master schedule to get started.
                  </p>
                  <Button onClick={handleCreateMasterSchedule} disabled={isCreatingMaster}>
                    Create Master Schedule
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary border-b border-light-border dark:border-dark-border">
                          Time
                        </th>
                        {DAYS.map((day) => (
                          <th
                            key={day}
                            className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary border-b border-light-border dark:border-dark-border"
                          >
                            {DAY_LABELS[day]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((time) => {
                        const [hour, minute] = time.split(':');
                        const displayTime = `${parseInt(hour) % 12 || 12}:${minute} ${parseInt(hour) >= 12 ? 'PM' : 'AM'}`;
                        const endTime = timetable.find((p) => p.startTime === time)?.endTime || '';
                        const [endHour, endMinute] = endTime.split(':');
                        const displayEndTime = endTime
                          ? `${parseInt(endHour) % 12 || 12}:${endMinute} ${parseInt(endHour) >= 12 ? 'PM' : 'AM'}`
                          : '';

                        return (
                          <tr key={time} className="border-b border-light-border dark:border-dark-border">
                            <td className="py-3 px-4 text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                              {displayTime}
                              {displayEndTime && ` - ${displayEndTime}`}
                            </td>
                            {DAYS.map((day) => {
                              const period = timetableGrid[day]?.[time];
                              return (
                                <td
                                  key={day}
                                  className="py-2 px-4"
                                  onClick={() => handlePeriodClick(day, time, endTime || time)}
                                >
                                  {period ? (
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                                      <p className="text-xs font-semibold text-light-text-primary dark:text-dark-text-primary">
                                        {period.subjectName || 'No Subject'}
                                      </p>
                                      {period.teacherName && (
                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                          {period.teacherName}
                                        </p>
                                      )}
                                      {period.roomName && (
                                        <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                                          {period.roomName}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="p-2 text-light-text-muted dark:text-dark-text-muted text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface rounded transition-colors">
                                      Click to assign
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Select a term and class arm to view or edit the timetable
              </p>
            </CardContent>
          </Card>
        )}

        {/* Assign Period Dialog */}
        {showAssignDialog && selectedPeriod && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-dark-surface rounded-lg p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                  {selectedPeriod.periodId ? 'Edit Period' : 'Assign Period'}
                </h3>
                <button
                  onClick={() => setShowAssignDialog(false)}
                  className="text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                    Day: {DAY_LABELS[selectedPeriod.dayOfWeek]}
                  </label>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Time: {selectedPeriod.startTime} - {selectedPeriod.endTime}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                    Subject
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-surface"
                  >
                    <option value="">Select subject...</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                    Teacher
                  </label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-surface"
                  >
                    <option value="">Select teacher...</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.firstName} {teacher.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                    Room
                  </label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-surface"
                  >
                    <option value="">Select room...</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} {room.code && `(${room.code})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="primary"
                    onClick={handleSavePeriod}
                    disabled={isCreating || isUpdating}
                    className="flex-1"
                  >
                    {isCreating || isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                  {selectedPeriod.periodId && (
                    <Button
                      variant="ghost"
                      onClick={handleDeletePeriod}
                      disabled={isDeleting}
                      className="text-red-600 hover:text-red-700"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Delete'
                      )}
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setShowAssignDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
