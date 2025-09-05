'use client';

import { Clock, MapPin, Calendar } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

interface CompactEventCardProps {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  type: 'ACADEMIC' | 'EVENT' | 'EXAM' | 'MEETING' | 'HOLIDAY' | 'TIMETABLE';
  location?: string;
  roomName?: string;
  onClick?: () => void;
}

const eventTypeBadgeColors: Record<string, string> = {
  ACADEMIC: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  EVENT: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  EXAM: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  MEETING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  HOLIDAY: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  TIMETABLE: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
};

export function CompactEventCard({
  title,
  startDate,
  endDate,
  type,
  location,
  roomName,
  onClick,
}: CompactEventCardProps) {
  const getDateLabel = () => {
    if (isToday(startDate)) return 'Today';
    if (isTomorrow(startDate)) return 'Tomorrow';
    return format(startDate, 'MMM d');
  };

  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-100 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors cursor-pointer ${
        onClick ? '' : 'cursor-default'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-sm text-light-text-primary dark:text-dark-text-primary flex-1">
          {title}
        </h4>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${eventTypeBadgeColors[type]}`}>
          {type}
        </span>
      </div>
      <div className="space-y-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          <span>{getDateLabel()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          <span>
            {formatTime(startDate)} - {formatTime(endDate)}
          </span>
        </div>
        {(location || roomName) && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            <span>{roomName || location}</span>
          </div>
        )}
      </div>
    </div>
  );
}

