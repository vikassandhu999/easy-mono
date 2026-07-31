/** "First Last" from nullable API name fields; '' when both are missing. */
export function getFullName(firstName: null | string, lastName: null | string): string {
  return [firstName, lastName].filter(Boolean).join(' ') || '';
}
