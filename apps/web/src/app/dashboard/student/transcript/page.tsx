'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { GraduationCap, Download, Award, School, Calendar, FileText, TrendingUp } from 'lucide-react';

// Mock data - will be replaced with API calls later
// This represents the complete academic history across all schools
const academicHistory = [
  {
    schoolId: '1',
    schoolName: 'Greenfield Primary School',
    schoolType: 'Primary',
    startDate: '2015-09-01',
    endDate: '2021-07-31',
    level: 'Primary',
    certificates: [
      {
        id: '1',
        name: 'Primary School Leaving Certificate',
        issueDate: '2021-07-15',
        grade: 'Distinction',
        fileUrl: '#',
      },
    ],
    academicYears: [
      {
        year: '2020-2021',
        class: 'Primary 6',
        term: 'Third Term',
        subjects: [
          { name: 'Mathematics', score: 95, grade: 'A', maxScore: 100 },
          { name: 'English Language', score: 92, grade: 'A', maxScore: 100 },
          { name: 'Basic Science', score: 88, grade: 'A', maxScore: 100 },
          { name: 'Social Studies', score: 90, grade: 'A', maxScore: 100 },
          { name: 'Civic Education', score: 85, grade: 'A', maxScore: 100 },
        ],
        averageScore: 90,
        position: 2,
        totalStudents: 35,
      },
      {
        year: '2019-2020',
        class: 'Primary 5',
        term: 'Third Term',
        subjects: [
          { name: 'Mathematics', score: 88, grade: 'A', maxScore: 100 },
          { name: 'English Language', score: 90, grade: 'A', maxScore: 100 },
          { name: 'Basic Science', score: 85, grade: 'A', maxScore: 100 },
          { name: 'Social Studies', score: 87, grade: 'A', maxScore: 100 },
          { name: 'Civic Education', score: 82, grade: 'A', maxScore: 100 },
        ],
        averageScore: 86.4,
        position: 3,
        totalStudents: 35,
      },
    ],
  },
  {
    schoolId: '2',
    schoolName: 'Riverside Junior Secondary School',
    schoolType: 'Junior Secondary',
    startDate: '2021-09-01',
    endDate: '2024-07-31',
    level: 'Junior Secondary',
    certificates: [
      {
        id: '2',
        name: 'Junior Secondary School Certificate',
        issueDate: '2024-07-20',
        grade: 'Excellent',
        fileUrl: '#',
      },
    ],
    academicYears: [
      {
        year: '2023-2024',
        class: 'JSS3',
        term: 'Third Term',
        subjects: [
          { name: 'Mathematics', score: 90, grade: 'A', maxScore: 100 },
          { name: 'English Language', score: 88, grade: 'A', maxScore: 100 },
          { name: 'Basic Science', score: 85, grade: 'A', maxScore: 100 },
          { name: 'Social Studies', score: 87, grade: 'A', maxScore: 100 },
          { name: 'Civic Education', score: 82, grade: 'A', maxScore: 100 },
          { name: 'Business Studies', score: 90, grade: 'A', maxScore: 100 },
        ],
        averageScore: 87,
        position: 1,
        totalStudents: 40,
      },
      {
        year: '2022-2023',
        class: 'JSS2',
        term: 'Third Term',
        subjects: [
          { name: 'Mathematics', score: 87, grade: 'A', maxScore: 100 },
          { name: 'English Language', score: 85, grade: 'A', maxScore: 100 },
          { name: 'Basic Science', score: 83, grade: 'A', maxScore: 100 },
          { name: 'Social Studies', score: 88, grade: 'A', maxScore: 100 },
          { name: 'Civic Education', score: 80, grade: 'B', maxScore: 100 },
          { name: 'Business Studies', score: 89, grade: 'A', maxScore: 100 },
        ],
        averageScore: 85.3,
        position: 2,
        totalStudents: 40,
      },
      {
        year: '2021-2022',
        class: 'JSS1',
        term: 'Third Term',
        subjects: [
          { name: 'Mathematics', score: 85, grade: 'A', maxScore: 100 },
          { name: 'English Language', score: 83, grade: 'A', maxScore: 100 },
          { name: 'Basic Science', score: 80, grade: 'B', maxScore: 100 },
          { name: 'Social Studies', score: 85, grade: 'A', maxScore: 100 },
          { name: 'Civic Education', score: 78, grade: 'B', maxScore: 100 },
          { name: 'Business Studies', score: 87, grade: 'A', maxScore: 100 },
        ],
        averageScore: 83,
        position: 4,
        totalStudents: 40,
      },
    ],
  },
  {
    schoolId: '3',
    schoolName: 'Elite Senior Secondary School',
    schoolType: 'Senior Secondary',
    startDate: '2024-09-01',
    endDate: null, // Current school
    level: 'Senior Secondary',
    certificates: [],
    academicYears: [
      {
        year: '2024-2025',
        class: 'SS1',
        term: 'First Term',
        subjects: [
          { name: 'Mathematics', score: 88, grade: 'A', maxScore: 100 },
          { name: 'English Language', score: 90, grade: 'A', maxScore: 100 },
          { name: 'Physics', score: 85, grade: 'A', maxScore: 100 },
          { name: 'Chemistry', score: 87, grade: 'A', maxScore: 100 },
          { name: 'Biology', score: 89, grade: 'A', maxScore: 100 },
          { name: 'History', score: 82, grade: 'B', maxScore: 100 },
          { name: 'Computer Science', score: 92, grade: 'A', maxScore: 100 },
          { name: 'Physical Education', score: 95, grade: 'A', maxScore: 100 },
        ],
        averageScore: 88.5,
        position: 3,
        totalStudents: 45,
      },
    ],
  },
];

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

export default function StudentTranscriptPage() {
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);

  const toggleSchool = (schoolId: string) => {
    setExpandedSchool(expandedSchool === schoolId ? null : schoolId);
    setExpandedYear(null);
  };

  const toggleYear = (yearKey: string) => {
    setExpandedYear(expandedYear === yearKey ? null : yearKey);
  };

  return (
    <ProtectedRoute roles={['STUDENT']}>
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
                Academic Transcript
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Complete academic history across all schools and levels
              </p>
            </div>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download Full Transcript
            </Button>
          </div>
        </motion.div>

        {/* Timeline View */}
        <div className="space-y-6">
          {academicHistory.map((school, schoolIndex) => {
            const isCurrentSchool = school.endDate === null;
            const isExpanded = expandedSchool === school.schoolId;

            return (
              <motion.div
                key={school.schoolId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: schoolIndex * 0.1 }}
              >
                <Card className="overflow-hidden">
                  <CardHeader
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors"
                    onClick={() => toggleSchool(school.schoolId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <School className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                            {school.schoolName}
                            {isCurrentSchool && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-medium rounded">
                                Current
                              </span>
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                              <Calendar className="h-4 w-4" />
                              {new Date(school.startDate).getFullYear()} -{' '}
                              {school.endDate
                                ? new Date(school.endDate).getFullYear()
                                : 'Present'}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                              <GraduationCap className="h-4 w-4" />
                              {school.level}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {school.certificates.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                            <Award className="h-4 w-4" />
                            {school.certificates.length} Certificate
                            {school.certificates.length > 1 ? 's' : ''}
                          </div>
                        )}
                        <Button variant="ghost" size="sm">
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      {/* Certificates Section */}
                      {school.certificates.length > 0 && (
                        <div className="mb-6 pb-6 border-b border-light-border dark:border-dark-border">
                          <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4 flex items-center gap-2">
                            <Award className="h-5 w-5" />
                            Certificates Earned
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {school.certificates.map((certificate) => (
                              <motion.div
                                key={certificate.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="p-4 bg-gray-50 dark:bg-dark-surface rounded-lg"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                                      {certificate.name}
                                    </h4>
                                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                                      Issued: {new Date(certificate.issueDate).toLocaleDateString()}
                                    </p>
                                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-medium rounded">
                                      {certificate.grade}
                                    </span>
                                  </div>
                                  <Button variant="ghost" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Academic Years */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Academic Performance
                        </h3>
                        {school.academicYears.map((academicYear, yearIndex) => {
                          const yearKey = `${school.schoolId}-${academicYear.year}-${academicYear.class}`;
                          const isYearExpanded = expandedYear === yearKey;

                          return (
                            <motion.div
                              key={yearKey}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: yearIndex * 0.05 }}
                            >
                              <Card className="border-l-4 border-l-blue-600 dark:border-l-blue-400">
                                <CardHeader
                                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors"
                                  onClick={() => toggleYear(yearKey)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <CardTitle className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                                        {academicYear.year} - {academicYear.class} ({academicYear.term})
                                      </CardTitle>
                                      <div className="flex items-center gap-4 mt-2">
                                        <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                          Average: <span className="font-semibold text-light-text-primary dark:text-dark-text-primary">{academicYear.averageScore}%</span>
                                        </div>
                                        <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                          Position: <span className="font-semibold text-light-text-primary dark:text-dark-text-primary">{academicYear.position}/{academicYear.totalStudents}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                      {isYearExpanded ? 'Hide Details' : 'Show Details'}
                                    </Button>
                                  </div>
                                </CardHeader>
                                {isYearExpanded && (
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
                                          {academicYear.subjects.map((subject, subjectIndex) => {
                                            const percentage = (subject.score / subject.maxScore) * 100;
                                            return (
                                              <tr
                                                key={subjectIndex}
                                                className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors"
                                              >
                                                <td className="py-3 px-4">
                                                  <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                                    {subject.name}
                                                  </p>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                  <p className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                                                    {subject.score}
                                                  </p>
                                                </td>
                                                <td className="py-3 px-4 text-center text-light-text-secondary dark:text-dark-text-secondary">
                                                  {subject.maxScore}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                  <span
                                                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getGradeColor(
                                                      subject.grade
                                                    )}`}
                                                  >
                                                    {subject.grade}
                                                  </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                  <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                                                    {percentage.toFixed(1)}%
                                                  </p>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </CardContent>
                                )}
                              </Card>
                            </motion.div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Overall Academic Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                    Schools Attended
                  </p>
                  <p className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
                    {academicHistory.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                    Total Certificates
                  </p>
                  <p className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
                    {academicHistory.reduce((sum, school) => sum + school.certificates.length, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                    Current Average
                  </p>
                  <p className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
                    {academicHistory
                      .find((s) => s.endDate === null)
                      ?.academicYears[0]?.averageScore.toFixed(1) || 'N/A'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}

