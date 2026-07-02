/**
 * toastMutationError — danger toast for a failed mutation.
 *
 * Maps not_found to "no longer exists — refresh" instead of the generic
 * fallback: a 404 on delete/update means the row is already gone (someone
 * else removed it, or the page is stale), and telling the user the action
 * "couldn't" happen sends them retrying a dead id.
 */
import {toast} from '@heroui/react';

// ponytail: inline error_code check instead of @easy/error-parser — the dep
// isn't wired into this app and pnpm wants a full reinstall to add it.
function isNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('data' in error)) {
    return false;
  }
  const data = (error as {data?: unknown}).data;
  return typeof data === 'object' && data !== null && (data as {error_code?: string}).error_code === 'not_found';
}

export function toastMutationError(error: unknown, fallback: string): void {
  if (isNotFound(error)) {
    toast.danger('This item no longer exists — refresh the page.');
    return;
  }
  toast.danger(fallback);
}
