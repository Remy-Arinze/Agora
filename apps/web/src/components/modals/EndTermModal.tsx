'use client';

import { ConfirmModal } from '@/components/ui/Modal';
import { AlertCircle } from 'lucide-react';

interface EndTermModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  termName?: string;
  sessionName?: string;
}

export function EndTermModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  termName,
  sessionName,
}: EndTermModalProps) {
  const displayName = termName && sessionName 
    ? `${sessionName} - ${termName}`
    : termName || sessionName || 'the current term';

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="End Term"
      message={`Are you sure you want to end ${displayName}? This action will mark the term as completed and cannot be undone. You will need to start a new term to continue operations.`}
      confirmText="End Term"
      cancelText="Cancel"
      variant="warning"
      isLoading={isLoading}
    />
  );
}

