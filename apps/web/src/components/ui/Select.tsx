'use client';

import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Additional class name for the wrapper div */
  wrapperClassName?: string;
  /** If true, the wrapper div will not have w-full */
  inline?: boolean;
  /** Custom label class name */
  labelClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    id, 
    children,
    wrapperClassName,
    inline = false,
    labelClassName,
    required,
    ...props 
  }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={cn(inline ? '' : 'w-full', wrapperClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              "block text-sm font-medium text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] mb-1",
              labelClassName
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full px-4 py-2 border rounded-lg',
            'bg-[var(--light-input)] dark:bg-[var(--dark-input)]',
            'text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)]',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent',
            'transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
              : 'border-[var(--light-border)] dark:border-[var(--dark-border)]',
            className
          )}
          required={required}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

