'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { 
  Users, 
  Mail, 
  Phone, 
  BookOpen, 
  GraduationCap,
  ArrowLeft,
  Edit,
  Clock,
  User,
  Calendar,
  MapPin,
  Award
} from 'lucide-react';

// Mock data - will be replaced with API calls later
const getTeacherData = (id: string) => {
  return {
    id,
    firstName: 'Sarah',
    lastName: 'Williams',
    email: 'sarah.w@school.com',
    phone: '+234 801 234 5678',
    address: '456 Teacher Street, Lagos',
    dateOfBirth: '1985-03-20',
    gender: 'Female',
    subject: 'Mathematics',
    classLevels: ['JSS1', 'JSS2', 'JSS3'],
    qualification: 'B.Ed Mathematics, M.Ed Curriculum Development',
    yearsOfExperience: 8,
    joinedDate: '2019-09-01', // Date they joined the school
    status: 'active' as const,
    createdAt: '2019-09-01',
    classes: [
      {
        id: '1',
        subject: 'Mathematics',
        code: 'MATH101',
        classLevel: 'JSS1',
        students: 45,
        schedule: 'Mon, Wed, Fri - 9:00 AM',
        room: 'Room 101',
        description: 'Introduction to algebra and basic mathematics',
      },
      {
        id: '2',
        subject: 'Mathematics',
        code: 'MATH102',
        classLevel: 'JSS2',
        students: 42,
        schedule: 'Tue, Thu - 10:30 AM',
        room: 'Room 102',
        description: 'Advanced algebra and geometry',
      },
      {
        id: '3',
        subject: 'Further Mathematics',
        code: 'MATH201',
        classLevel: 'JSS3',
        students: 38,
        schedule: 'Mon, Wed - 2:00 PM',
        room: 'Room 201',
        description: 'Calculus and advanced mathematics',
      },
    ],
    timetable: [
      {
        day: 'Monday',
        periods: [
          { time: '8:00 - 9:00', subject: 'Mathematics', classLevel: 'JSS1', room: 'Room 101' },
          { time: '9:00 - 10:00', subject: 'Mathematics', classLevel: 'JSS2', room: 'Room 102' },
          { time: '10:00 - 10:30', subject: 'Break', classLevel: '', room: '' },
          { time: '2:00 - 3:00', subject: 'Further Mathematics', classLevel: 'JSS3', room: 'Room 201' },
        ],
      },
      {
        day: 'Tuesday',
        periods: [
          { time: '10:30 - 11:30', subject: 'Mathematics', classLevel: 'JSS2', room: 'Room 102' },
          { time: '11:30 - 12:30', subject: 'Free Period', classLevel: '', room: '' },
          { time: '12:30 - 1:30', subject: 'Lunch', classLevel: '', room: '' },
          { time: '1:30 - 2:30', subject: 'Mathematics', classLevel: 'JSS1', room: 'Room 101' },
        ],
      },
      {
        day: 'Wednesday',
        periods: [
          { time: '8:00 - 9:00', subject: 'Mathematics', classLevel: 'JSS1', room: 'Room 101' },
          { time: '9:00 - 10:00', subject: 'Mathematics', classLevel: 'JSS2', room: 'Room 102' },
          { time: '10:00 - 10:30', subject: 'Break', classLevel: '', room: '' },
          { time: '2:00 - 3:00', subject: 'Further Mathematics', classLevel: 'JSS3', room: 'Room 201' },
        ],
      },
      {
        day: 'Thursday',
        periods: [
          { time: '10:30 - 11:30', subject: 'Mathematics', classLevel: 'JSS2', room: 'Room 102' },
          { time: '11:30 - 12:30', subject: 'Free Period', classLevel: '', room: '' },
          { time: '12:30 - 1:30', subject: 'Lunch', classLevel: '', room: '' },
          { time: '1:30 - 2:30', subject: 'Mathematics', classLevel: 'JSS1', room: 'Room 101' },
        ],
      },
      {
        day: 'Friday',
        periods: [
          { time: '8:00 - 9:00', subject: 'Mathematics', classLevel: 'JSS1', room: 'Room 101' },
          { time: '9:00 - 10:00', subject: 'Mathematics', classLevel: 'JSS2', room: 'Room 102' },
          { time: '10:00 - 10:30', subject: 'Break', classLevel: '', room: '' },
          { time: '10:30 - 11:30', subject: 'Staff Meeting', classLevel: '', room: 'Conference Room' },
        ],
      },
    ],
  };
};

type TabType = 'profile' | 'classes' | 'timetable';

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  const teacher = getTeacherData(teacherId);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { id: 'classes', label: 'Classes', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'timetable', label: 'Timetable', icon: <Clock className="h-4 w-4" /> },
  ];

  // Calculate years at school
  const yearsAtSchool = Math.floor(
    (new Date().getTime() - new Date(teacher.joinedDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
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
          <Link href="/dashboard/school/teachers">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Teachers
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                {teacher.firstName} {teacher.lastName}
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                {teacher.subject} • {teacher.classLevels.join(', ')}
              </p>
            </div>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6 border-b border-light-border dark:border-dark-border">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                        Personal Information
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Full Name
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {teacher.firstName} {teacher.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Email
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {teacher.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Phone
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {teacher.phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Date of Birth
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {new Date(teacher.dateOfBirth).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Gender
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {teacher.gender}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Status
                        </p>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            teacher.status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {teacher.status}
                        </span>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Address
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {teacher.address}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Academic Information */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                        Academic Information
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Subject
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {teacher.subject}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Class Levels
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {teacher.classLevels.map((level) => (
                            <span
                              key={level}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs font-medium"
                            >
                              {level}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Qualification
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {teacher.qualification}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Years of Experience
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {teacher.yearsOfExperience} years
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* School Information */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Award className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                        School Information
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Date Joined
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {new Date(teacher.joinedDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Years at School
                        </p>
                        <p className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                          {yearsAtSchool} {yearsAtSchool === 1 ? 'year' : 'years'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Total Classes
                        </p>
                        <p className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                          {teacher.classes.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Total Students
                        </p>
                        <p className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                          {teacher.classes.reduce((sum, cls) => sum + cls.students, 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button variant="ghost" className="w-full justify-start">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                      <Button variant="ghost" className="w-full justify-start">
                        <BookOpen className="h-4 w-4 mr-2" />
                        View Schedule
                      </Button>
                      <Button variant="ghost" className="w-full justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        View Students
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teacher.classes.map((classItem, index) => (
                <motion.div
                  key={classItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <CardTitle className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                            {classItem.subject}
                          </CardTitle>
                          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                            {classItem.code}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-medium rounded">
                          {classItem.classLevel}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                            Students
                          </p>
                          <p className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
                            {classItem.students} students
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                            Schedule
                          </p>
                          <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                            {classItem.schedule}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                            Room
                          </p>
                          <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                            {classItem.room}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-light-border dark:border-dark-border">
                          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            {classItem.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'timetable' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Weekly Timetable
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {teacher.timetable.map((day, dayIndex) => (
                    <div key={dayIndex}>
                      <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-3">
                        {day.day}
                      </h3>
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
                                Class Level
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
                                  period.subject === 'Break' || period.subject === 'Lunch' || period.subject === 'Free Period' || period.subject === 'Staff Meeting'
                                    ? 'bg-gray-50 dark:bg-dark-surface/50'
                                    : 'hover:bg-gray-50 dark:hover:bg-dark-surface/50'
                                }`}
                              >
                                <td className="py-3 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                  {period.time}
                                </td>
                                <td className="py-3 px-4">
                                  <p
                                    className={`text-sm font-medium ${
                                      period.subject === 'Break' || period.subject === 'Lunch' || period.subject === 'Free Period' || period.subject === 'Staff Meeting'
                                        ? 'text-light-text-muted dark:text-dark-text-muted italic'
                                        : 'text-light-text-primary dark:text-dark-text-primary'
                                    }`}
                                  >
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
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}
