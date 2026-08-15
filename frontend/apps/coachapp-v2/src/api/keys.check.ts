import {nutritionDayKeys, trainingPlanKeys, workbenchKeys} from './keys.ts';

const counts = JSON.stringify(workbenchKeys.counts());
const workbenchRoot = JSON.stringify(workbenchKeys.all).slice(0, -1);

if (!counts.startsWith(workbenchRoot)) {
  throw new Error('workbench count keys must remain under the workbench prefix');
}

const programmingQueue = JSON.stringify(workbenchKeys.queue('programming', {service: 'training'}));

if (!programmingQueue.startsWith(JSON.stringify(workbenchKeys.queues()).slice(0, -1))) {
  throw new Error('workbench queue keys must remain under the workbench queue prefix');
}

const nutritionDays = JSON.stringify(nutritionDayKeys.forClient('client-id', {from: '2026-08-01'}));

if (!nutritionDays.startsWith(JSON.stringify(nutritionDayKeys.lists()).slice(0, -1))) {
  throw new Error('nutrition day keys must remain under the nutrition day list prefix');
}

if (
  JSON.stringify(trainingPlanKeys.forClient('client-id', {status: 'active'})) ===
  JSON.stringify(trainingPlanKeys.forClient('client-id', {status: 'archived'}))
) {
  throw new Error('active and archived Client Plan lists must use distinct cache keys');
}

console.log('query-keys: all checks passed');
