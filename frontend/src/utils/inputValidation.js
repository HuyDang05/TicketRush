export const MAX_CHECKOUT_BOOKINGS = 4;
export const MAX_DESCRIPTION_LENGTH = 5000;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_EVENT_TITLE_LENGTH = 150;
export const MAX_FULL_NAME_LENGTH = 100;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_PRICE = 100000000;
export const MAX_SEARCH_LENGTH = 100;
export const MAX_SEATS_PER_EVENT = 5000;
export const MAX_VENUE_LENGTH = 255;
export const MAX_ZONES = 50;

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidHttpsOrDataImageUrl(value) {
  const trimmed = value.trim();
  return !trimmed || /^https:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed);
}

export function validatePassword(value, label = 'Mật khẩu') {
  if (!value || value.length < 8) return `${label} cần ít nhất 8 ký tự`;
  if (value.length > MAX_PASSWORD_LENGTH) return `${label} tối đa ${MAX_PASSWORD_LENGTH} ký tự`;
  return '';
}

export function validateFullName(value) {
  const trimmed = value.trim();
  if (trimmed.length < 2) return 'Họ tên cần ít nhất 2 ký tự';
  if (trimmed.length > MAX_FULL_NAME_LENGTH) return `Họ tên tối đa ${MAX_FULL_NAME_LENGTH} ký tự`;
  return '';
}
