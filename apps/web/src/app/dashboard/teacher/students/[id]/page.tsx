'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  BookOpen,
  Clock,
  Award,
  ArrowLeft,
  GraduationCap
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
    attendance: 95,
    averageScore: 85,
    classes: [
      { id: '1', subject: 'Mathematics', code: 'MATH101', score: 88 },
      { id: '2', subject: 'English', code: 'ENG101', score: 82 },
      { id: '3', subject: 'Science', code: 'SCI101', score: 90 },
    ],
    recentGrades: [
      { test: 'Mid-Term Assessment', subject: 'Mathematics', score: 85, total: 100, date: '2024-02-15' },
      { test: 'Weekly Quiz', subject: 'English', score: 80, total: 20, date: '2024-02-20' },
      { test: 'Assignment', subject: 'Science', score: 92, total: 100, date: '2024-02-18' },
    ],
  };
};

type TabType = 'profile' | 'grades' | 'attendance';

export default function TeacherStudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  const student = getStudentData(studentId);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { id: 'grades', label: 'Grades', icon: <Award className="h-4 w-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <Calendar className="h-4 w-4" /> },
  ];

  return (
    <ProtectedRoute roles={['TEACHER']}>
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                {student.firstName} {student.lastName}
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                {student.admissionNumber} • {student.classLevel}
              </p>
            </div>
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
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Full Name
                        </p>
                        <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                          {student.firstName} {student.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Admission Number
                        </p>
                        <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                          {student.admissionNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Class Level
                        </p>
                        <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                          {student.classLevel}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Date of Birth
                        </p>
                        <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                          {new Date(student.dateOfBirth).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                          Gender
                        </p>
                        <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                          {student.gender}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                        <div>
                          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                            Email
                          </p>
                          <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                            {student.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                        <div>
                          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                            Phone
                          </p>
                          <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                            {student.phone}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                              Attendance
                            </p>
                            <p className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                              {student.attendance}%
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                              Average Score
                            </p>
                            <p className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                              {student.averageScore}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                      Current Classes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {student.classes.map((classItem) => (
                        <div
                          key={classItem.id}
                          className="flex items-center justify-between p-3 bg-light-bg dark:bg-dark-surface rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                              {classItem.subject}
                            </p>
                            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                              {classItem.code}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-blue-600 dark:text-blue-400">
                              {classItem.score}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Grades Tab */}
          {activeTab === 'grades' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                    Recent Grades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {student.recentGrades.map((grade, index) => (
                      <Card
                        key={index}
                        className="border border-light-border dark:border-dark-border"
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <div>
                                  <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                                    {grade.test}
                                  </h3>
                                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                    {grade.subject}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-light-text-secondary dark:text-dark-text-secondary ml-8">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(grade.date).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {grade.score}
                              </p>
                              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                / {grade.total}
                              </p>
                              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                                {Math.round((grade.score / grade.total) * 100)}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                    Attendance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="w-32 h-32 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-16 w-16 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                      {student.attendance}%
                    </p>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary">
                      Overall Attendance Rate
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}

