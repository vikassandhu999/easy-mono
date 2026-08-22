/**
 * How a team member reads on screen. Kept out of `team.tsx` so the fallback
 * chain below is checkable: a trainer who accepted an invite without filling in
 * a name still has to render as something.
 */
import {getFullName} from '@easy/utils';

import type {TeamMember} from '../api/team.ts';

/** Full name, else the email they were invited with, else the generic noun. */
export function memberName(member: Pick<TeamMember, 'email' | 'first_name' | 'last_name'>): string {
  return getFullName(member.first_name, member.last_name) || member.email || 'Trainer';
}

export const STATUS_LABEL: Record<TeamMember['status'], string> = {
  invited: 'Invited',
  active: 'Active',
  inactive: 'Deactivated',
};

export const STATUS_COLOR: Record<TeamMember['status'], 'default' | 'success' | 'warning'> = {
  invited: 'warning',
  active: 'success',
  inactive: 'default',
};
