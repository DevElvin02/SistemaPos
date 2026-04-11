import React from 'react';

interface NumericInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  allowDecimals?: boolean;
  allowNegative?: boolean;
}

export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      label,
      error,
      helperText,
      allowDecimals = false,
      allowNegative = false,
      onChange,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const isNumber = /[\d]/.test(e.key);
      const isSpecialKey = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key);
      const isDecimal = allowDecimals && e.key === '.';
      const isNegative = allowNegative && e.key === '-' && (e.currentTarget.value === '' || e.currentTarget.selectionStart === 0);
      const isCopy = e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x');

      if (!isNumber && !isSpecialKey && !isDecimal && !isNegative && !isCopy) {
        e.preventDefault();
      }

      onKeyDown?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;

      // Remove non-numeric characters except decimal point and negative sign
      if (allowDecimals) {
        value = value.replace(/[^\d.-]/g, '');
      } else {
        value = value.replace(/[^\d-]/g, '');
      }

      // Only allow one negative sign at the beginning
      if (allowNegative) {
        const negativeCount = (value.match(/-/g) || []).length;
        if (negativeCount > 1) {
          value = value.replace(/-/g, '');
          if (value) value = '-' + value;
        }
        if (!value.startsWith('-') && e.target.value.startsWith('-')) {
          value = '-' + value;
        }
      } else {
        value = value.replace(/-/g, '');
      }

      // Only allow one decimal point
      if (allowDecimals) {
        const parts = value.split('.');
        if (parts.length > 2) {
          value = parts[0] + '.' + parts.slice(1).join('');
        }
      }

      e.target.value = value;
      onChange?.(e);
    };

    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium mb-1">{label}</label>}
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
            error
              ? 'border-destructive focus:ring-destructive'
              : 'border-border focus:ring-primary'
          }`}
          {...props}
        />
        {error && (
          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

NumericInput.displayName = 'NumericInput';
