import type {CompletionState} from './types';

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

/**
 * Friendly weekday label for ISO weekday (1=Mon, 7=Sun).
 */
export function weekdayLabel(weekday?: number): string {
  if (!weekday) return 'Day';
  return WEEKDAY_LABELS[weekday] ?? 'Day';
}

/**
 * Map a completion/status state to a badge color name.
 */
export function completionColor(state?: CompletionState): string {
  switch (state) {
    case 'completed':
      return 'green';
    case 'in_progress':
      return 'yellow';
    case 'not_started':
    case 'available':
    case 'upcoming':
      return 'blue';
    case 'skipped':
    case 'missed':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Human-readable label for a completion/status state.
 */
export function completionLabel(state?: CompletionState): string {
  switch (state) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In progress';
    case 'not_started':
      return 'Not started';
    case 'available':
      return 'Available';
    case 'upcoming':
      return 'Upcoming';
    case 'skipped':
      return 'Skipped';
    case 'missed':
      return 'Missed';
    default:
      return 'Status';
  }
}

/**
 * CTA label suggestion based on kind and state.
 */
export function getCtaLabel(kind?: string, state?: CompletionState): string {
  if (state === 'completed') return 'View';
  if (state === 'in_progress') return 'Continue';
  if (state === 'missed' || state === 'skipped') return 'Skipped';
  if (kind === 'training') return 'Start Workout';
  if (kind === 'nutrition') return 'Log Meal';
  return 'View';
}
