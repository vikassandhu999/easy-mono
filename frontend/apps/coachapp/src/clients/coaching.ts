import {formatDateShort} from '@easy/utils';
import type {Client} from '../api/clients';

export const clientStateLabels = {
  active: 'Active',
  ending_soon: 'Ending soon',
  joined: 'Joined, not started',
  invited: 'Invited',
  ended: 'Ended',
} satisfies Record<Client['state'], string>;

export function coachingSummary(person: Pick<Client, 'state' | 'current_term' | 'local_date'>) {
  const term = person.current_term;
  if (!term) {
    return clientStateLabels[person.state];
  }
  return `Coaching since ${formatDateShort(term.starts_on)}${term.ends_on ? ` · ends ${formatDateShort(term.ends_on)}` : ''}`;
}

export function endingSoonLabel(person: Pick<Client, 'state' | 'current_term' | 'local_date'>) {
  if (person.state !== 'ending_soon' || !person.current_term?.ends_on) {
    return null;
  }
  const days = Math.round((Date.parse(person.current_term.ends_on) - Date.parse(person.local_date)) / 86400000);
  return days === 0 ? 'Ends today' : `Ends in ${days} ${days === 1 ? 'day' : 'days'}`;
}
