'use client';

import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Users,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { AutoGenerateButton } from '@/components/ui/AutoGenerateButton';
import {
  useGetMySchoolQuery,
  useGetSubjectsQuery,
  useGetClassLevelsQuery,
  useGetStaffListQuery,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  useAssignTeacherToSubjectMutation,
  useRemoveTeacherFromSubjectMutation,
  type Subject,
  type CreateSubjectDto,
  type UpdateSubjectDto,
} from '@/lib/store/api/schoolAdminApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import { useAutoGenerateSubjects } from '@/hooks/useAutoGenerateSubjects';
import { getTerminology } from '@/lib/utils/terminology';
import toast from 'react-hot-toast';

export default function SubjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [showTeacherModal, setShowTeacherModal] = useState<Subject | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;
  const { currentType } = useSchoolType();
  const terminology = getTerminology(currentType);
  
  // Auto-generate subjects hook
  const {
    isGenerating,
    showConfirmModal,
    openConfirmModal,
    closeConfirmModal,
    handleAutoGenerate,
    canAutoGenerate,
    schoolTypeLabel,
  } = useAutoGenerateSubjects();

  const { data: subjectsResponse, refetch: refetchSubjects } = useGetSubjectsQuery(
    {
      schoolId: schoolId!,
      schoolType: currentType || undefined,
    },
    { skip: !schoolId }
  );

  const { data: classLevelsResponse } = useGetClassLevelsQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId || currentType !== 'SECONDARY' }
  );

  const { data: staffResponse } = useGetStaffListQuery(
    { role: 'Teacher', limit: 100 },
    { skip: !schoolId }
  );

  const [createSubject, { isLoading: isCreating }] = useCreateSubjectMutation();
  const [updateSubject, { isLoading: isUpdating }] = useUpdateSubjectMutation();
  const [deleteSubject, { isLoading: isDeleting }] = useDeleteSubjectMutation();
  const [assignTeacher, { isLoading: isAssigning }] = useAssignTeacherToSubjectMutation();
  const [removeTeacher, { isLoading: isRemoving }] = useRemoveTeacherFromSubjectMutation();

  const subjects = subjectsResponse?.data || [];
  const classLevels = classLevelsResponse?.data || [];
  // Filter to only get teachers (type === 'teacher') from staff list
  const teachers = useMemo(() => {
    const allStaff = staffResponse?.data?.items || [];
    return allStaff
      .filter((staff) => staff.type === 'teacher')
      .map((staff) => ({
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        subject: staff.subject, // Include subject field for filtering
      }));
  }, [staffResponse]);

  // Filter subjects by search query
  const filteredSubjects = useMemo(() => {
    if (!searchQuery) return subjects;
    const query = searchQuery.toLowerCase();
    return subjects.filter(
      (subject) =>
        subject.name.toLowerCase().includes(query) ||
        subject.code?.toLowerCase().includes(query) ||
        subject.description?.toLowerCase().includes(query)
    );
  }, [subjects, searchQuery]);

  // Group subjects by class level for secondary schools
  const groupedSubjects = useMemo(() => {
    if (currentType !== 'SECONDARY') {
      return { all: filteredSubjects };
    }

    const grouped: Record<string, Subject[]> = {
      all: [],
      jss: [],
      sss: [],
    };

    filteredSubjects.forEach((subject) => {
      if (!subject.classLevelId) {
        grouped.all.push(subject);
      } else {
        const classLevel = classLevels.find((cl) => cl.id === subject.classLevelId);
        if (classLevel?.code?.startsWith('JSS')) {
          grouped.jss.push(subject);
        } else if (classLevel?.code?.startsWith('SS')) {
          grouped.sss.push(subject);
        } else {
          grouped.all.push(subject);
        }
      }
    });

    return grouped;
  }, [filteredSubjects, classLevels, currentType]);

  const handleCreateSubject = async (data: CreateSubjectDto) => {
    if (!schoolId) return;

    try {
      await createSubject({
        schoolId,
        data: {
          ...data,
          schoolType: currentType || undefined,
        },
      }).unwrap();
      toast.success('Subject created successfully');
      setShowCreateModal(false);
      refetchSubjects();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create subject');
    }
  };

  const handleUpdateSubject = async (subjectId: string, data: UpdateSubjectDto) => {
    if (!schoolId) return;

    try {
      await updateSubject({
        schoolId,
        subjectId,
        data,
      }).unwrap();
      toast.success('Subject updated successfully');
      setEditingSubject(null);
      refetchSubjects();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update subject');
    }
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    if (!schoolId) return;
    if (!confirm(`Are you sure you want to delete "${subjectName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteSubject({ schoolId, subjectId }).unwrap();
      toast.success('Subject deleted successfully');
      refetchSubjects();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete subject');
    }
  };

  const handleAssignTeacher = async () => {
    if (!schoolId || !showTeacherModal || !selectedTeacherId) return;

    // For PRIMARY schools, check if a teacher is already assigned
    if (currentType === 'PRIMARY' && showTeacherModal.teachers && showTeacherModal.teachers.length > 0) {
      toast.error('Primary schools can only have one teacher per subject. Please remove the existing teacher first.');
      return;
    }

    try {
      await assignTeacher({
        schoolId,
        subjectId: showTeacherModal.id,
        teacherId: selectedTeacherId,
      }).unwrap();
      toast.success('Teacher assigned successfully');
      setShowTeacherModal(null);
      setSelectedTeacherId('');
      refetchSubjects();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to assign teacher');
    }
  };

  const handleRemoveTeacher = async (subjectId: string, teacherId: string) => {
    if (!schoolId) return;

    try {
      await removeTeacher({ schoolId, subjectId, teacherId }).unwrap();
      toast.success('Teacher removed successfully');
      refetchSubjects();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to remove teacher');
    }
  };

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                {currentType === 'TERTIARY' ? 'Courses' : 'Subjects'}
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Manage {currentType === 'TERTIARY' ? 'courses' : 'subjects'} for {currentType || 'your school'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {canAutoGenerate && (
                <AutoGenerateButton
                  onClick={openConfirmModal}
                  isLoading={isGenerating}
                  label="Auto-Generate"
                />
              )}
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add {currentType === 'TERTIARY' ? 'Course' : 'Subject'}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Subjects List */}
        {currentType === 'SECONDARY' ? (
          <div className="space-y-6">
            {groupedSubjects.jss.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-light-text-primary dark:text-dark-text-primary">
                  JSS Subjects
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedSubjects.jss.map((subject) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      onEdit={() => setEditingSubject(subject)}
                      onDelete={() => handleDeleteSubject(subject.id, subject.name)}
                      onAssignTeacher={() => setShowTeacherModal(subject)}
                      onRemoveTeacher={handleRemoveTeacher}
                      isDeleting={isDeleting}
                      currentType={currentType}
                    />
                  ))}
                </div>
              </div>
            )}
            {groupedSubjects.sss.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-light-text-primary dark:text-dark-text-primary">
                  SSS Subjects
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedSubjects.sss.map((subject) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      onEdit={() => setEditingSubject(subject)}
                      onDelete={() => handleDeleteSubject(subject.id, subject.name)}
                      onAssignTeacher={() => setShowTeacherModal(subject)}
                      onRemoveTeacher={handleRemoveTeacher}
                      isDeleting={isDeleting}
                      currentType={currentType}
                    />
                  ))}
                </div>
              </div>
            )}
            {groupedSubjects.all.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4 gap-4">
                  <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary">
                    General Subjects
                  </h2>
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={currentType === 'TERTIARY' ? 'Search courses...' : 'Search subjects...'}
                    containerClassName="w-[40%]"
                    size="lg"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedSubjects.all.map((subject) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      onEdit={() => setEditingSubject(subject)}
                      onDelete={() => handleDeleteSubject(subject.id, subject.name)}
                      onAssignTeacher={() => setShowTeacherModal(subject)}
                      onRemoveTeacher={handleRemoveTeacher}
                      isDeleting={isDeleting}
                      currentType={currentType}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4 gap-4">
              <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary">
                {currentType === 'TERTIARY' ? 'Courses' : 'Subjects'}
              </h2>
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={currentType === 'TERTIARY' ? 'Search courses...' : 'Search subjects...'}
                containerClassName="w-[40%]"
                size="lg"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                onEdit={() => setEditingSubject(subject)}
                onDelete={() => handleDeleteSubject(subject.id, subject.name)}
                onAssignTeacher={() => setShowTeacherModal(subject)}
                onRemoveTeacher={handleRemoveTeacher}
                isDeleting={isDeleting}
                currentType={currentType}
              />
            ))}
            </div>
          </div>
        )}

        {filteredSubjects.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
              <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                {searchQuery 
                  ? `No ${currentType === 'TERTIARY' ? 'courses' : 'subjects'} found matching your search.`
                  : `No ${currentType === 'TERTIARY' ? 'courses' : 'subjects'} added yet.`}
              </p>
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First {currentType === 'TERTIARY' ? 'Course' : 'Subject'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Modal */}
        {(showCreateModal || editingSubject) && (
          <SubjectModal
            subject={editingSubject}
            classLevels={classLevels}
            currentType={currentType}
            onClose={() => {
              setShowCreateModal(false);
              setEditingSubject(null);
            }}
            onSave={editingSubject
              ? (data) => handleUpdateSubject(editingSubject.id, data)
              : handleCreateSubject}
            isLoading={isCreating || isUpdating}
          />
        )}

        {/* Assign Teacher Modal */}
        {showTeacherModal && (
          <AssignTeacherModal
            subject={showTeacherModal}
            teachers={teachers}
            assignedTeachers={showTeacherModal.teachers || []}
            selectedTeacherId={selectedTeacherId}
            onSelectTeacher={setSelectedTeacherId}
            onAssign={handleAssignTeacher}
            onRemove={handleRemoveTeacher}
            onClose={() => {
              setShowTeacherModal(null);
              setSelectedTeacherId('');
            }}
            isLoading={isAssigning || isRemoving}
            currentType={currentType}
          />
        )}

        {/* Auto-Generate Confirmation Modal */}
        {showConfirmModal && (
          <AutoGenerateModal
            schoolTypeLabel={schoolTypeLabel}
            isGenerating={isGenerating}
            onConfirm={handleAutoGenerate}
            onClose={closeConfirmModal}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

// Subject Card Component
function SubjectCard({
  subject,
  onEdit,
  onDelete,
  onAssignTeacher,
  onRemoveTeacher,
  isDeleting,
  currentType,
}: {
  subject: Subject;
  onEdit: () => void;
  onDelete: () => void;
  onAssignTeacher: () => void;
  onRemoveTeacher: (subjectId: string, teacherId: string) => void;
  isDeleting: boolean;
  currentType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{subject.name}</CardTitle>
            {subject.code && (
              <p className="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">
                Code: {subject.code}
              </p>
            )}
            {subject.classLevelName && (
              <p className="text-sm text-light-text-muted dark:text-dark-text-muted">
                Level: {subject.classLevelName}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {subject.description && (
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
            {subject.description}
          </p>
        )}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
              Teachers:
              {currentType === 'PRIMARY' && (
                <span className="text-xs text-light-text-muted dark:text-dark-text-muted block mt-0.5">
                  (One teacher only)
                </span>
              )}
            </span>
            {/* Commented out for PRIMARY schools */}
            {currentType !== 'PRIMARY' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onAssignTeacher}
              >
                <Users className="h-4 w-4 mr-1" />
                Assign
              </Button>
            )}
          </div>
          {subject.teachers && subject.teachers.length > 0 ? (
            <div className="space-y-1">
              {subject.teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded"
                >
                  <span>
                    {teacher.firstName} {teacher.lastName}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveTeacher(subject.id, teacher.id)}
                    className="text-red-600 hover:text-red-700 h-6 px-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-light-text-muted dark:text-dark-text-muted">
              No teachers assigned
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Subject Create/Edit Modal
function SubjectModal({
  subject,
  classLevels,
  currentType,
  onClose,
  onSave,
  isLoading,
}: {
  subject: Subject | null;
  classLevels: Array<{ id: string; name: string; code?: string; type: string }>;
  currentType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
  onClose: () => void;
  onSave: (data: CreateSubjectDto | UpdateSubjectDto) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(subject?.name || '');
  const [code, setCode] = useState(subject?.code || '');
  const [description, setDescription] = useState(subject?.description || '');
  const [classLevelId, setClassLevelId] = useState(subject?.classLevelId || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Subject name is required');
      return;
    }

    onSave({
      name: name.trim(),
      code: code.trim() || undefined,
      description: description.trim() || undefined,
      classLevelId: classLevelId || undefined,
    });
  };

  // Filter class levels for secondary schools (JSS vs SSS)
  const filteredClassLevels = useMemo(() => {
    if (currentType !== 'SECONDARY') return [];
    return classLevels.filter((cl) => cl.type === 'SECONDARY');
  }, [classLevels, currentType]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-dark-surface rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
            {subject ? `Edit ${currentType === 'TERTIARY' ? 'Course' : 'Subject'}` : `Create ${currentType === 'TERTIARY' ? 'Course' : 'Subject'}`}
          </h3>
          <button
            onClick={onClose}
            className="text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
              {currentType === 'TERTIARY' ? 'Course' : 'Subject'} Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={currentType === 'TERTIARY' ? "e.g., Introduction to Computer Science" : "e.g., Mathematics"}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
              {currentType === 'TERTIARY' ? 'Course' : 'Subject'} Code
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={currentType === 'TERTIARY' ? "e.g., CS101" : "e.g., MATH"}
            />
          </div>

          {currentType === 'SECONDARY' && filteredClassLevels.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                Class Level (Optional)
              </label>
              <select
                value={classLevelId}
                onChange={(e) => setClassLevelId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-surface"
              >
                <option value="">All Secondary Levels</option>
                {filteredClassLevels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                Leave blank to apply to all secondary levels, or select a specific level (JSS/SSS)
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-surface"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !name.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {subject ? 'Update' : 'Create'}
                </>
              )}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Assign Teacher Modal
function AssignTeacherModal({
  subject,
  teachers,
  assignedTeachers,
  selectedTeacherId,
  onSelectTeacher,
  onAssign,
  onRemove,
  onClose,
  isLoading,
  currentType,
}: {
  subject: Subject;
  teachers: Array<{ id: string; firstName: string; lastName: string; subject?: string | null }>;
  assignedTeachers: Array<{ id: string; firstName: string; lastName: string }>;
  selectedTeacherId: string;
  onSelectTeacher: (teacherId: string) => void;
  onAssign: () => void;
  onRemove: (subjectId: string, teacherId: string) => void;
  onClose: () => void;
  isLoading: boolean;
  currentType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
}) {
  // For SECONDARY schools, filter teachers by subject name match
  // For other school types, show all teachers
  // Use flexible matching: check if teacher's subject contains subject name or vice versa
  const filteredTeachers = currentType === 'SECONDARY' 
    ? teachers.filter((t) => {
        if (!t.subject) return false;
        const teacherSubject = t.subject.trim().toLowerCase();
        const subjectName = subject.name.trim().toLowerCase();
        // Match if teacher's subject contains subject name or subject name contains teacher's subject
        return teacherSubject === subjectName || 
               teacherSubject.includes(subjectName) || 
               subjectName.includes(teacherSubject);
      })
    : teachers;
  
  const availableTeachers = filteredTeachers.filter(
    (t) => !assignedTeachers.some((at) => at.id === t.id)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-dark-surface rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
            Assign Teachers to {subject.name}
            {currentType === 'PRIMARY' && (
              <span className="text-sm font-normal text-light-text-muted dark:text-dark-text-muted block mt-1">
                (Primary schools: One teacher per subject)
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {assignedTeachers.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                Assigned Teachers
              </label>
              <div className="space-y-2">
                {assignedTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                  >
                    <span>
                      {teacher.firstName} {teacher.lastName}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(subject.id, teacher.id)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {availableTeachers.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                Available Teachers
                {currentType === 'PRIMARY' && assignedTeachers.length > 0 && (
                  <span className="text-xs text-yellow-600 dark:text-yellow-400 block mt-1">
                    Remove the existing teacher first to assign a new one
                  </span>
                )}
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => onSelectTeacher(e.target.value)}
                disabled={currentType === 'PRIMARY' && assignedTeachers.length > 0}
                className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-surface mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select a teacher...</option>
                {availableTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.firstName} {teacher.lastName}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                onClick={onAssign}
                disabled={!selectedTeacherId || isLoading || (currentType === 'PRIMARY' && assignedTeachers.length > 0)}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Assign Teacher
                  </>
                )}
              </Button>
            </div>
          )}

          {availableTeachers.length === 0 && (
            <p className="text-sm text-light-text-muted dark:text-dark-text-muted text-center py-4">
              {currentType === 'SECONDARY' && filteredTeachers.length === 0
                ? `No teachers registered with subject "${subject.name}" found. Please add teachers with this subject name first.`
                : 'All teachers are already assigned to this subject.'}
            </p>
          )}
        </div>

        <div className="mt-6">
          <Button variant="ghost" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// Auto-Generate Confirmation Modal
function AutoGenerateModal({
  schoolTypeLabel,
  isGenerating,
  onConfirm,
  onClose,
}: {
  schoolTypeLabel: string;
  isGenerating: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-dark-surface rounded-lg p-6 max-w-md w-full mx-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
              Auto-Generate Subjects
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            This will add standard {schoolTypeLabel} subjects to your school. 
            Existing subjects with the same name or code will be skipped.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                You can delete any unwanted subjects after generation.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="primary"
              onClick={onConfirm}
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Subjects
                </>
              )}
            </Button>
            <Button 
              variant="ghost" 
              onClick={onClose}
              disabled={isGenerating}
            >
              Cancel
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

