'use client';

import { ConfirmModal } from '@/components/ui/Modal';

interface EndTermModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  termName?: string;
  sessionName?: string;
  termLabel?: string; // "Term" or "Semester"
}

export function EndTermModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  termName,
  sessionName,
  termLabel = 'Term',
}: EndTermModalProps) {
  const displayName = termName && sessionName 
    ? `${sessionName} - ${termName}`
    : termName || sessionName || `the current ${termLabel.toLowerCase()}`;

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`End ${termLabel}`}
      message={`Are you sure you want to end ${displayName}? This action will mark the ${termLabel.toLowerCase()} as completed and cannot be undone. You will need to start a new ${termLabel.toLowerCase()} to continue operations.`}
      confirmText={`End ${termLabel}`}
      cancelText="Cancel"
      variant="warning"
      isLoading={isLoading}
    />
  );
}

