'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  User,
  ArrowLeft,
  Edit,
  FileText,
  BookOpen,
  Clock,
  Heart,
  Activity,
  ChevronRight,
  Award,
  TrendingUp,
  Download
} from 'lucide-react';

// Mock data - will be replaced with API calls later
const getStudentData = (id: string) => {
  return {
    id,
    firstName: 'John',
    lastName: 'Doe',
    admissionNumber: 'ADM001',
    classLevel: 'JSS2',
    email: 'john.doe@school.com',
    phone: '+234 801 234 5678',
    dateOfBirth: '2010-05-15',
    gender: 'Male',
    address: '123 Main Street, Lagos',
    status: 'active' as const,
    createdAt: '2024-01-15',
    parent: {
      name: 'Jane Doe',
      phone: '+234 802 345 6789',
      email: 'jane.doe@email.com',
    },
    enrollment: {
      date: '2024-01-15',
      session: '2023/2024',
    },
    health: {
      bloodGroup: 'O+',
      allergies: ['Peanuts', 'Dust'],
      medications: ['Inhaler (as needed)'],
      emergencyContact: '+234 802 345 6789',
      medicalNotes: 'Asthma - uses inhaler during physical activities',
      lastCheckup: '2024-01-10',
    },
    classes: [
      {
        id: '1',
        subject: 'Mathematics',
        code: 'MATH101',
        teacher: 'Mr. Sarah Williams',
        schedule: 'Mon, Wed, Fri - 9:00 AM',
        room: 'Room 101',
      },
      {
        id: '2',
        subject: 'English Language',
        code: 'ENG102',
        teacher: 'Mrs. David Brown',
        schedule: 'Tue, Thu - 10:30 AM',
        room: 'Room 205',
      },
      {
        id: '3',
        subject: 'Physics',
        code: 'PHY103',
        teacher: 'Dr. Emily Davis',
        schedule: 'Mon, Wed - 2:00 PM',
        room: 'Lab 3',
      },
    ],
    timetable: [
      {
        day: 'Monday',
        periods: [
          { time: '8:00 - 9:00', subject: 'Mathematics', teacher: 'Mr. Williams', room: 'Room 101' },
          { time: '9:00 - 10:00', subject: 'English Language', teacher: 'Mrs. Brown', room: 'Room 205' },
          { time: '10:00 - 10:30', subject: 'Break', teacher: '', room: '' },
          { time: '10:30 - 11:30', subject: 'Physics', teacher: 'Dr. Davis', room: 'Lab 3' },
        ],
      },
    ],
    calendar: [
      {
        date: '2024-03-15',
        title: 'Mathematics Test',
        type: 'exam',
      },
      {
        date: '2024-03-20',
        title: 'Parent-Teacher Meeting',
        type: 'event',
      },
      {
        date: '2024-03-25',
        title: 'Science Fair',
        type: 'event',
      },
    ],
    grades: [
      {
        term: 'First Term 2024',
        subjects: [
          { name: 'Mathematics', score: 85, grade: 'A', maxScore: 100 },
          { name: 'English Language', score: 92, grade: 'A', maxScore: 100 },
          { name: 'Physics', score: 78, grade: 'B', maxScore: 100 },
          { name: 'Chemistry', score: 82, grade: 'B', maxScore: 100 },
          { name: 'Biology', score: 88, grade: 'A', maxScore: 100 },
          { name: 'History', score: 75, grade: 'B', maxScore: 100 },
          { name: 'Computer Science', score: 90, grade: 'A', maxScore: 100 },
          { name: 'Physical Education', score: 95, grade: 'A', maxScore: 100 },
        ],
        totalScore: 675,
        averageScore: 84.4,
        position: 5,
        totalStudents: 45,
      },
      {
        term: 'Second Term 2024',
        subjects: [
          { name: 'Mathematics', score: 88, grade: 'A', maxScore: 100 },
          { name: 'English Language', score: 90, grade: 'A', maxScore: 100 },
          { name: 'Physics', score: 80, grade: 'B', maxScore: 100 },
          { name: 'Chemistry', score: 85, grade: 'A', maxScore: 100 },
          { name: 'Biology', score: 87, grade: 'A', maxScore: 100 },
          { name: 'History', score: 78, grade: 'B', maxScore: 100 },
          { name: 'Computer Science', score: 92, grade: 'A', maxScore: 100 },
          { name: 'Physical Education', score: 93, grade: 'A', maxScore: 100 },
        ],
        totalScore: 693,
        averageScore: 86.6,
        position: 3,
        totalStudents: 45,
      },
    ],
  };
};

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'B':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'C':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
};

type TabType = 'profile' | 'calendar' | 'classes' | 'timetable' | 'health' | 'grades' | 'transcript';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  const student = getStudentData(studentId);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar className="h-4 w-4" /> },
    { id: 'classes', label: 'Classes', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'timetable', label: 'Timetable', icon: <Clock className="h-4 w-4" /> },
    { id: 'health', label: 'Health Status', icon: <Heart className="h-4 w-4" /> },
    { id: 'grades', label: 'Grades', icon: <Award className="h-4 w-4" /> },
    { id: 'transcript', label: 'Transcript', icon: <FileText className="h-4 w-4" /> },
  ];

  const [selectedTerm, setSelectedTerm] = useState(0);

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/dashboard/school/students">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Students
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                {student.firstName} {student.lastName}
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                {student.admissionNumber} • {student.classLevel}
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
              <div className="lg:col-span-2">
                {/* Combined Information Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                        Student Information
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Personal Information Section */}
                      <div>
                        <h3 className="text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-4 uppercase tracking-wide">
                          Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                              Full Name
                            </p>
                            <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                              {student.firstName} {student.lastName}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                              Admission Number
                            </p>
                            <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                              {student.admissionNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                              Class Level
                            </p>
                            <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                              {student.classLevel}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                              Date of Birth
                            </p>
                            <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                              {new Date(student.dateOfBirth).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                              Gender
                            </p>
                            <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                              {student.gender}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                              Status
                            </p>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                student.status === 'active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                              }`}
                            >
                              {student.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-light-border dark:border-dark-border"></div>

                      {/* Contact Information Section */}
                      <div>
                        <h3 className="text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-4 uppercase tracking-wide">
                          Contact Information
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                            <div>
                              <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                                Email
                              </p>
                              <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                                {student.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                            <div>
                              <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                                Phone
                              </p>
                              <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                                {student.phone}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                            <div>
                              <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                                Address
                              </p>
                              <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                                {student.address}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-light-border dark:border-dark-border"></div>

                      {/* Academic Records Section */}
                      <div>
                        <h3 className="text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-4 uppercase tracking-wide">
                          Academic Records
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                              Enrollment Date
                            </p>
                            <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                              {new Date(student.enrollment.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                              Academic Session
                            </p>
                            <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                              {student.enrollment.session}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                              Current Class
                            </p>
                            <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                              {student.classLevel}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Parent/Guardian */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                        Parent/Guardian
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Name
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {student.parent.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Phone
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {student.parent.phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Email
                        </p>
                        <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {student.parent.email}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Student Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {student.calendar.map((event, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 bg-gray-50 dark:bg-dark-surface rounded-lg border-l-4 border-l-blue-600 dark:border-l-blue-400"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                            {event.title}
                          </h4>
                          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                            {new Date(event.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            event.type === 'exam'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                        >
                          {event.type}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'classes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {student.classes.map((classItem, index) => (
                <motion.div
                  key={classItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                        {classItem.subject}
                      </CardTitle>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                        {classItem.code}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                            Teacher
                          </p>
                          <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                            {classItem.teacher}
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
                  {student.timetable.map((day, dayIndex) => (
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
                                Teacher
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
                                  period.subject === 'Break' || period.subject === 'Lunch'
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
                                      period.subject === 'Break' || period.subject === 'Lunch'
                                        ? 'text-light-text-muted dark:text-dark-text-muted italic'
                                        : 'text-light-text-primary dark:text-dark-text-primary'
                                    }`}
                                  >
                                    {period.subject}
                                  </p>
                                </td>
                                <td className="py-3 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                  {period.teacher || '-'}
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

          {activeTab === 'health' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Health Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                      Blood Group
                    </p>
                    <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                      {student.health.bloodGroup}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                      Last Checkup
                    </p>
                    <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                      {new Date(student.health.lastCheckup).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                      Allergies
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {student.health.allergies.length > 0 ? (
                        student.health.allergies.map((allergy, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-full text-xs font-medium"
                          >
                            {allergy}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-light-text-muted dark:text-dark-text-muted">None</p>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                      Current Medications
                    </p>
                    <div className="space-y-2">
                      {student.health.medications.length > 0 ? (
                        student.health.medications.map((medication, index) => (
                          <div
                            key={index}
                            className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg"
                          >
                            <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                              {medication}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-light-text-muted dark:text-dark-text-muted">None</p>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                      Medical Notes
                    </p>
                    <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                      {student.health.medicalNotes}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                      Emergency Contact
                    </p>
                    <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                      {student.health.emergencyContact}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'grades' && (
            <div>
              {/* Term Selector */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    {student.grades.map((grade, index) => (
                      <Button
                        key={index}
                        variant={selectedTerm === index ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setSelectedTerm(index)}
                      >
                        {grade.term}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Average Score
                        </p>
                        <p className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
                          {student.grades[selectedTerm].averageScore}%
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Class Position
                        </p>
                        <p className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
                          {student.grades[selectedTerm].position}
                          <span className="text-lg text-light-text-secondary dark:text-dark-text-secondary">
                            {' '}/ {student.grades[selectedTerm].totalStudents}
                          </span>
                        </p>
                      </div>
                      <Award className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Total Score
                        </p>
                        <p className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
                          {student.grades[selectedTerm].totalScore}
                        </p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Subject Results */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                      Subject Breakdown - {student.grades[selectedTerm].term}
                    </CardTitle>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-light-border dark:border-dark-border">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                            Subject
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                            Score
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                            Max Score
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                            Grade
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                            Percentage
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {student.grades[selectedTerm].subjects.map((subject, index) => {
                          const percentage = (subject.score / subject.maxScore) * 100;
                          return (
                            <motion.tr
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors"
                            >
                              <td className="py-4 px-4">
                                <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                  {subject.name}
                                </p>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <p className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                                  {subject.score}
                                </p>
                              </td>
                              <td className="py-4 px-4 text-center text-light-text-secondary dark:text-dark-text-secondary">
                                {subject.maxScore}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(
                                    subject.grade
                                  )}`}
                                >
                                  {subject.grade}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                                  {percentage.toFixed(1)}%
                                </p>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'transcript' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Academic Transcript
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    Transcript view will be available here. This shows the complete academic history across all schools.
                  </p>
                  <p className="text-sm text-light-text-muted dark:text-dark-text-muted mt-2">
                    (Optional - can be enabled per school policy)
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}

