// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// Check if email is unique in list (useful for frontend preview)
export function isEmailUnique(email: string, existingEmails: string[], excludeEmail?: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedExclude = excludeEmail?.toLowerCase().trim();
  
  return !existingEmails.some(
    e => e.toLowerCase().trim() === normalizedEmail && e.toLowerCase().trim() !== normalizedExclude
  );
}

// Numeric validation - only allows digits
export function isNumericOnly(value: string): boolean {
  return /^\d*$/.test(value);
}

// Phone number validation - allows digits, spaces, dashes, parentheses, plus
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-()+"]*$/;
  return phoneRegex.test(phone.trim());
}

// Allow only numeric input (for input onChange handlers)
export function sanitizeNumeric(value: string): string {
  return value.replace(/\D/g, '');
}

// Sanitize phone input (allow digits, spaces, dashes, parentheses, plus)
export function sanitizePhone(value: string): string {
  return value.replace(/[^\d\s\-()+"]/g, '');
}

// Password strength validation
export function validatePassword(password: string): {
  isValid: boolean;
  message?: string;
} {
  if (!password) {
    return { isValid: false, message: 'La contraseña es obligatoria' };
  }
  
  if (password.length < 4) {
    return { isValid: false, message: 'La contraseña debe tener al menos 4 caracteres' };
  }
  
  return { isValid: true };
}

// Name validation
export function isValidName(name: string): boolean {
  return name.trim().length > 0 && name.trim().length <= 100;
}

// Form validation for creating/editing users
export interface UserValidationErrors {
  name?: string;
  email?: string;
  password?: string;
}

export function validateUserForm(
  name: string,
  email: string,
  password: string,
  isCreate: boolean = false
): UserValidationErrors {
  const errors: UserValidationErrors = {};

  if (!name.trim()) {
    errors.name = 'El nombre es obligatorio';
  } else if (!isValidName(name)) {
    errors.name = 'El nombre debe tener entre 1 y 100 caracteres';
  }

  if (!email.trim()) {
    errors.email = 'El email es obligatorio';
  } else if (!isValidEmail(email)) {
    errors.email = 'El formato del email no es válido';
  }

  if (isCreate) {
    if (!password.trim()) {
      errors.password = 'La contraseña es obligatoria';
    } else {
      const pwValidation = validatePassword(password);
      if (!pwValidation.isValid && pwValidation.message) {
        errors.password = pwValidation.message;
      }
    }
  } else {
    if (password.trim()) {
      const pwValidation = validatePassword(password);
      if (!pwValidation.isValid && pwValidation.message) {
        errors.password = pwValidation.message;
      }
    }
  }

  return errors;
}
