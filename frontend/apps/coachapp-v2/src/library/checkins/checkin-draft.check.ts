import {pluralize, summarize} from './checkin-draft.ts';

const assert = (ok: unknown, message: string) => {
  if (!ok) {
    throw new Error(message);
  }
};

assert(pluralize(1, 'question') === '1 question', 'one is singular');
assert(pluralize(0, 'question') === '0 questions', 'zero is plural');
assert(pluralize(2, 'section') === '2 sections', 'many is plural');

assert(summarize([]) === '0 questions · 0 required · 0 sections', 'an empty form summarises to zeroes');

const form = [{questions: [{required: true}, {required: false}]}, {questions: [{required: true}]}];
assert(summarize(form) === '3 questions · 2 required · 2 sections', 'counts questions across every section');

console.log('checkin-draft checks passed');
