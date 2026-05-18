import {parseAbsoluteToLocal} from '@internationalized/date';

export function formatIsoDate(iso: string, locale = 'en-GB', options?: Intl.DateTimeFormatOptions) {
  const date = parseAbsoluteToLocal(iso);

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(date.toDate());
}
