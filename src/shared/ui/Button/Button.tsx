import type { ReactNode, ButtonHTMLAttributes } from 'react';
import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  isFullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  isFullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  const baseClass = 'btn';
  const variantClass = `btn--${variant}`;
  const widthClass = isFullWidth ? 'btn--full-width' : '';

  return (
    <button
      className={`${baseClass} ${variantClass} ${widthClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}