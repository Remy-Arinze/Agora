'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { motion } from 'framer-motion';
import { BookOpen, Search, User, Clock, MapPin } from 'lucide-react';

// Mock data - will be replaced with API calls later
const mockClasses = [
  {
    id: '1',
    subject: 'Mathematics',
    code: 'MATH101',
    teacher: 'Mr. Sarah Williams',
    teacherEmail: 'sarah.w@school.com',
    schedule: 'Mon, Wed, Fri - 9:00 AM',
    room: 'Room 101',
    credits: 3,
    description: 'Introduction to algebra, geometry, and basic calculus',
  },
  {
    id: '2',
    subject: 'English Language',
    code: 'ENG102',
    teacher: 'Mrs. David Brown',
    teacherEmail: 'david.b@school.com',
    schedule: 'Tue, Thu - 10:30 AM',
    room: 'Room 205',
    credits: 3,
    description: 'Grammar, composition, and literature analysis',
  },
  {
    id: '3',
    subject: 'Physics',
    code: 'PHY103',
    teacher: 'Dr. Emily Davis',
    teacherEmail: 'emily.d@school.com',
    schedule: 'Mon, Wed - 2:00 PM',
    room: 'Lab 3',
    credits: 4,
    description: 'Mechanics, thermodynamics, and electromagnetism',
  },
  {
    id: '4',
    subject: 'Chemistry',
    code: 'CHEM104',
    teacher: 'Mr. Michael Johnson',
    teacherEmail: 'michael.j@school.com',
    schedule: 'Tue, Thu - 1:00 PM',
    room: 'Lab 2',
    credits: 4,
    description: 'Organic and inorganic chemistry fundamentals',
  },
  {
    id: '5',
    subject: 'Biology',
    code: 'BIO105',
    teacher: 'Ms. Jennifer Wilson',
    teacherEmail: 'jennifer.w@school.com',
    schedule: 'Fri - 11:00 AM',
    room: 'Lab 1',
    credits: 3,
    description: 'Cell biology, genetics, and ecology',
  },
  {
    id: '6',
    subject: 'History',
    code: 'HIS106',
    teacher: 'Dr. Robert Martinez',
    teacherEmail: 'robert.m@school.com',
    schedule: 'Mon, Wed - 3:30 PM',
    room: 'Room 302',
    credits: 2,
    description: 'World history and Nigerian history',
  },
];

export default function StudentClassesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClasses = mockClasses.filter(
    (classItem) =>
      classItem.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      classItem.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      classItem.teacher.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            My Classes
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            View all your enrolled classes for the current term
          </p>
        </motion.div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
              <Input
                placeholder="Search by subject, code, or teacher..."
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
                <Card className="h-full hover:shadow-lg transition-shadow">
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
                        {classItem.credits} Credits
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                            {classItem.teacher}
                          </p>
                          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            {classItem.teacherEmail}
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

