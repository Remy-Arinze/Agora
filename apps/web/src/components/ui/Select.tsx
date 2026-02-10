'use client';

import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

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
  /** Left icon (e.g., Calendar icon) */
  leftIcon?: ReactNode;
  /** Right icon (defaults to ChevronDown if not provided) */
  rightIcon?: ReactNode;
  /** Hide the default chevron icon */
  hideChevron?: boolean;
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
    leftIcon,
    rightIcon,
    hideChevron = false,
    ...props 
  }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const hasLeftIcon = !!leftIcon;
    const hasRightIcon = !hideChevron && (rightIcon !== undefined ? !!rightIcon : true);
    const showRightIcon = hasRightIcon && (rightIcon || <ChevronDown className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />);

    return (
      <div className={cn(inline ? '' : 'w-full', wrapperClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              "block font-medium text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] mb-1",
              labelClassName
            )}
            style={{ fontSize: 'var(--text-body)' }}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {hasLeftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              {leftIcon}
            </div>
          )}
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full py-2.5 border rounded-lg',
              hasLeftIcon ? 'pl-10' : 'px-4',
              hasRightIcon ? 'pr-10' : '',
              'bg-[var(--light-input)] dark:bg-[var(--dark-input)]',
              'text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)]',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'hover:border-blue-400 dark:hover:border-blue-500',
              'cursor-pointer appearance-none',
              error
                ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                : 'border-[var(--light-border)] dark:border-[var(--dark-border)]',
              className
            )}
            required={required}
            style={{ fontSize: 'var(--text-body)' }}
            {...props}
          >
            {children}
          </select>
          {hasRightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-10">
              {showRightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-red-600 dark:text-red-400" style={{ fontSize: 'var(--text-small)' }}>{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)]" style={{ fontSize: 'var(--text-small)' }}>{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

