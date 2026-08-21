export function diaryWriteMessageForCode(code: null | string): null | string {
  switch (code) {
    case 'stale_revision':
      return 'This item changed on another device. Refresh and try again.';
    case 'conflict':
      return 'That action was already recorded differently. Start it again.';
    case 'outside_correction_window':
      return 'This day is no longer open to corrections.';
    case 'future_date':
      return 'You can only log today or the past week.';
    default:
      return null;
  }
}
