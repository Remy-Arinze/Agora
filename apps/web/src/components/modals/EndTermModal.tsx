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
  termEndDate?: string; // ISO date string for the term's scheduled end date
}

export function EndTermModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  termName,
  sessionName,
  termLabel = 'Term',
  termEndDate,
}: EndTermModalProps) {
  const displayName = termName && sessionName 
    ? `${sessionName} - ${termName}`
    : termName || sessionName || `the current ${termLabel.toLowerCase()}`;

  // Calculate if ending early
  const isEndingEarly = termEndDate ? new Date(termEndDate) > new Date() : false;
  const daysRemaining = termEndDate 
    ? Math.ceil((new Date(termEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const baseMessage = `Are you sure you want to end ${displayName}?`;
  
  const earlyWarning = isEndingEarly 
    ? `\n\n⚠️ WARNING: You are ending this ${termLabel.toLowerCase()} ${daysRemaining} days before its scheduled end date (${new Date(termEndDate!).toLocaleDateString()}). If you end it now, you can continue it later from the session wizard as long as the end date hasn't passed.`
    : '';

  const standardMessage = `\n\nThis action will mark the ${termLabel.toLowerCase()} as completed. You will need to start a new ${termLabel.toLowerCase()} to continue operations.`;

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={isEndingEarly ? `End ${termLabel} Early?` : `End ${termLabel}`}
      message={baseMessage + earlyWarning + standardMessage}
      confirmText={isEndingEarly ? `End ${termLabel} Early` : `End ${termLabel}`}
      cancelText="Cancel"
      variant={isEndingEarly ? 'danger' : 'warning'}
      isLoading={isLoading}
    />
  );
}

