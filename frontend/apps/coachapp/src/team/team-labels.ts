import type {TeamMember} from '../api/team';
export function coachName(coach: Pick<TeamMember, 'full_name' | 'preferred_name' | 'email'>) {
  return coach.preferred_name || coach.full_name || coach.email || 'Coach';
}
export function coachStatus(coach: Pick<TeamMember, 'state' | 'invitation_expired'>) {
  return coach.state === 'invited'
    ? coach.invitation_expired
      ? 'Invitation expired'
      : 'Invited'
    : coach.state === 'active'
      ? 'Active'
      : 'Removed';
}
