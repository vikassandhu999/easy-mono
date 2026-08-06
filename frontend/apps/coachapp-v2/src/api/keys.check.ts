import {clientKeys, workbenchKeys} from './keys.ts';

const counts = JSON.stringify(workbenchKeys.counts());

if (!counts.startsWith(JSON.stringify(clientKeys.lists()).slice(0, -1))) {
  throw new Error('workbench count keys must remain under the client list prefix');
}

console.log('query-keys: all checks passed');
