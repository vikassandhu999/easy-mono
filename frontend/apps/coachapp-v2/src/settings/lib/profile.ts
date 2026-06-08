export function getInitials(firstName: null | string, lastName: null | string): string {
  const f = firstName?.charAt(0) ?? '';
  const l = lastName?.charAt(0) ?? '';
  return (f + l).toUpperCase() || '?';
}

export function getFullName(firstName: null | string, lastName: null | string): string {
  return [firstName, lastName].filter(Boolean).join(' ');
}

export function splitName(fullName: string): {first_name: string; last_name: string} {
  const spaceIndex = fullName.indexOf(' ');
  if (spaceIndex === -1) {
    return {first_name: fullName, last_name: ''};
  }
  return {first_name: fullName.slice(0, spaceIndex), last_name: fullName.slice(spaceIndex + 1)};
}
