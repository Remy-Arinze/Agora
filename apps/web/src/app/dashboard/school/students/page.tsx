'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { motion } from 'framer-motion';
import { GraduationCap, Plus, Search, FileSpreadsheet } from 'lucide-react';

// Mock data - will be replaced with API calls later
const mockStudents = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    admissionNumber: 'ADM001',
    classLevel: 'JSS2',
    email: 'john.doe@school.com',
    phone: '+234 801 234 5678',
    status: 'active' as const,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    admissionNumber: 'ADM002',
    classLevel: 'SS1',
    email: 'jane.smith@school.com',
    phone: '+234 802 345 6789',
    status: 'active' as const,
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    firstName: 'Michael',
    lastName: 'Johnson',
    admissionNumber: 'ADM003',
    classLevel: 'JSS1',
    email: 'michael.j@school.com',
    phone: '+234 803 456 7890',
    status: 'active' as const,
    createdAt: '2024-01-10',
  },
];

export default function StudentsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = mockStudents.filter(
    (student) =>
      student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.classLevel.toLowerCase().includes(searchQuery.toLowerCase())
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
                Students
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Manage all students in your school
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/school/students/add">
                <Button variant="primary" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </Link>
              <Link href="/dashboard/school/import">
                <Button variant="ghost" size="sm">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                  <Input
                    placeholder="Search by name, admission number, or class..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
              All Students ({filteredStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                <p className="text-light-text-secondary dark:text-dark-text-secondary">
                  No students found. Click "Add Student" to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-light-border dark:border-dark-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                        Admission Number
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                        Class
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                        Contact
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => (
                      <motion.tr
                        key={student.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/school/students/${student.id}`)}
                      >
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                              {student.firstName} {student.lastName}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          {student.admissionNumber}
                        </td>
                        <td className="py-4 px-4 text-sm text-light-text-primary dark:text-dark-text-primary font-medium">
                          {student.classLevel}
                        </td>
                        <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          {student.email}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              student.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {student.status}
                          </span>
                        </td>
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center space-x-2">
                            <Link href={`/dashboard/school/students/${student.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

