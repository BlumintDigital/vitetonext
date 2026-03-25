import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={twMerge(clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-[#3b82f6] text-white hover:bg-[#2563eb] shadow-lg shadow-blue-500/20': variant === 'primary',
          'bg-[#1a2235] text-[#f1f5f9] border border-[#1e293b] hover:bg-[#1e293b]': variant === 'secondary',
          'text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#1a2235]': variant === 'ghost',
          'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20': variant === 'danger',
        },
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className
      ))}
      {...props}
    >
      {children}
    </button>
  );
}
