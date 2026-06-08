const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function formatInvitationSentAgo(sentAt: string): string {
  const sentMs = new Date(sentAt).getTime();
  const diffMs = Date.now() - sentMs;
  if (Number.isNaN(diffMs)) {
    return '';
  }

  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) {
    return 'just now';
  }
  if (mins < 60) {
    return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function formatInvitationExpiresIn(expiresAt: string): string {
  const expiresMs = new Date(expiresAt).getTime();
  const diffMs = expiresMs - Date.now();
  if (Number.isNaN(diffMs)) {
    return '';
  }
  if (diffMs <= 0) {
    return 'expired';
  }
  const days = Math.ceil(diffMs / MS_PER_DAY);
  if (days <= 1) {
    return 'today';
  }
  return `in ${days} days`;
}

export function buildInvitationWhatsAppUrl({
  firstName,
  inviteUrl,
  phone,
}: {
  firstName: null | string;
  inviteUrl: string;
  phone: null | string;
}): string {
  const message = firstName
    ? `Hi ${firstName}, I've set up your coaching profile. Tap this link to get started: ${inviteUrl}`
    : `I've set up your coaching profile. Tap this link to get started: ${inviteUrl}`;
  const encoded = encodeURIComponent(message);
  const cleanPhone = phone?.replace(/\D/g, '');
  return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}
