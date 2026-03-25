import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray' | 'cyan';
  className?: string;
}

export function Badge({ children, variant = 'blue', className }: BadgeProps) {
  return (
    <span
      className={twMerge(clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-blue-500/10 text-blue-400 border border-blue-500/20': variant === 'blue',
          'bg-green-500/10 text-green-400 border border-green-500/20': variant === 'green',
          'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20': variant === 'yellow',
          'bg-red-500/10 text-red-400 border border-red-500/20': variant === 'red',
          'bg-purple-500/10 text-purple-400 border border-purple-500/20': variant === 'purple',
          'bg-slate-500/10 text-slate-400 border border-slate-500/20': variant === 'gray',
          'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20': variant === 'cyan',
        },
        className
      ))}
    >
      {children}
    </span>
  );
}
