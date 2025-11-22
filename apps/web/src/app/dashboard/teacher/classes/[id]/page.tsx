'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Users, 
  FileText, 
  Smartphone,
  ArrowLeft,
  Search,
  User,
  Mail,
  Phone,
  Calendar,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Plus,
  Download,
  Upload
} from 'lucide-react';
import { getActivePluginsForTeacher } from '@/lib/plugins';

// Mock data - will be replaced with API calls later
const getClassData = (id: string) => {
  return {
    id,
    subject: 'Mathematics',
    code: 'MATH101',
    classLevel: 'JSS2',
    schedule: 'Mon, Wed, Fri - 9:00 AM',
    room: 'Room 101',
    students: 35,
    description: 'Introduction to algebra, geometry, and basic calculus',
    session: '2023/2024',
    term: 'First Term',
    curriculum: [
      {
        week: 1,
        topic: 'Introduction to Algebra',
        objectives: [
          'Understand basic algebraic expressions',
          'Solve simple linear equations',
          'Apply algebraic principles to real-world problems'
        ],
        resources: ['Textbook Chapter 1', 'Worksheet 1.1', 'Video: Algebra Basics']
      },
      {
        week: 2,
        topic: 'Linear Equations',
        objectives: [
          'Solve one-step equations',
          'Solve two-step equations',
          'Graph linear equations'
        ],
        resources: ['Textbook Chapter 2', 'Worksheet 2.1', 'Interactive Graph Tool']
      },
      {
        week: 3,
        topic: 'Quadratic Equations',
        objectives: [
          'Identify quadratic equations',
          'Solve by factoring',
          'Solve using quadratic formula'
        ],
        resources: ['Textbook Chapter 3', 'Worksheet 3.1', 'Practice Problems Set']
      },
    ],
    students: [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        admissionNumber: 'ADM001',
        email: 'john.doe@school.com',
        phone: '+234 801 234 5678',
        attendance: 95,
        averageScore: 85,
        status: 'active' as const,
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        admissionNumber: 'ADM002',
        email: 'jane.smith@school.com',
        phone: '+234 802 345 6789',
        attendance: 98,
        averageScore: 92,
        status: 'active' as const,
      },
      {
        id: '3',
        firstName: 'Michael',
        lastName: 'Johnson',
        admissionNumber: 'ADM003',
        email: 'michael.j@school.com',
        phone: '+234 803 456 7890',
        attendance: 87,
        averageScore: 78,
        status: 'active' as const,
      },
      {
        id: '4',
        firstName: 'Sarah',
        lastName: 'Williams',
        admissionNumber: 'ADM004',
        email: 'sarah.w@school.com',
        phone: '+234 804 567 8901',
        attendance: 100,
        averageScore: 95,
        status: 'active' as const,
      },
    ],
    tests: [
      {
        id: '1',
        title: 'Mid-Term Assessment',
        date: '2024-02-15',
        type: 'Exam',
        totalScore: 100,
        averageScore: 82,
        status: 'completed' as const,
      },
      {
        id: '2',
        title: 'Weekly Quiz - Algebra',
        date: '2024-02-20',
        type: 'Quiz',
        totalScore: 20,
        averageScore: 16,
        status: 'completed' as const,
      },
    ],
    attendance: [
      {
        date: '2024-02-26',
        present: 33,
        absent: 2,
        late: 0,
      },
      {
        date: '2024-02-24',
        present: 34,
        absent: 1,
        late: 0,
      },
      {
        date: '2024-02-22',
        present: 32,
        absent: 2,
        late: 1,
      },
    ],
  };
};

type TabType = 'curriculum' | 'students' | 'tests' | 'rollcall';

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabType>('curriculum');
  const [searchQuery, setSearchQuery] = useState('');

  const classData = getClassData(classId);
  const activePlugins = getActivePluginsForTeacher();
  const hasSocratesAI = activePlugins.some(p => p.slug === 'socrates-ai');
  const hasRollCall = activePlugins.some(p => p.slug === 'rollcall');

  // Build tabs dynamically based on available plugins
  const tabs: { id: TabType; label: string; icon: React.ReactNode; available: boolean }[] = [
    { id: 'curriculum', label: 'Curriculum', icon: <BookOpen className="h-4 w-4" />, available: true },
    { id: 'students', label: 'Students', icon: <Users className="h-4 w-4" />, available: true },
    { id: 'tests', label: 'Tests', icon: <FileText className="h-4 w-4" />, available: true },
    { id: 'rollcall', label: 'RollCall', icon: <Smartphone className="h-4 w-4" />, available: hasRollCall },
  ];

  const filteredStudents = classData.students.filter(
    (student) =>
      student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute roles={['TEACHER']}>
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/dashboard/teacher/classes">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Classes
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                {classData.subject}
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                {classData.code} • {classData.classLevel} • {classData.session} - {classData.term}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6 border-b border-light-border dark:border-dark-border">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.filter(tab => tab.available).map((tab) => (
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
          {/* Curriculum Tab */}
          {activeTab === 'curriculum' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                    Curriculum Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {classData.curriculum.map((week, index) => (
                      <div
                        key={index}
                        className="pb-6 border-b border-light-border dark:border-dark-border last:border-0 last:pb-0"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="flex-shrink-0 w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="text-blue-600 dark:text-blue-400 font-bold text-sm text-center leading-tight">
                              Week {week.week}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                              {week.topic}
                            </h3>
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                                Learning Objectives:
                              </p>
                              <ul className="list-disc list-inside space-y-1 ml-2">
                                {week.objectives.map((objective, objIndex) => (
                                  <li
                                    key={objIndex}
                                    className="text-sm text-light-text-secondary dark:text-dark-text-secondary"
                                  >
                                    {objective}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="mt-3">
                              <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                                Resources:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {week.resources.map((resource, resIndex) => (
                                  <span
                                    key={resIndex}
                                    className="px-3 py-1 bg-light-bg dark:bg-dark-surface rounded-md text-xs text-light-text-secondary dark:text-dark-text-secondary"
                                  >
                                    {resource}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                      Students ({classData.students.length})
                    </CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
                      <Input
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary">
                        No students found matching your search.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredStudents.map((student) => (
                        <Card
                          key={student.id}
                          className="hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => router.push(`/dashboard/teacher/students/${student.id}`)}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                  <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                                    {student.firstName} {student.lastName}
                                  </h3>
                                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                    {student.admissionNumber}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
                                <span className="text-light-text-secondary dark:text-dark-text-secondary">
                                  {student.email}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
                                <span className="text-light-text-secondary dark:text-dark-text-secondary">
                                  {student.phone}
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-light-border dark:border-dark-border">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                    {student.attendance}% Attendance
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                    {student.averageScore}% Avg
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tests Tab */}
          {activeTab === 'tests' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                      Tests & Assessments
                    </CardTitle>
                    <div className="flex gap-2">
                      {hasSocratesAI && (
                        <Button
                          size="sm"
                          onClick={() => router.push('/dashboard/teacher/plugins/socrates-ai')}
                          className="flex items-center gap-2"
                        >
                          <Sparkles className="h-4 w-4" />
                          Use Socrates AI
                        </Button>
                      )}
                      <Button size="sm" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create Test
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {classData.tests.map((test) => (
                      <Card key={test.id} className="border border-light-border dark:border-dark-border">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                                  {test.title}
                                </h3>
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-medium rounded">
                                  {test.type}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-light-text-secondary dark:text-dark-text-secondary ml-8">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(test.date).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Award className="h-4 w-4" />
                                  Avg: {test.averageScore}/{test.totalScore}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                View Results
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {classData.tests.length === 0 && (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                        <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                          No tests created yet.
                        </p>
                        <Button size="sm" className="flex items-center gap-2 mx-auto">
                          <Plus className="h-4 w-4" />
                          Create Your First Test
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* RollCall Tab */}
          {activeTab === 'rollcall' && hasRollCall && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                      RollCall Attendance
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={() => router.push('/dashboard/teacher/plugins/rollcall')}
                      className="flex items-center gap-2"
                    >
                      <Smartphone className="h-4 w-4" />
                      Open RollCall
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <Card className="border border-light-border dark:border-dark-border">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                Today's Attendance
                              </p>
                              <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                                {classData.attendance[0]?.present || 0}/{classData.students.length}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border border-light-border dark:border-dark-border">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                Absent Today
                              </p>
                              <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                                {classData.attendance[0]?.absent || 0}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border border-light-border dark:border-dark-border">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                Late Today
                              </p>
                              <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                                {classData.attendance[0]?.late || 0}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
                        Recent Attendance Records
                      </h3>
                      <div className="space-y-2">
                        {classData.attendance.map((record, index) => (
                          <Card
                            key={index}
                            className="border border-light-border dark:border-dark-border"
                          >
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Calendar className="h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                                  <span className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                    {new Date(record.date).toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                      {record.present} Present
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                    <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                      {record.absent} Absent
                                    </span>
                                  </div>
                                  {record.late > 0 && (
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                      <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                        {record.late} Late
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* RollCall Tab - Not Available */}
          {activeTab === 'rollcall' && !hasRollCall && (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <Smartphone className="h-16 w-16 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                  RollCall Plugin Not Available
                </h3>
                <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6">
                  Your school needs to subscribe to the RollCall plugin to use this feature.
                </p>
                <Button
                  size="sm"
                  onClick={() => router.push('/dashboard/school/marketplace')}
                >
                  View Marketplace
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}

