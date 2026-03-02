'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'success' | 'danger' | 'neutral' | 'outline';
  loading?: boolean;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';
  
  const variantClasses = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800',
    success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    neutral: 'bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800',
    outline: 'bg-transparent border-2 border-teal-600 text-teal-600 hover:bg-teal-50 active:bg-teal-100',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
