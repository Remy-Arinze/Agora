'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { motion } from 'framer-motion';
import { Clock, Plus, Search, BookOpen, Users } from 'lucide-react';

// Mock data - will be replaced with API calls later
const mockTimetables = [
  {
    id: '1',
    name: 'JSS1 Timetable',
    level: 'JSS1',
    term: 'First Term',
    academicYear: '2023/2024',
    status: 'active' as const,
  },
  {
    id: '2',
    name: 'JSS2 Timetable',
    level: 'JSS2',
    term: 'First Term',
    academicYear: '2023/2024',
    status: 'active' as const,
  },
  {
    id: '3',
    name: 'SS1 Timetable',
    level: 'SS1',
    term: 'First Term',
    academicYear: '2023/2024',
    status: 'active' as const,
  },
];

const timeSlots = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM'];
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const mockSchedule = [
  { day: 'Monday', time: '8:00 AM', subject: 'Mathematics', teacher: 'Sarah Williams', class: 'JSS1A' },
  { day: 'Monday', time: '9:00 AM', subject: 'English', teacher: 'David Brown', class: 'JSS1A' },
  { day: 'Tuesday', time: '8:00 AM', subject: 'Science', teacher: 'Emily Davis', class: 'JSS1A' },
];

export default function TimetablesPage() {
  const [selectedTimetable, setSelectedTimetable] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTimetables = mockTimetables.filter(
    (timetable) =>
      timetable.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      timetable.level.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Timetable
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Timetables List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                Timetables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                {filteredTimetables.map((timetable) => (
                  <div
                    key={timetable.id}
                    onClick={() => setSelectedTimetable(timetable.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTimetable === timetable.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-dark-surface hover:bg-gray-100 dark:hover:bg-dark-surface/80'
                    }`}
                  >
                    <h4 className="font-semibold text-sm text-light-text-primary dark:text-dark-text-primary">
                      {timetable.name}
                    </h4>
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                      {timetable.term} • {timetable.academicYear}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timetable View */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                {selectedTimetable ? mockTimetables.find(t => t.id === selectedTimetable)?.name : 'Select a Timetable'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTimetable ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary border-b border-light-border dark:border-dark-border">
                          Time
                        </th>
                        {days.map((day) => (
                          <th
                            key={day}
                            className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary border-b border-light-border dark:border-dark-border"
                          >
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((time) => (
                        <tr key={time} className="border-b border-light-border dark:border-dark-border">
                          <td className="py-3 px-4 text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                            {time}
                          </td>
                          {days.map((day) => {
                            const schedule = mockSchedule.find(
                              (s) => s.day === day && s.time === time
                            );
                            return (
                              <td key={day} className="py-3 px-4">
                                {schedule ? (
                                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                                    <p className="text-xs font-semibold text-light-text-primary dark:text-dark-text-primary">
                                      {schedule.subject}
                                    </p>
                                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                      {schedule.teacher}
                                    </p>
                                    <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                                      {schedule.class}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="p-2 text-light-text-muted dark:text-dark-text-muted text-xs">
                                    Free
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    Select a timetable from the list to view the schedule
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}

