'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Clock, MapPin, Users, BookOpen, ChevronDown, AlertTriangle } from 'lucide-react';
import type { TimetablePeriod } from '@/lib/store/api/schoolAdminApi';
import { getTerminology } from '@/lib/utils/terminology';

interface TeacherTimetableGridProps {
  timetable: TimetablePeriod[];
  schoolType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
  isLoading?: boolean;
  // Optional term selector props
  allTerms?: Array<{ id: string; name: string; sessionName: string }>;
  selectedTermId?: string;
  onTermChange?: (termId: string) => void;
  activeTermId?: string;
  terminology?: {
    periodSingular: string;
  };
}

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

const PERIOD_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  LESSON: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  BREAK: {
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
  },
  LUNCH: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  ASSEMBLY: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
};

export function TeacherTimetableGrid({ 
  timetable, 
  schoolType, 
  isLoading,
  allTerms,
  selectedTermId,
  onTermChange,
  activeTermId,
  terminology: terminologyProp,
}: TeacherTimetableGridProps) {
  // Use provided terminology or calculate from school type
  const terminology = terminologyProp || getTerminology(schoolType) || {
    courses: 'Classes',
    courseSingular: 'Class',
    staff: 'Teachers',
    staffSingular: 'Teacher',
    periods: 'Terms',
    periodSingular: 'Term',
    subjects: 'Subjects',
    subjectSingular: 'Subject',
  };

  // Get all unique time slots from timetable
  const allTimeSlots = useMemo(() => {
    const slots = new Set<string>();
    timetable.forEach((period) => {
      slots.add(`${period.startTime}-${period.endTime}`);
    });
    return Array.from(slots).sort();
  }, [timetable]);

  // Group periods by day and time
  const timetableByDay = useMemo(() => {
    const grouped: Record<string, Record<string, TimetablePeriod[]>> = {};
    
    DAYS.forEach((day) => {
      grouped[day] = {};
      allTimeSlots.forEach((slot) => {
        grouped[day][slot] = [];
      });
    });

    timetable.forEach((period) => {
      const slot = `${period.startTime}-${period.endTime}`;
      if (grouped[period.dayOfWeek] && grouped[period.dayOfWeek][slot]) {
        grouped[period.dayOfWeek][slot].push(period);
      }
    });

    return grouped;
  }, [timetable, allTimeSlots]);

  // Get current day
  const currentDay = useMemo(() => {
    const today = new Date().getDay();
    const dayMap: Record<number, string> = {
      0: 'SUNDAY',
      1: 'MONDAY',
      2: 'TUESDAY',
      3: 'WEDNESDAY',
      4: 'THURSDAY',
      5: 'FRIDAY',
      6: 'SATURDAY',
    };
    return dayMap[today];
  }, []);

  // Format period display text based on school type
  const getPeriodDisplay = (period: TimetablePeriod) => {
    if (period.type !== 'LESSON') {
      return {
        title: period.type,
        subtitle: '',
        classInfo: '',
      };
    }

    if (schoolType === 'TERTIARY') {
      return {
        title: period.courseName || 'Course',
        subtitle: period.roomName || '',
        classInfo: '',
      };
    }

    if (schoolType === 'SECONDARY') {
      const subject = period.subjectName || 'Subject';
      const classArm = period.classArmName || period.className || '';
      return {
        title: subject,
        subtitle: classArm,
        classInfo: period.roomName || '',
      };
    }

    // PRIMARY
    const subject = period.subjectName || 'Free Period';
    const className = period.classArmName || period.className || '';
    return {
      title: subject,
      subtitle: className || '',
      classInfo: period.roomName || '',
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Loading timetable...</p>
        </CardContent>
      </Card>
    );
  }

  if (timetable.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
          <p className="text-light-text-secondary dark:text-dark-text-secondary mb-2">
            No timetable periods found for this term.
          </p>
          <p className="text-sm text-light-text-muted dark:text-dark-text-muted">
            Your timetable will appear here once periods are assigned.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Grid View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
              Weekly Timetable
            </CardTitle>
            {/* Term Selector */}
            {allTerms && allTerms.length > 0 && onTermChange && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary whitespace-nowrap">
                  {terminology?.periodSingular || 'Term'}:
                </label>
                <div className="relative">
                  <select
                    value={selectedTermId || ''}
                    onChange={(e) => onTermChange(e.target.value)}
                    className="px-4 py-2 pr-10 border border-light-border dark:border-dark-border rounded-lg bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                  >
                    {allTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name} ({term.sessionName})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-light-text-muted dark:text-dark-text-muted pointer-events-none" />
                </div>
                {activeTermId && activeTermId === selectedTermId && (
                  <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded whitespace-nowrap">
                    Active
                  </span>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary border-b border-light-border dark:border-dark-border sticky left-0 bg-light-bg dark:bg-dark-bg z-10">
                    Time
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      className={`text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary border-b border-light-border dark:border-dark-border ${
                        day === currentDay ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      {DAY_LABELS[day]}
                      {day === currentDay && (
                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Today)</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTimeSlots.map((slot, slotIndex) => {
                  const [startTime, endTime] = slot.split('-');
                  return (
                    <tr key={slot} className="border-b border-light-border dark:border-dark-border">
                      <td className="py-3 px-4 text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary sticky left-0 bg-light-bg dark:bg-dark-bg z-10">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {startTime} - {endTime}
                          </span>
                        </div>
                      </td>
                      {DAYS.map((day) => {
                        const periods = timetableByDay[day]?.[slot] || [];
                        return (
                          <td
                            key={day}
                            className={`py-2 px-4 ${
                              day === currentDay ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                            }`}
                          >
                            {periods.length > 0 ? (
                              <div className="space-y-2">
                                {periods.map((period) => {
                                  const display = getPeriodDisplay(period);
                                  const colors = PERIOD_TYPE_COLORS[period.type] || PERIOD_TYPE_COLORS.LESSON;
                                  const hasConflict = period.hasConflict || false;
                                  const isFromCourseRegistration = period.isFromCourseRegistration || false;
                                  
                                  return (
                                    <div
                                      key={period.id}
                                      className={`p-3 rounded-lg border ${
                                        hasConflict
                                          ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
                                          : `${colors.bg} ${colors.border} ${colors.text}`
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <div className="font-semibold text-sm flex-1">{display.title}</div>
                                        {hasConflict && (
                                          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                                        )}
                                        {isFromCourseRegistration && (
                                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded flex-shrink-0">
                                            CO
                                          </span>
                                        )}
                                      </div>
                                      {display.subtitle && (
                                        <div className="text-xs opacity-80 mb-1">{display.subtitle}</div>
                                      )}
                                      {hasConflict && period.conflictMessage && (
                                        <div className="text-xs text-red-600 dark:text-red-400 mt-1 mb-1 font-medium">
                                          {period.conflictMessage}
                                        </div>
                                      )}
                                      {display.classInfo && (
                                        <div className="flex items-center gap-1 text-xs opacity-70 mt-2">
                                          <MapPin className="h-3 w-3" />
                                          {display.classInfo}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-xs text-light-text-muted dark:text-dark-text-muted text-center py-2">
                                Free
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
        </CardContent>
      </Card>

      {/* Day-by-Day View (Mobile-friendly) */}
      <div className="block md:hidden space-y-4">
        {DAYS.map((day) => {
          const dayPeriods = timetable.filter((p) => p.dayOfWeek === day);
          if (dayPeriods.length === 0) return null;

          return (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                  {DAY_LABELS[day]}
                  {day === currentDay && (
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                      Today
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dayPeriods
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((period) => {
                      const display = getPeriodDisplay(period);
                      const colors = PERIOD_TYPE_COLORS[period.type] || PERIOD_TYPE_COLORS.LESSON;
                      return (
                        <div
                          key={period.id}
                          className={`p-4 rounded-lg border ${colors.bg} ${colors.border} ${colors.text}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-sm mb-1">{display.title}</div>
                              {display.subtitle && (
                                <div className="text-xs opacity-80 mb-1">{display.subtitle}</div>
                              )}
                            </div>
                            <div className="text-xs font-medium">
                              {period.startTime} - {period.endTime}
                            </div>
                          </div>
                          {display.classInfo && (
                            <div className="flex items-center gap-1 text-xs opacity-70 mt-2">
                              <MapPin className="h-3 w-3" />
                              {display.classInfo}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

