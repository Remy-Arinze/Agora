'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { FileText, Download, TrendingUp, Award } from 'lucide-react';

// Mock data - will be replaced with API calls later
const mockResults = [
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

export default function StudentResultsPage() {
  const [selectedTerm, setSelectedTerm] = useState(0);

  const currentResults = mockResults[selectedTerm];

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
                My Results
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                View your academic performance for the current school
              </p>
            </div>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </motion.div>

        {/* Term Selector */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              {mockResults.map((result, index) => (
                <Button
                  key={index}
                  variant={selectedTerm === index ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedTerm(index)}
                >
                  {result.term}
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
                    {currentResults.averageScore}%
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
                    {currentResults.position}
                    <span className="text-lg text-light-text-secondary dark:text-dark-text-secondary">
                      {' '}/ {currentResults.totalStudents}
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
                    {currentResults.totalScore}
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
            <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
              Subject Breakdown - {currentResults.term}
            </CardTitle>
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
                  {currentResults.subjects.map((subject, index) => {
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
    </ProtectedRoute>
  );
}

