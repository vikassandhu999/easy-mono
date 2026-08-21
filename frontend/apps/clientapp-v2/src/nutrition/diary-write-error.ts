import {getApiErrorCode, getApiErrorMessage} from '@/api/shared';
import {diaryWriteMessageForCode} from './diary-write-error-message';

export function diaryWriteError(error: unknown, fallback: string): string {
  const code = getApiErrorCode(error);
  const message = diaryWriteMessageForCode(code);
  if (message) {
    return message;
  }
  return getApiErrorMessage(error, fallback);
}
