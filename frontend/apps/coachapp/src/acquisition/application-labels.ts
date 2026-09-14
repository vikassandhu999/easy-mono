import type {Prospect} from '../api/prospects';

export const applicationStatus: Record<Prospect['status'], string> = {
  new: 'New',
  reviewing: 'In review',
  won: 'Accepted',
  lost: 'Closed',
};

export function readApplicationStatus(value: string | null): Prospect['status'] | undefined {
  if (value === null) {
    return 'new';
  }
  if (value === 'new' || value === 'reviewing' || value === 'won' || value === 'lost') {
    return value;
  }
  return undefined;
}
