'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { BookOpen, Clock, FileText, GraduationCap, Award, TrendingUp } from 'lucide-react';

// Mock data - will be replaced with API calls later
const mockRecentResults = [
  {
    id: '1',
    subject: 'Mathematics',
    score: 85,
    grade: 'A',
    term: 'First Term 2024',
  },
  {
    id: '2',
    subject: 'English Language',
    score: 92,
    grade: 'A',
    term: 'First Term 2024',
  },
  {
    id: '3',
    subject: 'Physics',
    score: 78,
    grade: 'B',
    term: 'First Term 2024',
  },
];

const mockUpcomingClasses = [
  {
    id: '1',
    subject: 'Mathematics',
    teacher: 'Mr. Williams',
    time: '9:00 AM',
    room: 'Room 101',
  },
  {
    id: '2',
    subject: 'English Language',
    teacher: 'Mrs. Brown',
    time: '10:30 AM',
    room: 'Room 205',
  },
  {
    id: '3',
    subject: 'Physics',
    teacher: 'Dr. Davis',
    time: '2:00 PM',
    room: 'Lab 3',
  },
];

export default function StudentOverviewPage() {
  return (
    <ProtectedRoute roles={['STUDENT']}>
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
            Welcome Back!
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            View your academic progress, classes, and results
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Current Class"
            value="JSS2"
            change="Active"
            changeType="positive"
            icon={
              <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            }
          />
          <StatCard
            title="Average Score"
            value="85%"
            change="+5%"
            changeType="positive"
            icon={
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            }
          />
          <StatCard
            title="Active Courses"
            value="12"
            change="This Term"
            changeType="neutral"
            icon={
              <GraduationCap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            }
          />
          <StatCard
            title="Certificates"
            value="3"
            change="Earned"
            changeType="positive"
            icon={
              <Award className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            }
          />
        </div>

        {/* Quick Access */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  Recent Results
                </CardTitle>
                <Link href="/dashboard/student/results">
                  <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400">
                    View All →
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRecentResults.map((result) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gray-50 dark:bg-dark-surface rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                          {result.subject}
                        </h4>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                          {result.term}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                          {result.score}%
                        </p>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${
                            result.grade === 'A'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                        >
                          Grade {result.grade}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  Today's Classes
                </CardTitle>
                <Link href="/dashboard/student/timetables">
                  <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400">
                    View Timetable →
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockUpcomingClasses.map((classItem) => (
                  <motion.div
                    key={classItem.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gray-50 dark:bg-dark-surface rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                          {classItem.subject}
                        </h4>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                          {classItem.teacher} • {classItem.room}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                          {classItem.time}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/dashboard/student/classes">
                <Button className="w-full" variant="primary">
                  <BookOpen className="h-4 w-4 mr-2" />
                  My Classes
                </Button>
              </Link>
              <Link href="/dashboard/student/timetables">
                <Button className="w-full" variant="ghost">
                  <Clock className="h-4 w-4 mr-2" />
                  Timetables
                </Button>
              </Link>
              <Link href="/dashboard/student/results">
                <Button className="w-full" variant="ghost">
                  <FileText className="h-4 w-4 mr-2" />
                  Results
                </Button>
              </Link>
              <Link href="/dashboard/student/transcript">
                <Button className="w-full" variant="ghost">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Transcript
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

