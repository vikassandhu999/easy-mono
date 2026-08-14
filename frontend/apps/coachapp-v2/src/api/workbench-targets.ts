import {conversationKeys, workbenchKeys} from './keys.ts';

/**
 * Cache prefixes every workbench draining mutation must invalidate.
 * Kept pure so the contract is checkable without mounting React Query.
 */
export function workbenchMutationTargets() {
  return {
    afterMarkHandled: [workbenchKeys.all, conversationKeys.lists(), conversationKeys.forClients()] as const,
    afterMembershipChange: [workbenchKeys.all] as const,
    afterConversationUpdate: [conversationKeys.lists(), workbenchKeys.all] as const,
    afterQueueDrain: [workbenchKeys.all] as const,
    afterSnooze: [workbenchKeys.all] as const,
  };
}
