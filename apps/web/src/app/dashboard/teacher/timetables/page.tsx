'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { motion } from 'framer-motion';
import { Clock, Calendar } from 'lucide-react';

// Mock data - will be replaced with API calls later
const timetableData = [
  {
    day: 'Monday',
    periods: [
      { time: '8:00 - 9:00', subject: 'Mathematics', classLevel: 'JSS2', room: 'Room 101' },
      { time: '9:00 - 10:00', subject: 'Mathematics', classLevel: 'SS1', room: 'Room 205' },
      { time: '10:00 - 10:30', subject: 'Break', classLevel: '', room: '' },
      { time: '10:30 - 11:30', subject: 'Mathematics', classLevel: 'SS2', room: 'Room 302' },
      { time: '11:30 - 12:30', subject: 'Free Period', classLevel: '', room: '' },
      { time: '12:30 - 1:30', subject: 'Lunch', classLevel: '', room: '' },
      { time: '1:30 - 2:30', subject: 'Mathematics', classLevel: 'JSS2', room: 'Room 101' },
    ],
  },
  {
    day: 'Tuesday',
    periods: [
      { time: '8:00 - 9:00', subject: 'Mathematics', classLevel: 'SS1', room: 'Room 205' },
      { time: '9:00 - 10:00', subject: 'Mathematics', classLevel: 'JSS2', room: 'Room 101' },
      { time: '10:00 - 10:30', subject: 'Break', classLevel: '', room: '' },
      { time: '10:30 - 11:30', subject: 'Mathematics', classLevel: 'SS2', room: 'Room 302' },
      { time: '11:30 - 12:30', subject: 'Free Period', classLevel: '', room: '' },
      { time: '12:30 - 1:30', subject: 'Lunch', classLevel: '', room: '' },
      { time: '1:30 - 2:30', subject: 'Staff Meeting', classLevel: '', room: 'Staff Room' },
    ],
  },
  {
    day: 'Wednesday',
    periods: [
      { time: '8:00 - 9:00', subject: 'Mathematics', classLevel: 'JSS2', room: 'Room 101' },
      { time: '9:00 - 10:00', subject: 'Mathematics', classLevel: 'SS2', room: 'Room 302' },
      { time: '10:00 - 10:30', subject: 'Break', classLevel: '', room: '' },
      { time: '10:30 - 11:30', subject: 'Mathematics', classLevel: 'SS1', room: 'Room 205' },
      { time: '11:30 - 12:30', subject: 'Free Period', classLevel: '', room: '' },
      { time: '12:30 - 1:30', subject: 'Lunch', classLevel: '', room: '' },
      { time: '1:30 - 2:30', subject: 'Mathematics', classLevel: 'JSS2', room: 'Room 101' },
    ],
  },
  {
    day: 'Thursday',
    periods: [
      { time: '8:00 - 9:00', subject: 'Mathematics', classLevel: 'SS2', room: 'Room 302' },
      { time: '9:00 - 10:00', subject: 'Mathematics', classLevel: 'SS1', room: 'Room 205' },
      { time: '10:00 - 10:30', subject: 'Break', classLevel: '', room: '' },
      { time: '10:30 - 11:30', subject: 'Mathematics', classLevel: 'JSS2', room: 'Room 101' },
      { time: '11:30 - 12:30', subject: 'Free Period', classLevel: '', room: '' },
      { time: '12:30 - 1:30', subject: 'Lunch', classLevel: '', room: '' },
      { time: '1:30 - 2:30', subject: 'Mathematics', classLevel: 'SS2', room: 'Room 302' },
    ],
  },
  {
    day: 'Friday',
    periods: [
      { time: '8:00 - 9:00', subject: 'Mathematics', classLevel: 'JSS2', room: 'Room 101' },
      { time: '9:00 - 10:00', subject: 'Mathematics', classLevel: 'SS1', room: 'Room 205' },
      { time: '10:00 - 10:30', subject: 'Break', classLevel: '', room: '' },
      { time: '10:30 - 11:30', subject: 'Mathematics', classLevel: 'SS2', room: 'Room 302' },
      { time: '11:30 - 12:30', subject: 'Free Period', classLevel: '', room: '' },
      { time: '12:30 - 1:30', subject: 'Lunch', classLevel: '', room: '' },
      { time: '1:30 - 2:30', subject: 'Assembly', classLevel: '', room: 'Hall' },
    ],
  },
];

export default function TeacherTimetablesPage() {
  return (
    <ProtectedRoute roles={['TEACHER']}>
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
            My Timetable
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            View your weekly teaching schedule for the current term
          </p>
        </motion.div>

        {/* Timetable */}
        <div className="space-y-6">
          {timetableData.map((day, dayIndex) => (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dayIndex * 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {day.day}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-light-border dark:border-dark-border">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                            Time
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                            Subject
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                            Class
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                            Room
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.periods.map((period, periodIndex) => (
                          <tr
                            key={periodIndex}
                            className={`border-b border-light-border dark:border-dark-border ${
                              period.subject === 'Break' || period.subject === 'Lunch' || period.subject === 'Assembly' || period.subject === 'Free Period' || period.subject === 'Staff Meeting'
                                ? 'bg-gray-50 dark:bg-dark-surface/50'
                                : 'hover:bg-gray-50 dark:hover:bg-dark-surface/50'
                            }`}
                          >
                            <td className="py-3 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {period.time}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <p className={`text-sm font-medium ${
                                period.subject === 'Break' || period.subject === 'Lunch' || period.subject === 'Assembly' || period.subject === 'Free Period' || period.subject === 'Staff Meeting'
                                  ? 'text-light-text-muted dark:text-dark-text-muted italic'
                                  : 'text-light-text-primary dark:text-dark-text-primary'
                              }`}>
                                {period.subject}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                              {period.classLevel || '-'}
                            </td>
                            <td className="py-3 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                              {period.room || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}

