import {clientKeys} from './keys.ts';

const countOnly = JSON.stringify(clientKeys.attention({limit: 0, offset: 0}));
const fullPage = JSON.stringify(clientKeys.attention({limit: 100, offset: 0}));

if (countOnly === fullPage) {
  throw new Error('attention cache identity must include pagination filters');
}

if (!countOnly.startsWith(JSON.stringify(clientKeys.lists()).slice(0, -1))) {
  throw new Error('attention keys must remain under the client list prefix');
}

console.log('query-keys: all checks passed');
