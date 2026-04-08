export const MIN_HANDLE_LENGTH = 3;
export const MAX_HANDLE_LENGTH = 30;
export const HANDLE_RULE_MESSAGE =
  `Handle must be ${MIN_HANDLE_LENGTH}-${MAX_HANDLE_LENGTH} lowercase letters, numbers, or underscores.`;
export const HANDLE_REGEX = new RegExp(
  `^[a-z0-9_]{${MIN_HANDLE_LENGTH},${MAX_HANDLE_LENGTH}}$`,
);

export function normalizeHandle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, MAX_HANDLE_LENGTH);
}

export function isHandleValid(handle: string): boolean {
  return HANDLE_REGEX.test(handle);
}

export function hasMinimumHandleLength(handle: string): boolean {
  return handle.length >= MIN_HANDLE_LENGTH;
}

export function normalizeExternalUrl(value: string): string {
  return value.trim();
}

export function isValidExternalUrl(value: string): boolean {
  const trimmed = normalizeExternalUrl(value);
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
