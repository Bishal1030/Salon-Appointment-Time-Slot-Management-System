import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="block text-xs font-bold uppercase tracking-widest text-retro-blue neon-glow-blue">
            {label}
          </label>
        )}
        <input
          className={cn(
            'flex h-12 w-full bg-retro-dark/50 border-2 border-retro-purple/50 px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-retro-pink focus:ring-1 focus:ring-retro-pink transition-all retro-glass',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
