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
import { CreateEventModal } from '@/components/modals/CreateEventModal';
import {
  useGetMySchoolQuery,
  useGetActiveSessionQuery,
  useGetSessionsQuery,
  useGetEventsQuery,
  useGetUpcomingEventsQuery,
  useCreateEventMutation,
  useGetTimetableForClassArmQuery,
  useGetClassArmsQuery,
  useGetRoomsQuery,
  type CalendarEvent,
  type CalendarEventType,
  type AcademicSession,
  type Term,
} from '@/lib/store/api/schoolAdminApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import toast from 'react-hot-toast';
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
  allDay?: boolean; // For react-big-calendar all-day event support
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('month');
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | undefined>();

  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;
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

  const { data: classArmsResponse } = useGetClassArmsQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId }
  );

  const { data: roomsResponse } = useGetRoomsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );

  const [createEvent, { isLoading: isCreatingEvent }] = useCreateEventMutation();

  const events = eventsResponse?.data || [];
  const upcomingEvents = upcomingEventsResponse?.data || [];
  const classArms = classArmsResponse?.data || [];
  const rooms = roomsResponse?.data || [];

  // Get timetable periods for all class arms (for recurring slots)
  const timetableQueries = classArms.map((arm) =>
    useGetTimetableForClassArmQuery(
      {
        schoolId: schoolId!,
        classArmId: arm.id,
        termId: activeSession?.term?.id || '',
      },
      { skip: !schoolId || !activeSession?.term?.id }
    )
  );

  // Combine events, timetable periods, and session/term milestones into calendar events
  const calendarEvents = useMemo<CalendarEventWithType[]>(() => {
    const combined: CalendarEventWithType[] = [];

    // Add one-off events
    events.forEach((event) => {
      combined.push({
        ...event,
        start: new Date(event.startDate),
        end: new Date(event.endDate),
        type: event.type as CalendarEventType,
        allDay: event.isAllDay,
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
    if (activeSession?.term) {
      timetableQueries.forEach((query, index) => {
        const periods = query.data?.data || [];
        const classArm = classArms[index];

            periods.forEach((period) => {
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

                combined.push({
                  id: `timetable-${period.id}-${date.toISOString()}`,
                  title: period.subjectName || period.classArmName || 'Timetable Period',
                  startDate: start.toISOString(),
                  endDate: end.toISOString(),
                  type: 'TIMETABLE' as const,
                  location: period.roomName,
                  roomName: period.roomName,
                  schoolId: schoolId!,
                  isAllDay: false,
                  createdAt: period.createdAt,
                  updatedAt: period.createdAt,
                  start,
                  end,
                });
              });
            });
      });
    }

    return combined;
  }, [events, timetableQueries, classArms, dateRange, activeSession, schoolId, allSessions]);

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setSelectedSlot({ start: slotInfo.start, end: slotInfo.end });
    setShowCreateEventModal(true);
  }, []);

  const handleCreateEvent = async (data: {
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    type: CalendarEventType;
    location?: string;
    roomId?: string;
    isAllDay: boolean;
  }) => {
    if (!schoolId) {
      toast.error('School not found');
      return;
    }

    try {
      await createEvent({
        schoolId,
        data: {
          ...data,
          schoolType: currentType || undefined,
        },
      }).unwrap();
      toast.success('Event created successfully');
      setShowCreateEventModal(false);
      setSelectedSlot(undefined);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create event');
    }
  };

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
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
            Calendar
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Unified schedule: Timetable slots and one-off events
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

        {/* Create Event Modal */}
        <CreateEventModal
          isOpen={showCreateEventModal}
          onClose={() => {
            setShowCreateEventModal(false);
            setSelectedSlot(undefined);
          }}
          onSubmit={handleCreateEvent}
          selectedSlot={selectedSlot}
          rooms={rooms}
          isLoading={isCreatingEvent}
          currentSchoolType={currentType}
        />
      </div>

      <style jsx global>{`
        .rbc-custom-calendar {
          color: var(--light-text-primary);
        }
        .rbc-custom-calendar .rbc-header {
          border-bottom: 1px solid #e5e7eb;
          padding: 8px;
          font-weight: 600;
          color: var(--light-text-primary);
        }
        .rbc-custom-calendar .rbc-day-bg {
          border-color: #e5e7eb;
        }
        .rbc-custom-calendar .rbc-time-slot {
          border-top-color: #e5e7eb;
        }
        .rbc-custom-calendar .rbc-time-header-gutter {
          border-right-color: #e5e7eb;
        }
        .rbc-custom-calendar .rbc-time-content {
          border-top-color: #e5e7eb;
        }
        .rbc-custom-calendar .rbc-time-gutter {
          border-right-color: #e5e7eb;
        }
        .rbc-custom-calendar .rbc-day-slot .rbc-time-slot {
          border-top-color: #f3f4f6;
        }
        .rbc-custom-calendar .rbc-today {
          background-color: #dbeafe !important;
        }
        .rbc-custom-calendar .rbc-today .rbc-day-bg {
          background-color: #dbeafe !important;
        }
        .rbc-custom-calendar .rbc-current-time-indicator {
          background-color: #2563eb;
        }
        .rbc-custom-calendar .rbc-off-range-bg {
          background-color: #f9fafb;
        }
        .rbc-custom-calendar .rbc-off-range {
          color: #9ca3af;
        }
        .dark .rbc-custom-calendar {
          color: var(--dark-text-primary);
        }
        .dark .rbc-custom-calendar .rbc-header {
          border-bottom-color: #374151;
          color: var(--dark-text-primary);
        }
        .dark .rbc-custom-calendar .rbc-day-bg {
          border-color: #374151;
        }
        .dark .rbc-custom-calendar .rbc-time-slot {
          border-top-color: #374151;
        }
        .dark .rbc-custom-calendar .rbc-time-header-gutter {
          border-right-color: #374151;
        }
        .dark .rbc-custom-calendar .rbc-time-content {
          border-top-color: #374151;
        }
        .dark .rbc-custom-calendar .rbc-time-gutter {
          border-right-color: #374151;
        }
        .dark .rbc-custom-calendar .rbc-day-slot .rbc-time-slot {
          border-top-color: #1f2937;
        }
        .dark .rbc-custom-calendar .rbc-today {
          background-color: #1e3a8a !important;
        }
        .dark .rbc-custom-calendar .rbc-today .rbc-day-bg {
          background-color: #1e3a8a !important;
        }
        .dark .rbc-custom-calendar .rbc-current-time-indicator {
          background-color: #3b82f6;
        }
        .dark .rbc-custom-calendar .rbc-off-range-bg {
          background-color: #111827;
        }
        .dark .rbc-custom-calendar .rbc-off-range {
          color: #6b7280;
        }
      `}</style>
    </ProtectedRoute>
  );
}
