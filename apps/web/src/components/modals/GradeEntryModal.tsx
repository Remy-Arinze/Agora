'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateGradeMutation } from '@/lib/store/api/schoolAdminApi';
import type { GradeType, CreateGradeDto, StudentWithEnrollment } from '@/lib/store/api/schoolAdminApi';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

interface GradeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  student: StudentWithEnrollment;
  classId?: string;
  subject?: string;
  termId?: string;
  academicYear?: string;
  onSuccess?: () => void;
}

export function GradeEntryModal({
  isOpen,
  onClose,
  schoolId,
  student,
  classId,
  subject,
  termId,
  academicYear,
  onSuccess,
}: GradeEntryModalProps) {
  const [formData, setFormData] = useState<CreateGradeDto>({
    enrollmentId: student.enrollment?.id || '',
    subject: subject || '',
    gradeType: 'CA',
    assessmentName: '',
    assessmentDate: undefined,
    sequence: undefined,
    score: 0,
    maxScore: 100,
    termId: termId,
    academicYear: academicYear,
    remarks: '',
    isPublished: false,
  });

  const [createGrade, { isLoading }] = useCreateGradeMutation();

  useEffect(() => {
    if (isOpen && student) {
      setFormData({
        enrollmentId: student.enrollment?.id || '',
        subject: subject || '',
        gradeType: 'CA',
        assessmentName: '',
        assessmentDate: undefined,
        sequence: undefined,
        score: 0,
        maxScore: 100,
        termId: termId,
        academicYear: academicYear,
        remarks: '',
        isPublished: false,
      });
    }
  }, [isOpen, student, subject, termId, academicYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.enrollmentId) {
      toast.error('Student enrollment not found');
      return;
    }

    if (formData.score < 0 || formData.score > formData.maxScore) {
      toast.error(`Score must be between 0 and ${formData.maxScore}`);
      return;
    }

    if (formData.assessmentDate && new Date(formData.assessmentDate) > new Date()) {
      toast.error('Assessment date cannot be in the future');
      return;
    }

    try {
      await createGrade({
        schoolId,
        gradeData: {
          ...formData,
          enrollmentId: formData.enrollmentId,
        },
      }).unwrap();

      toast.success('Grade created successfully');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create grade');
    }
  };

  const percentage = formData.maxScore > 0 
    ? ((formData.score / formData.maxScore) * 100).toFixed(1)
    : '0.0';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enter Grade"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
            Student
          </label>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            {student.firstName} {student.middleName ? `${student.middleName} ` : ''}{student.lastName} ({student.uid})
          </p>
        </div>

        {subject && (
          <div>
            <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
              Subject
            </label>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              {subject}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
            Grade Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.gradeType}
            onChange={(e) => setFormData({ ...formData, gradeType: e.target.value as GradeType })}
            className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-bg dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
            required
          >
            <option value="CA">CA (Continuous Assessment)</option>
            <option value="ASSIGNMENT">Assignment</option>
            <option value="EXAM">Exam</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
            Assessment Name (Optional)
          </label>
          <Input
            type="text"
            value={formData.assessmentName || ''}
            onChange={(e) => setFormData({ ...formData, assessmentName: e.target.value || undefined })}
            placeholder="e.g., CA1, Assignment 1, First Term Exam"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
              Assessment Date (Optional)
            </label>
            <Input
              type="date"
              value={formData.assessmentDate || ''}
              onChange={(e) => setFormData({ ...formData, assessmentDate: e.target.value || undefined })}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
              Sequence (Optional)
            </label>
            <Input
              type="number"
              value={formData.sequence || ''}
              onChange={(e) => setFormData({ ...formData, sequence: e.target.value ? parseInt(e.target.value) : undefined })}
              min={1}
              placeholder="e.g., 1, 2, 3"
            />
            <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
              Order of assessment
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
              Score <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={formData.score}
              onChange={(e) => setFormData({ ...formData, score: parseFloat(e.target.value) || 0 })}
              min={0}
              max={formData.maxScore}
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
              Max Score <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={formData.maxScore}
              onChange={(e) => setFormData({ ...formData, maxScore: parseFloat(e.target.value) || 100 })}
              min={0}
              step="0.01"
              required
            />
          </div>
        </div>

        {formData.maxScore > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Percentage: <span className="font-semibold">{percentage}%</span>
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
            Remarks (Optional)
          </label>
          <textarea
            value={formData.remarks || ''}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value || undefined })}
            rows={3}
            className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-bg dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary resize-none"
            placeholder="Additional notes or comments..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Grade'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
