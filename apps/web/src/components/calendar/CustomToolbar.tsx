'use client';

import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight, Calendar, RefreshCw } from 'lucide-react';
import { ToolbarProps } from 'react-big-calendar';

export function CustomToolbar<T = any>({ label, onNavigate, onView, view }: ToolbarProps<T>) {
  const goToBack = () => {
    onNavigate('PREV');
  };

  const goToNext = () => {
    onNavigate('NEXT');
  };

  const goToToday = () => {
    onNavigate('TODAY');
  };

  const handleViewChange = (newView: 'month' | 'week' | 'day' | 'agenda') => {
    onView(newView);
  };

  return (
    <div className="flex items-center justify-between mb-4 p-4 bg-blue-50 dark:bg-dark-surface rounded-lg border border-light-border dark:border-dark-border">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={goToBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={goToNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
        <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary ml-4">
          {label}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={view}
          onChange={(e) => handleViewChange(e.target.value as 'month' | 'week' | 'day' | 'agenda')}
          className="px-3 py-1.5 text-sm border border-light-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="month">Month</option>
          <option value="week">Week</option>
          <option value="day">Day</option>
          <option value="agenda">Agenda</option>
        </select>
      </div>
    </div>
  );
}

