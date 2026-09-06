export function diaryWriteMessageForCode(code: null | string): null | string {
  switch (code) {
    case 'stale_revision':
      return 'This meal changed. Close and reopen it to edit the latest version.';
    case 'conflict':
      return 'This meal could not be saved. Close and reopen it, then try again.';
    case 'outside_correction_window':
      return 'This day is no longer open to corrections.';
    case 'future_date':
      return 'You can only log today or the past week.';
    default:
      return null;
  }
}
