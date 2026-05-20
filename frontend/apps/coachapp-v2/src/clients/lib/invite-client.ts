export function splitName(name: string): {firstName: string; lastName?: string} {
  const trimmed = name.trim();
  const spaceIndex = trimmed.indexOf(' ');

  if (spaceIndex === -1) {
    return {firstName: trimmed};
  }

  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim() || undefined,
  };
}

export function getFullName(firstName: null | string, lastName: null | string): string {
  return [firstName, lastName].filter(Boolean).join(' ') || '';
}

export function getWhatsAppUrl(phone: string | undefined, name: string, inviteUrl: string): string {
  const message = name
    ? `Hi ${name}, I've set up your coaching profile! Use this link to get started: ${inviteUrl}`
    : `I've set up your coaching profile! Use this link to get started: ${inviteUrl}`;
  const encodedMessage = encodeURIComponent(message);
  const cleanPhone = phone?.replace(/\D/g, '');

  return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedMessage}` : `https://wa.me/?text=${encodedMessage}`;
}
