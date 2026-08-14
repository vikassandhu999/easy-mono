import {conversationKeys, workbenchKeys} from './keys.ts';
import {workbenchMutationTargets} from './workbench-targets.ts';

function assertTrue(value: boolean, label: string) {
  if (!value) {
    throw new Error(label);
  }
}

const targets = workbenchMutationTargets();

assertTrue(
  targets.afterMembershipChange.some((key) => JSON.stringify(key) === JSON.stringify(workbenchKeys.all)),
  'membership-changing writes invalidate every workbench queue and count',
);
assertTrue(
  targets.afterConversationUpdate.some((key) => JSON.stringify(key) === JSON.stringify(workbenchKeys.all)),
  'conversation events invalidate Replies membership and rows',
);
assertTrue(
  targets.afterConversationUpdate.some((key) => JSON.stringify(key) === JSON.stringify(conversationKeys.lists())),
  'conversation events invalidate inbox lists',
);
assertTrue(
  targets.afterQueueDrain.some((key) => JSON.stringify(key) === JSON.stringify(workbenchKeys.all)),
  'drain invalidates workbench root',
);
assertTrue(
  targets.afterQueueDrain.every((key) => JSON.stringify(key).startsWith('["workbench"')),
  'drain stays under workbench',
);
assertTrue(
  targets.afterMarkHandled.some((key) => JSON.stringify(key) === JSON.stringify(conversationKeys.lists())),
  'mark handled invalidates conversation lists',
);
assertTrue(
  !targets.afterMarkHandled.some((key) => JSON.stringify(key).includes('"waiting":true')),
  'mark handled never uses waiting=true keys',
);
assertTrue(
  !targets.afterSnooze.some((key) => JSON.stringify(key).includes('"clients"')),
  'snooze does not invalidate client lists',
);

console.log('workbench-targets: all checks passed');
