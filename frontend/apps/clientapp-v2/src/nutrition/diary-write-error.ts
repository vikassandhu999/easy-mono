import {getApiErrorCode, getApiErrorMessage} from '@/api/shared';

function dateFieldMessage(error: unknown): null | string {
  if (!error || typeof error !== 'object' || !('data' in error)) {
    return null;
  }
  const data = (error as {data?: {error_detail?: {fields?: {date?: unknown}}}}).data;
  const dates = data?.error_detail?.fields?.date;
  return Array.isArray(dates) && typeof dates[0] === 'string' ? dates[0] : null;
}

export function diaryWriteError(error: unknown, fallback: string): string {
  const code = getApiErrorCode(error);
  if (code === 'stale_revision') {
    return 'This item changed on another device. Refresh and try again.';
  }
  if (code === 'conflict') {
    return 'That action was already recorded differently. Start it again.';
  }
  const dateMessage = dateFieldMessage(error);
  if (dateMessage?.includes('previous 7')) {
    return 'This day is no longer open to corrections.';
  }
  if (dateMessage?.includes('future')) {
    return 'You can only log today or the past week.';
  }
  return getApiErrorMessage(error, fallback);
}
