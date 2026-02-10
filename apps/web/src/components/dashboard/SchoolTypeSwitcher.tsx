'use client';

import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, University } from 'lucide-react';
import { useSchoolType } from '@/hooks/useSchoolType';
import { cn } from '@/lib/utils';

const typeConfig = {
  PRIMARY: {
    label: 'Primary',
    icon: GraduationCap,
    color: 'from-blue-500 to-blue-600',
  },
  SECONDARY: {
    label: 'Secondary',
    icon: BookOpen,
    color: 'from-purple-500 to-purple-600',
  },
  TERTIARY: {
    label: 'Tertiary',
    icon: University,
    color: 'from-emerald-600 to-emerald-700',
  },
} as const;

export function SchoolTypeSwitcher() {
  const { isMixed, availableTypes, currentType, setCurrentType } = useSchoolType();

  // Don't render if school is not mixed
  if (!isMixed || availableTypes.length <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 p-0.5 rounded-md">
      {availableTypes.map((type) => {
        const config = typeConfig[type];
        const Icon = config.icon;
        const isActive = currentType === type;

        return (
          <button
            key={type}
            onClick={() => setCurrentType(type)}
            className={cn(
              'relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 overflow-hidden',
              'focus:outline-none focus:ring-0',
              isActive
                ? 'text-white'
                : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
            )}
          >
            <motion.div
              layoutId={`activeType-${type}`}
              className={cn(
                'absolute inset-0 rounded-md bg-gradient-to-r',
                config.color,
                'shadow-sm z-0'
              )}
              initial={false}
              animate={{
                opacity: isActive ? 1 : 0,
                scale: isActive ? 1 : 0.95,
              }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
              }}
            />
            <Icon
              className={cn(
                'relative z-10 h-3 w-3 transition-colors',
                isActive ? 'text-white' : 'text-light-text-secondary dark:text-dark-text-secondary'
              )}
            />
            <span className="relative z-10">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
