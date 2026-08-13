import {clientKeys, nutritionDayKeys, workbenchKeys} from './keys.ts';

const counts = JSON.stringify(workbenchKeys.counts());

if (!counts.startsWith(JSON.stringify(clientKeys.lists()).slice(0, -1))) {
  throw new Error('workbench count keys must remain under the client list prefix');
}

const nutritionDays = JSON.stringify(nutritionDayKeys.forClient('client-id', {from: '2026-08-01'}));

if (!nutritionDays.startsWith(JSON.stringify(nutritionDayKeys.lists()).slice(0, -1))) {
  throw new Error('nutrition day keys must remain under the nutrition day list prefix');
}

console.log('query-keys: all checks passed');
