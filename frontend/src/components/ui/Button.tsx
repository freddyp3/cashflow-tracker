import type { ButtonHTMLAttributes, Ref } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  ref?: Ref<HTMLButtonElement>;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-amber-500 text-white font-medium rounded-md hover:bg-amber-600 transition-colors',
  secondary: 'bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors',
  danger: 'text-red-500 hover:text-red-600 font-medium text-sm',
  ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium rounded-md transition-colors',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  className = '',
  ref,
  ...rest
}: ButtonProps) {
  const classes = [
    variant === 'danger' ? '' : sizeClasses[size],
    variantClasses[variant],
    disabled ? 'opacity-50 cursor-not-allowed' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <button ref={ref} type={type} disabled={disabled} className={classes} {...rest} />;
}
