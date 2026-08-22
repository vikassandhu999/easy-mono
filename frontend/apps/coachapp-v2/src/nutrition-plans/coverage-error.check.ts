import {coverageErrorMessage} from './coverage-error.ts';

const overlap = {
  data: {
    error_code: 'invalid_input',
    error_detail: {fields: {start_date: ["overlaps another Client Plan's Coverage"]}},
  },
};

if (coverageErrorMessage(overlap, 'fallback') !== "overlaps another Client Plan's Coverage") {
  throw new Error('overlap Coverage errors must use the server field message');
}

const incomplete = {
  data: {
    error_code: 'invalid_input',
    error_detail: {fields: {client_id: ['already has an incomplete Client Plan']}},
  },
};

if (coverageErrorMessage(incomplete, 'fallback') !== 'already has an incomplete Client Plan') {
  throw new Error('incomplete Client Plan errors must use the server field message');
}

const archived = {
  data: {
    error_code: 'invalid_input',
    error_detail: {fields: {archived_at: ['is read-only']}},
  },
};

if (coverageErrorMessage(archived, 'fallback') !== 'This Client Plan is archived and cannot be edited.') {
  throw new Error('archived Coverage errors must be reported as a read-only Client Plan');
}

if (coverageErrorMessage({data: {error_code: 'stale_revision'}}, "Couldn't save dates") !== "Couldn't save dates") {
  throw new Error('non-Coverage errors must keep the caller fallback');
}

console.log('coverage-error checks passed');
