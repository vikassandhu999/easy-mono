/**
 * toastMutationError — danger toast for a failed mutation.
 *
 * Maps not_found to "no longer exists — refresh" instead of the generic
 * fallback: a 404 on delete/update means the row is already gone (someone
 * else removed it, or the page is stale), and telling the user the action
 * "couldn't" happen sends them retrying a dead id.
 */
import {toast} from '@heroui/react';

/** Pull `error_code` off an RTK Query error, or undefined if the shape doesn't match. */
export function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('data' in error)) {
    return undefined;
  }
  const data = (error as {data?: unknown}).data;
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }
  return (data as {error_code?: string}).error_code;
}

function isNotFound(error: unknown): boolean {
  return getErrorCode(error) === 'not_found';
}

export function toastMutationError(error: unknown, fallback: string): void {
  if (isNotFound(error)) {
    toast.danger('This item no longer exists — refresh the page.');
    return;
  }
  toast.danger(fallback);
}
