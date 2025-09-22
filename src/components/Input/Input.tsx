import { forwardRef, InputHTMLAttributes } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  size = 'md',
  fullWidth = false,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  };

  // Extract flex classes from className to apply to wrapper
  const flexClasses = className.split(' ').filter(cls => 
    cls.startsWith('flex-') || cls === 'flex'
  ).join(' ');
  
  const inputClasses = className.split(' ').filter(cls => 
    !cls.startsWith('flex-') && cls !== 'flex'
  ).join(' ');

  const baseInputClasses = `
    border border-gray-300 dark:border-gray-600 rounded 
    bg-transparent
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
    text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400
    disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed
    ${sizeClasses[size]}
    ${fullWidth || flexClasses ? 'w-full' : ''}
    ${error ? 'border-red-500 focus:ring-red-500' : ''}
    ${inputClasses}
  `.trim().replace(/\s+/g, ' ');

  const wrapperClasses = `
    ${fullWidth ? 'w-full' : ''}
    ${flexClasses}
  `.trim();

  return (
    <div className={wrapperClasses}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        ref={ref}
        id={inputId}
        className={baseInputClasses}
        {...props}
      />
      
      {(error || helperText) && (
        <div className="mt-1">
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {helperText && !error && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';