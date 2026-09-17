import assert from 'node:assert/strict';
import {latestPageCount} from '../../src/api/pagination.ts';

assert.equal(latestPageCount([{count: 63}, {count: null}, {count: null}]), 63);
assert.equal(latestPageCount([{count: 63}, {count: 61}]), 61);
assert.equal(latestPageCount([{count: 63}, {count: 0}]), 0);
assert.equal(latestPageCount([{count: null}]), null);
assert.equal(latestPageCount([]), null);
