'use client';

import { useState, useMemo, useCallback } from 'react';
import { Calendar as RBCalendar, View, SlotInfo, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { CustomToolbar } from '@/components/calendar/CustomToolbar';
import { CustomEvent } from '@/components/calendar/CustomEvent';
import { CompactEventCard } from '@/components/calendar/CompactEventCard';
import { DayEventsModal } from '@/components/modals/DayEventsModal';
import {
  useGetMyStudentSchoolQuery,
  useGetMyStudentClassesQuery,
  useGetActiveSessionQuery,
  useGetSessionsQuery,
  useGetEventsQuery,
  useGetUpcomingEventsQuery,
  useGetTimetableForClassQuery,
  useGetTimetableForClassArmQuery,
  type CalendarEvent,
  type CalendarEventType,
  type AcademicSession,
  type Term,
} from '@/lib/store/api/schoolAdminApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import { Calendar as CalendarIcon } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Create date-fns localizer
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEventWithType {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  type: CalendarEventType | 'TIMETABLE' | 'SESSION_START' | 'SESSION_END' | 'TERM_START' | 'TERM_END' | 'HALF_TERM';
  schoolType?: string;
  location?: string;
  roomId?: string;
  roomName?: string;
  schoolId: string;
  createdBy?: string;
  isAllDay: boolean;
  createdAt: string;
  updatedAt: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  description?: string;
}

export default function StudentCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('month');
  const [showDayEventsModal, setShowDayEventsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get student's school and classes
  const { data: schoolResponse } = useGetMyStudentSchoolQuery();
  const { data: classesResponse } = useGetMyStudentClassesQuery();
  const schoolId = schoolResponse?.data?.id;
  const classes = classesResponse?.data || [];
  const classData = useMemo(() => classes[0] || null, [classes]);
  const { currentType } = useSchoolType();

  const { data: activeSessionResponse } = useGetActiveSessionQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );
  const activeSession = activeSessionResponse?.data;

  // Get all sessions to display session/term milestones
  const { data: sessionsResponse } = useGetSessionsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );
  const allSessions = sessionsResponse?.data || [];

  // Calculate date range for events query
  const dateRange = useMemo(() => {
    const date = new Date(currentDate);
    if (view === 'week') {
      const start = startOfWeek(date, { locale: enUS });
      const end = addDays(start, 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (view === 'day') {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    // Month view
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [currentDate, view]);

  // Get events (includes admin-created and teacher-created events)
  const { data: eventsResponse } = useGetEventsQuery(
    {
      schoolId: schoolId!,
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString(),
      schoolType: currentType || undefined,
    },
    { skip: !schoolId }
  );

  const { data: upcomingEventsResponse } = useGetUpcomingEventsQuery(
    { schoolId: schoolId!, days: 7, schoolType: currentType || undefined },
    { skip: !schoolId }
  );

  const events = eventsResponse?.data || [];
  const upcomingEvents = upcomingEventsResponse?.data || [];

  // Get student's class timetable
  const { data: classTimetableResponse } = useGetTimetableForClassQuery(
    {
      schoolId: schoolId!,
      classId: classData?.id!,
      termId: activeSession?.term?.id || '',
    },
    { skip: !schoolId || !classData?.id || !activeSession?.term?.id }
  );

  const classArmId = classData?.classArmId || classData?.enrollment?.classArmId;
  const { data: classArmTimetableResponse } = useGetTimetableForClassArmQuery(
    {
      schoolId: schoolId!,
      classArmId: classArmId!,
      termId: activeSession?.term?.id || '',
    },
    { skip: !schoolId || !classArmId || !activeSession?.term?.id }
  );

  // Combine class and classArm timetables
  const timetable = useMemo(() => {
    const classPeriods = classTimetableResponse?.data || [];
    const classArmPeriods = classArmTimetableResponse?.data || [];
    const allPeriods = [...classPeriods, ...classArmPeriods];
    return Array.from(new Map(allPeriods.map((p: any) => [p.id, p])).values());
  }, [classTimetableResponse, classArmTimetableResponse]);

  // Combine events, timetable periods, and session/term milestones into calendar events
  const calendarEvents = useMemo<CalendarEventWithType[]>(() => {
    const combined: CalendarEventWithType[] = [];

    // Add one-off events (admin-created and teacher-created)
    events.forEach((event) => {
      combined.push({
        ...event,
        start: new Date(event.startDate),
        end: new Date(event.endDate),
        type: event.type as CalendarEventType,
        allDay: event.isAllDay,
        description: event.description,
      });
    });

    // Add session and term milestones
    allSessions.forEach((session: AcademicSession) => {
      // Session start
      combined.push({
        id: `session-start-${session.id}`,
        title: `Session Start: ${session.name}`,
        startDate: new Date(session.startDate).toISOString(),
        endDate: new Date(session.startDate).toISOString(),
        type: 'SESSION_START' as const,
        schoolId: schoolId!,
        isAllDay: true,
        createdAt: session.createdAt,
        updatedAt: session.createdAt,
        start: new Date(session.startDate),
        end: new Date(session.startDate),
        allDay: true,
      });

      // Session end
      combined.push({
        id: `session-end-${session.id}`,
        title: `Session End: ${session.name}`,
        startDate: new Date(session.endDate).toISOString(),
        endDate: new Date(session.endDate).toISOString(),
        type: 'SESSION_END' as const,
        schoolId: schoolId!,
        isAllDay: true,
        createdAt: session.createdAt,
        updatedAt: session.createdAt,
        start: new Date(session.endDate),
        end: new Date(session.endDate),
        allDay: true,
      });

      // Term milestones
      session.terms.forEach((term: Term) => {
        // Term start
        combined.push({
          id: `term-start-${term.id}`,
          title: `Term Start: ${term.name}`,
          startDate: new Date(term.startDate).toISOString(),
          endDate: new Date(term.startDate).toISOString(),
          type: 'TERM_START' as const,
          schoolId: schoolId!,
          isAllDay: true,
          createdAt: term.createdAt,
          updatedAt: term.createdAt,
          start: new Date(term.startDate),
          end: new Date(term.startDate),
          allDay: true,
        });

        // Term end
        combined.push({
          id: `term-end-${term.id}`,
          title: `Term End: ${term.name}`,
          startDate: new Date(term.endDate).toISOString(),
          endDate: new Date(term.endDate).toISOString(),
          type: 'TERM_END' as const,
          schoolId: schoolId!,
          isAllDay: true,
          createdAt: term.createdAt,
          updatedAt: term.createdAt,
          start: new Date(term.endDate),
          end: new Date(term.endDate),
          allDay: true,
        });

        // Half-term break (if exists)
        if (term.halfTermStart && term.halfTermEnd) {
          combined.push({
            id: `half-term-${term.id}`,
            title: `Half-Term Break: ${term.name}`,
            startDate: new Date(term.halfTermStart).toISOString(),
            endDate: new Date(term.halfTermEnd).toISOString(),
            type: 'HALF_TERM' as const,
            schoolId: schoolId!,
            isAllDay: true,
            createdAt: term.createdAt,
            updatedAt: term.createdAt,
            start: new Date(term.halfTermStart),
            end: new Date(term.halfTermEnd),
            allDay: true,
          });
        }
      });
    });

    // Add recurring timetable periods (for current week/month)
    if (activeSession?.term && timetable.length > 0) {
      timetable.forEach((period: any) => {
        // Convert dayOfWeek and time to actual dates for the current view range
        const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const dayIndex = dayNames.indexOf(period.dayOfWeek);

        // Get all dates for this day in the current view range
        const dates: Date[] = [];
        let current = new Date(dateRange.start);
        while (current <= dateRange.end) {
          if (current.getDay() === dayIndex) {
            dates.push(new Date(current));
          }
          current = addDays(current, 1);
        }

        dates.forEach((date) => {
          const [startHour, startMin] = period.startTime.split(':').map(Number);
          const [endHour, endMin] = period.endTime.split(':').map(Number);

          const start = new Date(date);
          start.setHours(startHour, startMin, 0, 0);

          const end = new Date(date);
          end.setHours(endHour, endMin, 0, 0);

          // Create title based on school type
          let title = '';
          if (currentType === 'PRIMARY') {
            title = period.classArmName || 'Timetable Period';
          } else if (currentType === 'SECONDARY') {
            title = period.subjectName && period.classArmName 
              ? `${period.subjectName} - ${period.classArmName}`
              : period.subjectName || period.classArmName || 'Timetable Period';
          } else if (currentType === 'TERTIARY') {
            title = period.courseName || 'Timetable Period';
          } else {
            title = 'Timetable Period';
          }

          combined.push({
            id: `timetable-${period.id}-${date.toISOString()}`,
            title,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            type: 'TIMETABLE' as const,
            location: period.roomName,
            roomName: period.roomName,
            schoolId: schoolId!,
            isAllDay: false,
            createdAt: period.createdAt ? new Date(period.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: period.createdAt ? new Date(period.createdAt).toISOString() : new Date().toISOString(),
            start,
            end,
          });
        });
      });
    }

    return combined;
  }, [events, timetable, dateRange, activeSession, schoolId, allSessions, currentType]);

  // Filter events for the selected date
  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return calendarEvents.filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      return (
        (eventStart >= startOfDay && eventStart <= endOfDay) ||
        (eventEnd >= startOfDay && eventEnd <= endOfDay) ||
        (eventStart <= startOfDay && eventEnd >= endOfDay)
      );
    }).map((event) => ({
      id: event.id,
      title: event.title,
      startDate: new Date(event.start),
      endDate: new Date(event.end),
      type: event.type,
      location: event.location,
      roomName: event.roomName,
      isAllDay: event.isAllDay || false,
      description: event.description,
    }));
  }, [calendarEvents, selectedDate]);

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    // In month view, clicking on a date cell shows day events
    if (view === 'month') {
      const clickedDate = new Date(slotInfo.start);
      clickedDate.setHours(0, 0, 0, 0);
      setSelectedDate(clickedDate);
      setShowDayEventsModal(true);
    }
  }, [view]);

  const eventStyleGetter = (event: CalendarEventWithType) => {
    const colors: Record<string, { backgroundColor: string; borderColor: string; color: string }> = {
      ACADEMIC: {
        backgroundColor: '#dbeafe',
        borderColor: '#3b82f6',
        color: '#1e40af',
      },
      EVENT: {
        backgroundColor: '#dcfce7',
        borderColor: '#10b981',
        color: '#065f46',
      },
      EXAM: {
        backgroundColor: '#fee2e2',
        borderColor: '#ef4444',
        color: '#991b1b',
      },
      MEETING: {
        backgroundColor: '#f3e8ff',
        borderColor: '#a855f7',
        color: '#6b21a8',
      },
      HOLIDAY: {
        backgroundColor: '#f3f4f6',
        borderColor: '#6b7280',
        color: '#374151',
      },
      TIMETABLE: {
        backgroundColor: '#e0e7ff',
        borderColor: '#6366f1',
        color: '#312e81',
      },
      SESSION_START: {
        backgroundColor: '#fef3c7',
        borderColor: '#f59e0b',
        color: '#92400e',
      },
      SESSION_END: {
        backgroundColor: '#fee2e2',
        borderColor: '#dc2626',
        color: '#991b1b',
      },
      TERM_START: {
        backgroundColor: '#d1fae5',
        borderColor: '#10b981',
        color: '#065f46',
      },
      TERM_END: {
        backgroundColor: '#fce7f3',
        borderColor: '#ec4899',
        color: '#9f1239',
      },
      HALF_TERM: {
        backgroundColor: '#fef3c7',
        borderColor: '#f59e0b',
        color: '#92400e',
      },
    };

    const style = colors[event.type] || colors.EVENT;
    return {
      style: {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        color: style.color,
        borderWidth: event.type?.includes('SESSION') || event.type?.includes('TERM') ? '3px' : '2px',
        borderRadius: '4px',
        fontWeight: event.type?.includes('SESSION') || event.type?.includes('TERM') ? '600' : 'normal',
      },
    };
  };

  return (
    <ProtectedRoute roles={['STUDENT']}>
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
            School Calendar
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            View school events, your timetable, and academic milestones
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Calendar Area (3/4 width) */}
          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              <div style={{ height: '600px' }}>
                <RBCalendar
                  localizer={localizer as any}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  view={view}
                  onView={setView}
                  date={currentDate}
                  onNavigate={setCurrentDate}
                  components={{
                    toolbar: CustomToolbar,
                    event: CustomEvent,
                  }}
                  onSelectSlot={handleSelectSlot}
                  selectable
                  eventPropGetter={eventStyleGetter}
                  className="rbc-custom-calendar"
                />
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events Sidebar (1/4 width) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    No upcoming events
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <CompactEventCard
                      key={event.id}
                      id={event.id}
                      title={event.title}
                      startDate={new Date(event.startDate)}
                      endDate={new Date(event.endDate)}
                      type={event.type}
                      location={event.location}
                      roomName={event.roomName}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Day Events Modal */}
        {selectedDate && (
          <DayEventsModal
            isOpen={showDayEventsModal}
            onClose={() => {
              setShowDayEventsModal(false);
              setSelectedDate(null);
            }}
            date={selectedDate}
            events={dayEvents}
            onAddEvent={() => {}} // Students can't create events
          />
        )}
      </div>

      <style jsx global>{`
        .rbc-custom-calendar {
          color: var(--light-text-primary);
        }
        .rbc-custom-calendar .rbc-header {
          border-bottom: 1px solid var(--light-border);
          padding: 10px 3px;
          font-weight: 600;
        }
        .rbc-custom-calendar .rbc-day-bg {
          border-color: var(--light-border);
        }
        .rbc-custom-calendar .rbc-today {
          background-color: #e0f2fe;
        }
        .rbc-custom-calendar .rbc-off-range-bg {
          background-color: var(--light-surface);
        }
        .rbc-custom-calendar .rbc-event {
          padding: 2px 5px;
          border-radius: 4px;
          font-size: 0.85rem;
        }
        .rbc-custom-calendar .rbc-event-label {
          font-size: 0.75rem;
        }
        .rbc-custom-calendar .rbc-time-slot {
          border-top-color: var(--light-border);
        }
        .rbc-custom-calendar .rbc-time-header-content {
          border-left-color: var(--light-border);
        }
        .rbc-custom-calendar .rbc-day-slot .rbc-time-slot {
          border-top-color: var(--light-border);
        }
        .rbc-custom-calendar .rbc-time-content {
          border-top-color: var(--light-border);
        }
        .rbc-custom-calendar .rbc-time-header {
          border-bottom-color: var(--light-border);
        }
        .rbc-custom-calendar .rbc-toolbar button {
          color: var(--light-text-primary);
          border-color: var(--light-border);
        }
        .rbc-custom-calendar .rbc-toolbar button:hover {
          background-color: var(--light-surface);
        }
        .rbc-custom-calendar .rbc-toolbar button.rbc-active {
          background-color: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }
      `}</style>
    </ProtectedRoute>
  );
}

