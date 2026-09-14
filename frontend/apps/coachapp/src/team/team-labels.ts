import type {TeamMember} from '../api/team';
export function coachName(coach: Pick<TeamMember, 'first_name' | 'last_name' | 'email'>) {
  return `${coach.first_name ?? ''} ${coach.last_name ?? ''}`.trim() || coach.email || 'Coach';
}
export function coachStatus(coach: Pick<TeamMember, 'status' | 'invitation_expired'>) {
  return coach.status === 'invited'
    ? coach.invitation_expired
      ? 'Invitation expired'
      : 'Invited'
    : coach.status === 'active'
      ? 'Active'
      : 'Inactive';
}
