'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ErrorList } from './ErrorList';
import { ErrorStats } from './ErrorStats';
import { AlertTriangle, BarChart3, List } from 'lucide-react';

interface ErrorsSectionProps {
  schoolId: string;
}

type Tab = 'errors' | 'stats';

export function ErrorsSection({ schoolId }: ErrorsSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>('stats');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
              Errors & Logs
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'stats'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-hover'
              }`}
              style={{ fontSize: 'var(--text-body)' }}
            >
              <BarChart3 className="h-4 w-4" />
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('errors')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'errors'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-hover'
              }`}
              style={{ fontSize: 'var(--text-body)' }}
            >
              <List className="h-4 w-4" />
              Recent Errors
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === 'stats' ? (
          <ErrorStats schoolId={schoolId} />
        ) : (
          <ErrorList schoolId={schoolId} />
        )}
      </CardContent>
    </Card>
  );
}
