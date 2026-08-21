import {
  apiErrorCodeFromBody,
  apiErrorMessageFromBody,
  parseApiErrorBody,
  validationErrorsFromBody,
} from './parse-api-error.ts';

const changesetBody = parseApiErrorBody({
  error_code: 'invalid_input',
  error_message: 'Validation failed',
  error_detail: {fields: {email: ['has already been taken']}},
});
if (!changesetBody || validationErrorsFromBody(changesetBody)?.email?.[0] !== 'has already been taken') {
  throw new Error('Ecto changeset field errors must parse from error_detail.fields');
}

const flatBody = parseApiErrorBody({
  error_code: 'invalid_input',
  error_message: 'Validation failed',
  error_detail: {email: ['is invalid']},
});
if (!flatBody || validationErrorsFromBody(flatBody)?.email?.[0] !== 'is invalid') {
  throw new Error('flat error_detail field errors must parse');
}

const legacyBody = parseApiErrorBody({errors: {name: ['is required']}});
if (!legacyBody || validationErrorsFromBody(legacyBody)?.name?.[0] !== 'is required') {
  throw new Error('legacy errors map must parse');
}

if (parseApiErrorBody({error_code: 123}) !== null) {
  throw new Error('non-string error_code must be rejected');
}

if (apiErrorMessageFromBody(changesetBody, 'fallback') !== 'Validation failed') {
  throw new Error('error_message must be read from parsed body');
}

if (apiErrorCodeFromBody(changesetBody) !== 'invalid_input') {
  throw new Error('error_code must be read from parsed body');
}

console.log('api-error checks passed');
