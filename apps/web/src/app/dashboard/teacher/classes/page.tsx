'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { BookOpen, Search, Users, Clock, MapPin, User, GraduationCap } from 'lucide-react';

// Mock data - will be replaced with API calls later
const mockClasses = [
  {
    id: '1',
    subject: 'Mathematics',
    code: 'MATH101',
    classLevel: 'JSS2',
    schedule: 'Mon, Wed, Fri - 9:00 AM',
    room: 'Room 101',
    students: 35,
    description: 'Introduction to algebra, geometry, and basic calculus',
  },
  {
    id: '2',
    subject: 'Advanced Mathematics',
    code: 'MATH201',
    classLevel: 'SS1',
    schedule: 'Tue, Thu - 10:30 AM',
    room: 'Room 205',
    students: 28,
    description: 'Advanced algebra, trigonometry, and calculus',
  },
  {
    id: '3',
    subject: 'Mathematics',
    code: 'MATH301',
    classLevel: 'SS2',
    schedule: 'Mon, Wed - 2:00 PM',
    room: 'Room 302',
    students: 32,
    description: 'Further mathematics and statistics',
  },
];

export default function TeacherClassesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClasses = mockClasses.filter(
    (classItem) =>
      classItem.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      classItem.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      classItem.classLevel.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
            My Classes
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Manage your classes and view student information
          </p>
        </motion.div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
              <Input
                placeholder="Search by subject, code, or class level..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <BookOpen className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                No classes found matching your search.
              </p>
            </div>
          ) : (
            filteredClasses.map((classItem, index) => (
              <motion.div
                key={classItem.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/dashboard/teacher/classes/${classItem.id}`)}>
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
                      <div className="flex items-start gap-2">
                        <Users className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                            {classItem.students} Students
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          {classItem.schedule}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          {classItem.room}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-light-border dark:border-dark-border">
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                          {classItem.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/teacher/classes/${classItem.id}`);
                        }}
                      >
                        View Class Details →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

