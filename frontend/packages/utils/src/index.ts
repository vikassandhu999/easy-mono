export const getInitials = (firstName?: null | string, lastName?: null | string): string =>
  `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();

/** "First Last" from nullable API name fields; '' when both are missing. */
export const getFullName = (firstName?: null | string, lastName?: null | string): string =>
  [firstName, lastName].filter(Boolean).join(' ');

export * from './closed-vocabulary.ts';
export * from './date.ts';
export * from './media.ts';
export * from './move-item.ts';
export * from './nutrition.ts';
export * from './parse-api-error.ts';
export * from './stick-to-bottom.ts';
export * from './workout.ts';
