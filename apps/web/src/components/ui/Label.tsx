'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1',
          className
        )}
        {...props}
      />
    );
  }
);

Label.displayName = 'Label';

