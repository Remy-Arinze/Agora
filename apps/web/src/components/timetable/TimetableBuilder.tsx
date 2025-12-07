'use client';

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Clock, GripVertical, X, Loader2 } from 'lucide-react';
import {
  type TimetablePeriod,
  type DayOfWeek,
  type PeriodType,
} from '@/lib/store/api/schoolAdminApi';
import { getScheduleForSchoolType, getLessonPeriods, type SchedulePeriod } from '@/lib/utils/nigerianSchoolSchedule';

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

interface DraggableSubject {
  id: string;
  name: string;
  code?: string;
  type: 'subject' | 'course' | 'free';
}

export interface TimetableSlot {
  dayOfWeek: DayOfWeek;
  period: { startTime: string; endTime: string; type: string };
  periodData?: TimetablePeriod;
}

interface TimetableBuilderProps {
  schoolType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
  subjects: DraggableSubject[];
  courses: DraggableSubject[];
  timetable: TimetablePeriod[];
  classArmId: string;
  termId: string;
  onPeriodUpdate: (slot: TimetableSlot, subjectId?: string, courseId?: string) => Promise<void>;
  onPeriodDelete: (periodId: string) => Promise<void>;
  isLoading?: boolean;
  readOnly?: boolean; // If true, disable drag-and-drop and editing
}

// Draggable Subject/Course Item
function DraggableItem({ item }: { item: DraggableSubject }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 p-3 border rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        item.type === 'free'
          ? 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
          : 'bg-white dark:bg-dark-surface border-light-border dark:border-dark-border'
      }`}
    >
      <GripVertical className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
      <div className="flex-1">
        <p className={`text-sm font-medium ${
          item.type === 'free'
            ? 'text-gray-700 dark:text-gray-300'
            : 'text-light-text-primary dark:text-dark-text-primary'
        }`}>
          {item.name}
        </p>
        {item.code && (
          <p className="text-xs text-light-text-muted dark:text-dark-text-muted">{item.code}</p>
        )}
      </div>
    </div>
  );
}

// Timetable Grid Cell (Droppable)
function TimetableCell({
  slot,
  onCellClick,
  readOnly = false,
}: {
  slot: TimetableSlot;
  onCellClick: () => void;
  readOnly?: boolean;
}) {
  const { period, periodData } = slot;
  const slotId = `${slot.dayOfWeek}-${period.startTime}`;
  
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    disabled: period.type !== 'LESSON' || readOnly,
  });

  // Skip rendering for non-lesson periods (breaks, lunch, assembly)
  if (period.type !== 'LESSON') {
    return null; // Will be handled in parent row
  }

  return (
    <td
      ref={setNodeRef}
      onClick={readOnly ? undefined : onCellClick}
      className={`py-4 px-4 min-w-[140px] ${readOnly ? '' : 'cursor-pointer'} transition-colors ${
        isOver && !readOnly
          ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 border-dashed'
          : periodData
            ? readOnly 
              ? 'bg-blue-50 dark:bg-blue-900/30'
              : 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
            : readOnly
              ? 'bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border'
              : 'bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-surface/80 border border-light-border dark:border-dark-border'
      }`}
    >
      {periodData ? (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
            {periodData.subjectName || periodData.courseName || 'Free Period'}
          </p>
          {periodData.teacherName && (
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              {periodData.teacherName}
            </p>
          )}
          {periodData.roomName && (
            <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
              {periodData.roomName}
            </p>
          )}
        </div>
      ) : (
        <div className="text-sm text-light-text-muted dark:text-dark-text-muted text-center py-3">
          {readOnly ? '' : 'Drop here'}
        </div>
      )}
    </td>
  );
}

export function TimetableBuilder({
  schoolType,
  subjects,
  courses,
  timetable,
  classArmId,
  termId,
  onPeriodUpdate,
  onPeriodDelete,
  isLoading = false,
  readOnly = false,
}: TimetableBuilderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const schedule = useMemo(() => getScheduleForSchoolType(schoolType), [schoolType]);
  const lessonPeriods = useMemo(() => getLessonPeriods(schedule), [schedule]);

  // Get items based on school type, including "Free Period"
  const draggableItems = useMemo(() => {
    const freePeriod: DraggableSubject = {
      id: 'FREE_PERIOD',
      name: 'Free Period',
      type: 'free',
    };
    
    let items: DraggableSubject[];
    if (schoolType === 'TERTIARY') {
      items = courses;
    } else {
      items = subjects;
    }
    
    return [freePeriod, ...items];
  }, [schoolType, subjects, courses]);

  // Create timetable grid - index by day and startTime
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

  // Get all unique time periods from timetable data (sorted by start time)
  // ONLY include periods that exist in the database - don't add from schedule template
  const allTimePeriods = useMemo(() => {
    const timeSet = new Set<string>();
    
    // Only add periods from the database (timetable)
    timetable.forEach((period) => {
      timeSet.add(`${period.startTime}-${period.endTime}`);
    });
    
    return Array.from(timeSet)
      .map((timeStr) => {
        const [startTime, endTime] = timeStr.split('-');
        return { startTime, endTime };
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timetable]);

  // Create slots for the grid - based on actual timetable periods
  const slots = useMemo(() => {
    const allSlots: TimetableSlot[] = [];
    allTimePeriods.forEach((timePeriod) => {
      DAYS.forEach((day) => {
        const periodData = timetableGrid[day]?.[timePeriod.startTime];
        if (periodData) {
          allSlots.push({
            dayOfWeek: day,
            period: {
              startTime: timePeriod.startTime,
              endTime: timePeriod.endTime,
              type: periodData.type || 'LESSON',
            },
            periodData,
          });
        }
      });
    });
    return allSlots;
  }, [allTimePeriods, timetableGrid]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const draggedItem = draggableItems.find((item) => item.id === active.id);
    if (!draggedItem) return;

    // Parse the drop target ID (format: "DAY-STARTTIME")
    const overId = over.id as string;
    const [dayOfWeek, startTime] = overId.split('-');

    // Find the slot that was dropped on
    const slot = slots.find(
      (s) => s.dayOfWeek === dayOfWeek && s.period.startTime === startTime
    );

    if (slot && slot.period.type === 'LESSON') {
      // Handle "Free Period" - create period without subject/course
      if (draggedItem.id === 'FREE_PERIOD') {
        await onPeriodUpdate(slot, undefined, undefined);
      } else if (schoolType === 'TERTIARY') {
        await onPeriodUpdate(slot, undefined, draggedItem.id);
      } else {
        await onPeriodUpdate(slot, draggedItem.id, undefined);
      }
    }
  };

  const activeItem = activeId ? draggableItems.find((item) => item.id === activeId) : null;

  // If read-only, render without DndContext and without sidebar
  if (readOnly) {
    return (
      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Timetable</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-light-text-muted dark:text-dark-text-muted" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary border-b-2 border-light-border dark:border-dark-border">
                        Time
                      </th>
                      {DAYS.map((day) => (
                        <th
                          key={day}
                          className="text-left py-4 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary border-b-2 border-light-border dark:border-dark-border"
                        >
                          {DAY_LABELS[day]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border dark:divide-dark-border">
                    {allTimePeriods.map((timePeriod) => {
                      // Check if this is a break/lunch/assembly period (no lesson periods for this time)
                      const hasLessons = DAYS.some((day) => {
                        const period = timetableGrid[day]?.[timePeriod.startTime];
                        return period && period.type === 'LESSON';
                      });
                      
                      // Check if there are database periods of break/lunch/assembly type at this time
                      // ONLY show break/lunch/assembly if they exist in the database
                      const dbBreakPeriods = timetable.filter(
                        (p) => p.startTime === timePeriod.startTime && 
                               p.endTime === timePeriod.endTime && 
                               p.type !== 'LESSON'
                      );

                      // Determine the break type from database only
                      const breakType = dbBreakPeriods.length > 0 ? dbBreakPeriods[0].type : null;
                      
                      const breakLabel = breakType === 'BREAK' ? 'Break' : 
                                        breakType === 'LUNCH' ? 'Lunch' : 
                                        breakType === 'ASSEMBLY' ? 'Assembly' : 
                                        'Break';

                      // Only show break/lunch/assembly row if it exists in the database
                      if (dbBreakPeriods.length > 0 && !hasLessons) {
                        return (
                          <tr key={`${timePeriod.startTime}-${breakType || 'break'}`}>
                            <td className="py-4 px-4 text-sm font-medium text-light-text-primary dark:text-dark-text-primary whitespace-nowrap">
                              <span>{timePeriod.startTime} - {timePeriod.endTime}</span>
                            </td>
                            <td
                              colSpan={DAYS.length}
                              className="py-4 px-4 text-center text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary bg-gray-50 dark:bg-dark-surface/50"
                            >
                              {breakLabel}
                            </td>
                          </tr>
                        );
                      }

                      // Handle lesson periods
                      return (
                        <tr key={timePeriod.startTime}>
                          <td className="py-4 px-4 text-sm font-medium text-light-text-primary dark:text-dark-text-primary whitespace-nowrap">
                            <span>{timePeriod.startTime} - {timePeriod.endTime}</span>
                          </td>
                          {DAYS.map((day) => {
                            const periodData = timetableGrid[day]?.[timePeriod.startTime];
                            const slot: TimetableSlot = {
                              dayOfWeek: day,
                              period: {
                                startTime: timePeriod.startTime,
                                endTime: timePeriod.endTime,
                                type: periodData?.type || 'LESSON',
                              },
                              periodData,
                            };

                            return (
                              <TimetableCell
                                key={`${day}-${timePeriod.startTime}`}
                                slot={slot}
                                onCellClick={() => {}}
                                readOnly={readOnly}
                              />
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
      </div>
    );
  }

  // Editable mode with drag-and-drop
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-12 gap-4">
        {/* Sidebar with draggable subjects/courses */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {schoolType === 'TERTIARY' ? 'Courses' : 'Subjects'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SortableContext items={draggableItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {draggableItems.length === 0 ? (
                    <p className="text-sm text-light-text-muted dark:text-dark-text-muted text-center py-4">
                      No {schoolType === 'TERTIARY' ? 'courses' : 'subjects'} available
                    </p>
                  ) : (
                    draggableItems.map((item) => (
                      <DraggableItem key={item.id} item={item} />
                    ))
                  )}
                </div>
              </SortableContext>
            </CardContent>
          </Card>
        </div>

        {/* Timetable Grid */}
        <div className="col-span-9">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timetable</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-light-text-muted dark:text-dark-text-muted" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary border-b-2 border-light-border dark:border-dark-border">
                          Time
                        </th>
                        {DAYS.map((day) => (
                          <th
                            key={day}
                            className="text-left py-4 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary border-b-2 border-light-border dark:border-dark-border"
                          >
                            {DAY_LABELS[day]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border dark:divide-dark-border">
                      {allTimePeriods.map((timePeriod) => {
                        // Check if this is a break/lunch/assembly period (no lesson periods for this time)
                        const hasLessons = DAYS.some((day) => {
                          const period = timetableGrid[day]?.[timePeriod.startTime];
                          return period && period.type === 'LESSON';
                        });
                        
                        // Check if there are database periods of break/lunch/assembly type at this time
                        // ONLY show break/lunch/assembly if they exist in the database
                        const dbBreakPeriods = timetable.filter(
                          (p) => p.startTime === timePeriod.startTime && 
                                 p.endTime === timePeriod.endTime && 
                                 p.type !== 'LESSON'
                        );

                        // Determine the break type from database only
                        const breakType = dbBreakPeriods.length > 0 ? dbBreakPeriods[0].type : null;
                        
                        const breakLabel = breakType === 'BREAK' ? 'Break' : 
                                          breakType === 'LUNCH' ? 'Lunch' : 
                                          breakType === 'ASSEMBLY' ? 'Assembly' : 
                                          'Break';

                        // Only show break/lunch/assembly row if it exists in the database
                        if (dbBreakPeriods.length > 0 && !hasLessons) {
                          return (
                            <tr key={`${timePeriod.startTime}-${breakType || 'break'}`}>
                              <td className="py-4 px-4 text-sm font-medium text-light-text-primary dark:text-dark-text-primary whitespace-nowrap">
                                <span>{timePeriod.startTime} - {timePeriod.endTime}</span>
                              </td>
                              <td
                                colSpan={DAYS.length}
                                className="py-4 px-4 text-center text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary bg-gray-50 dark:bg-dark-surface/50"
                              >
                                {breakLabel}
                              </td>
                            </tr>
                          );
                        }

                        // Handle lesson periods
                        return (
                          <tr key={timePeriod.startTime}>
                            <td className="py-4 px-4 text-sm font-medium text-light-text-primary dark:text-dark-text-primary whitespace-nowrap">
                              <span>{timePeriod.startTime} - {timePeriod.endTime}</span>
                            </td>
                            {DAYS.map((day) => {
                              const periodData = timetableGrid[day]?.[timePeriod.startTime];
                              const slot: TimetableSlot = {
                                dayOfWeek: day,
                                period: {
                                  startTime: timePeriod.startTime,
                                  endTime: timePeriod.endTime,
                                  type: periodData?.type || 'LESSON',
                                },
                                periodData,
                              };

                              return (
                                <TimetableCell
                                  key={`${day}-${timePeriod.startTime}`}
                                  slot={slot}
                                  onCellClick={() => {
                                    // Cell click handler (no time editing)
                                  }}
                                  readOnly={readOnly}
                                />
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
        </div>
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="p-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg shadow-lg">
            <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
              {activeItem.name}
            </p>
          </div>
        ) : null}
      </DragOverlay>

    </DndContext>
  );
}

