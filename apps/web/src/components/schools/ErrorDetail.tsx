'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ApplicationError, ErrorStatus, ErrorSeverity } from '@/lib/store/api/operationsApi';
import { X, CheckCircle2, Clock, EyeOff, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface ErrorDetailProps {
  error: ApplicationError;
  onClose: () => void;
  onStatusUpdate: (status: ErrorStatus) => void;
}

const severityColors: Record<ErrorSeverity, string> = {
  LOW: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  MEDIUM: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  HIGH: 'bg-red-500/20 text-red-500 border-red-500/30',
  CRITICAL: 'bg-red-700/20 text-red-700 border-red-700/30',
};

const statusColors: Record<ErrorStatus, string> = {
  UNRESOLVED: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
  INVESTIGATING: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  RESOLVED: 'bg-green-500/20 text-green-500 border-green-500/30',
  IGNORED: 'bg-gray-400/20 text-gray-400 border-gray-400/30',
};

export function ErrorDetail({ error, onClose, onStatusUpdate }: ErrorDetailProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Error Details" size="xl">
      <div className="p-6">

        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={severityColors[error.severity]}>
              {error.severity}
            </Badge>
            <Badge className={statusColors[error.status]}>
              {error.status}
            </Badge>
            {error.occurrences > 1 && (
              <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                Occurred {error.occurrences} times
              </Badge>
            )}
          </div>

          {/* Error Type */}
          <div>
            <label
              className="block text-sm font-medium mb-2 text-gray-700 dark:text-dark-text-secondary"
              style={{ fontSize: 'var(--text-small)' }}
            >
              Error Type
            </label>
            <p
              className="font-mono text-gray-900 dark:text-dark-text-primary"
              style={{ fontSize: 'var(--text-body)' }}
            >
              {error.errorType}
            </p>
          </div>

          {/* Message */}
          <div>
            <label
              className="block text-sm font-medium mb-2 text-gray-700 dark:text-dark-text-secondary"
              style={{ fontSize: 'var(--text-small)' }}
            >
              Message
            </label>
            <p
              className="text-gray-900 dark:text-dark-text-primary whitespace-pre-wrap"
              style={{ fontSize: 'var(--text-body)' }}
            >
              {error.message}
            </p>
          </div>

          {/* Stack Trace */}
          {error.stackTrace && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary"
                  style={{ fontSize: 'var(--text-small)' }}
                >
                  Stack Trace
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(error.stackTrace || '')}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
              <pre
                className="p-4 bg-gray-100 dark:bg-dark-input rounded-lg overflow-x-auto text-xs font-mono"
                style={{ fontSize: 'var(--text-small)' }}
              >
                {error.stackTrace}
              </pre>
            </div>
          )}

          {/* Context */}
          {error.context && (
            <div>
              <label
                className="block text-sm font-medium mb-2 text-gray-700 dark:text-dark-text-secondary"
                style={{ fontSize: 'var(--text-small)' }}
              >
                Request Context
              </label>
              <div className="p-4 bg-gray-50 dark:bg-dark-input rounded-lg space-y-2">
                {error.context.method && error.context.path && (
                  <div>
                    <span className="font-semibold" style={{ fontSize: 'var(--text-small)' }}>
                      Method & Path:
                    </span>
                    <span className="ml-2 font-mono" style={{ fontSize: 'var(--text-body)' }}>
                      {error.context.method} {error.context.path}
                    </span>
                  </div>
                )}
                {error.context.ip && (
                  <div>
                    <span className="font-semibold" style={{ fontSize: 'var(--text-small)' }}>
                      IP Address:
                    </span>
                    <span className="ml-2" style={{ fontSize: 'var(--text-body)' }}>
                      {error.context.ip}
                    </span>
                  </div>
                )}
                {error.context.userAgent && (
                  <div>
                    <span className="font-semibold" style={{ fontSize: 'var(--text-small)' }}>
                      User Agent:
                    </span>
                    <span className="ml-2 font-mono text-xs" style={{ fontSize: 'var(--text-small)' }}>
                      {error.context.userAgent}
                    </span>
                  </div>
                )}
                {error.context.body && (
                  <div>
                    <span className="font-semibold" style={{ fontSize: 'var(--text-small)' }}>
                      Request Body:
                    </span>
                    <pre className="mt-1 p-2 bg-white dark:bg-dark-surface rounded text-xs font-mono overflow-x-auto">
                      {JSON.stringify(error.context.body, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1 text-gray-700 dark:text-dark-text-secondary"
                style={{ fontSize: 'var(--text-small)' }}
              >
                First Seen
              </label>
              <p style={{ fontSize: 'var(--text-body)' }}>
                {new Date(error.firstSeen).toLocaleString()}
              </p>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1 text-gray-700 dark:text-dark-text-secondary"
                style={{ fontSize: 'var(--text-small)' }}
              >
                Last Seen
              </label>
              <p style={{ fontSize: 'var(--text-body)' }}>
                {new Date(error.lastSeen).toLocaleString()}
              </p>
            </div>
          </div>

          {/* User Info */}
          {error.user && (
            <div>
              <label
                className="block text-sm font-medium mb-2 text-gray-700 dark:text-dark-text-secondary"
                style={{ fontSize: 'var(--text-small)' }}
              >
                User
              </label>
              <p style={{ fontSize: 'var(--text-body)' }}>
                {error.user.firstName} {error.user.lastName} ({error.user.email})
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-dark-border">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onStatusUpdate('RESOLVED')}
              disabled={error.status === 'RESOLVED'}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Resolved
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onStatusUpdate('INVESTIGATING')}
              disabled={error.status === 'INVESTIGATING'}
            >
              <Clock className="h-4 w-4 mr-2" />
              Mark Investigating
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStatusUpdate('IGNORED')}
              disabled={error.status === 'IGNORED'}
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Ignore
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
