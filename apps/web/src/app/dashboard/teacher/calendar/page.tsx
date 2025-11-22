'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';

// Mock data - will be replaced with API calls later
const mockEvents = [
  {
    id: '1',
    title: 'Parent-Teacher Meeting',
    date: '2024-03-15',
    time: '10:00 AM',
    location: 'School Hall',
    type: 'meeting' as const,
  },
  {
    id: '2',
    title: 'Mathematics Test - JSS2',
    date: '2024-03-18',
    time: '9:00 AM',
    location: 'Room 101',
    type: 'exam' as const,
  },
  {
    id: '3',
    title: 'Staff Development Workshop',
    date: '2024-03-20',
    time: '2:00 PM',
    location: 'Staff Room',
    type: 'event' as const,
  },
  {
    id: '4',
    title: 'Mid-Term Examination',
    date: '2024-03-25',
    time: '9:00 AM',
    location: 'All Classes',
    type: 'exam' as const,
  },
];

const currentDate = new Date();
const currentMonth = currentDate.getMonth();
const currentYear = currentDate.getFullYear();

export default function TeacherCalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [viewYear, setViewYear] = useState(currentYear);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const getEventsForDate = (date: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    return mockEvents.filter(event => event.date === dateStr);
  };

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
            Calendar
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            View your schedule, meetings, and school events
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  {monthNames[viewMonth]} {viewYear}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const events = getEventsForDate(day);
                  const isToday = day === currentDate.getDate() && 
                                  viewMonth === currentMonth && 
                                  viewYear === currentYear;
                  
                  return (
                    <div
                      key={day}
                      className={`aspect-square p-2 border border-light-border dark:border-dark-border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors ${
                        isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : ''
                      }`}
                      onClick={() => setSelectedDate(new Date(viewYear, viewMonth, day))}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-light-text-primary dark:text-dark-text-primary'}`}>
                        {day}
                      </div>
                      {events.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {events.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              className="h-1.5 w-1.5 rounded-full bg-blue-500"
                              title={event.title}
                            />
                          ))}
                          {events.length > 2 && (
                            <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Events List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-gray-50 dark:bg-dark-surface rounded-lg"
                  >
                    <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                      {event.title}
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary">
                        <CalendarIcon className="h-4 w-4" />
                        {new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary">
                        <Clock className="h-4 w-4" />
                        {event.time}
                      </div>
                      <div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </div>
                    </div>
                    <span
                      className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                        event.type === 'meeting'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : event.type === 'exam'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      }`}
                    >
                      {event.type}
                    </span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}

