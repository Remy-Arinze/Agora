'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  useGetSchoolErrorsQuery,
  useUpdateErrorStatusMutation,
  ApplicationError,
  ErrorSeverity,
  ErrorStatus,
} from '@/lib/store/api/operationsApi';
import { AlertTriangle, CheckCircle2, Eye, XCircle, Clock, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { ErrorDetail } from './ErrorDetail';

interface ErrorListProps {
  schoolId: string;
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

export function ErrorList({ schoolId }: ErrorListProps) {
  const [filters, setFilters] = useState<{
    severity?: ErrorSeverity;
    status?: ErrorStatus;
    errorType?: string;
  }>({});
  const [selectedError, setSelectedError] = useState<ApplicationError | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useGetSchoolErrorsQuery({
    schoolId,
    filters: {
      ...filters,
      limit: 50,
      offset: 0,
    },
  });

  const [updateStatus] = useUpdateErrorStatusMutation();

  const handleStatusUpdate = async (errorId: string, status: ErrorStatus) => {
    try {
      await updateStatus({ errorId, status }).unwrap();
      toast.success(`Error marked as ${status.toLowerCase()}`);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update error status');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p style={{ fontSize: 'var(--text-body)' }}>Loading errors...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p style={{ fontSize: 'var(--text-body)' }}>Failed to load errors</p>
        </CardContent>
      </Card>
    );
  }

  const errors = data?.errors || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          <h3
            className="text-xl font-bold text-gray-900 dark:text-dark-text-primary"
            style={{ fontSize: 'var(--text-section-title)' }}
          >
            Recent Errors ({total})
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="border-b border-gray-200 dark:border-dark-border pb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ fontSize: 'var(--text-small)' }}>
                  Severity
                </label>
                <select
                  value={filters.severity || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, severity: e.target.value as ErrorSeverity || undefined })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input"
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  <option value="">All</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ fontSize: 'var(--text-small)' }}>
                  Status
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value as ErrorStatus || undefined })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input"
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  <option value="">All</option>
                  <option value="UNRESOLVED">Unresolved</option>
                  <option value="INVESTIGATING">Investigating</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="IGNORED">Ignored</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ fontSize: 'var(--text-small)' }}>
                  Error Type
                </label>
                <input
                  type="text"
                  value={filters.errorType || ''}
                  onChange={(e) => setFilters({ ...filters, errorType: e.target.value || undefined })}
                  placeholder="Filter by type..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input"
                  style={{ fontSize: 'var(--text-body)' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {errors.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p style={{ fontSize: 'var(--text-body)' }}>No errors found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {errors.map((error) => (
                <div
                  key={error.id}
                  className="p-4 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={severityColors[error.severity]}>
                          {error.severity}
                        </Badge>
                        <Badge className={statusColors[error.status]}>
                          {error.status}
                        </Badge>
                        {error.occurrences > 1 && (
                          <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                            {error.occurrences}x
                          </Badge>
                        )}
                      </div>
                      <h4
                        className="font-semibold mb-1 text-gray-900 dark:text-dark-text-primary"
                        style={{ fontSize: 'var(--text-card-title)' }}
                      >
                        {error.errorType}
                      </h4>
                      <p
                        className="text-gray-600 dark:text-dark-text-secondary mb-2 line-clamp-2"
                        style={{ fontSize: 'var(--text-body)' }}
                      >
                        {error.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-dark-text-muted">
                        <span>
                          First seen: {new Date(error.firstSeen).toLocaleDateString()}
                        </span>
                        <span>
                          Last seen: {new Date(error.lastSeen).toLocaleDateString()}
                        </span>
                        {error.context?.path && (
                          <span className="font-mono">{error.context.method} {error.context.path}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedError(error)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {error.status !== 'RESOLVED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusUpdate(error.errorId, 'RESOLVED')}
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                      {error.status === 'UNRESOLVED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusUpdate(error.errorId, 'INVESTIGATING')}
                        >
                          <Clock className="h-4 w-4 text-blue-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

      {selectedError && (
        <ErrorDetail
          error={selectedError}
          onClose={() => setSelectedError(null)}
          onStatusUpdate={(status) => {
            handleStatusUpdate(selectedError.errorId, status);
            setSelectedError(null);
          }}
        />
      )}
    </div>
  );
}
