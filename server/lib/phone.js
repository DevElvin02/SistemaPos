export function sanitizePhone(value) {
  return String(value ?? '').replace(/[^\d\s\-()+]/g, '');
}

export function normalizePhone(value) {
  return sanitizePhone(value).replace(/\s+/g, ' ').trim();
}

export function getPhoneDigits(value) {
  return normalizePhone(value).replace(/\D/g, '');
}

export function isValidPhone(value) {
  const normalized = normalizePhone(value);
  if (!normalized) return false;
  if (!/^[\d\s\-()+]+$/.test(normalized)) return false;

  const digits = getPhoneDigits(normalized);
  return digits.length >= 8 && digits.length <= 15;
}

export function isOptionalPhoneValid(value) {
  return !normalizePhone(value) || isValidPhone(value);
}

const NAME_ALLOWED_CHARS_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.'’&\-\s]+$/;
const NAME_INVALID_CHARS_REGEX = /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ.'’&\-\s]/g;

export function sanitizeNameText(value) {
  return String(value ?? '').replace(NAME_INVALID_CHARS_REGEX, '').replace(/\s+/g, ' ');
}

export function normalizeNameText(value) {
  return sanitizeNameText(value).trim();
}

export function isTextOnlyName(value) {
  const normalized = normalizeNameText(value);
  if (!normalized) return false;
  if (!NAME_ALLOWED_CHARS_REGEX.test(normalized)) return false;

  const lettersOnly = normalized.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
  return lettersOnly.length >= 2 && normalized.length <= 100;
}