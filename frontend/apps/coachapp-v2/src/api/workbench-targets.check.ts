import {conversationKeys, workbenchKeys} from './keys.ts';
import {workbenchMutationTargets} from './workbench-targets.ts';

function assertTrue(value: boolean, label: string) {
  if (!value) {
    throw new Error(label);
  }
}

const targets = workbenchMutationTargets();

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
