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

const PHONE_ALLOWED_CHARS_REGEX = /^[\d\s\-()+]+$/;
const PHONE_INVALID_CHARS_REGEX = /[^\d\s\-()+]/g;

export function sanitizePhone(value: string): string {
  return value.replace(PHONE_INVALID_CHARS_REGEX, '');
}

export function normalizePhone(value: string): string {
  return sanitizePhone(value).replace(/\s+/g, ' ').trim();
}

export function getPhoneDigits(value: string): string {
  return normalizePhone(value).replace(/\D/g, '');
}

// Phone number validation - allows digits, spaces, dashes, parentheses, plus
export function isValidPhone(phone: string): boolean {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return false;
  if (!PHONE_ALLOWED_CHARS_REGEX.test(normalizedPhone)) return false;

  const digits = getPhoneDigits(normalizedPhone);
  return digits.length >= 8 && digits.length <= 15;
}

export function isOptionalPhoneValid(phone: string): boolean {
  return !normalizePhone(phone) || isValidPhone(phone);
}

// Allow only numeric input (for input onChange handlers)
export function sanitizeNumeric(value: string): string {
  return value.replace(/\D/g, '');
}

export function sanitizeIntegerInput(value: string): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function sanitizeDecimalInput(value: string): string {
  const sanitized = String(value ?? '').replace(/[^\d.]/g, '');
  const parts = sanitized.split('.');
  if (parts.length <= 1) return sanitized;
  return `${parts[0]}.${parts.slice(1).join('')}`;
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

const NAME_ALLOWED_CHARS_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.'’&\-\s]+$/;
const NAME_INVALID_CHARS_REGEX = /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ.'’&\-\s]/g;

export function sanitizeNameText(value: string): string {
  return value.replace(NAME_INVALID_CHARS_REGEX, '').replace(/\s+/g, ' ');
}

export function normalizeNameText(value: string): string {
  return sanitizeNameText(value).trim();
}

export function isTextOnlyName(value: string): boolean {
  const normalized = normalizeNameText(value);
  if (!normalized) return false;
  if (!NAME_ALLOWED_CHARS_REGEX.test(normalized)) return false;

  const lettersOnly = normalized.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
  return lettersOnly.length >= 2 && normalized.length <= 100;
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
  } else if (!isTextOnlyName(name)) {
    errors.name = 'El nombre solo puede contener letras y espacios';
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
