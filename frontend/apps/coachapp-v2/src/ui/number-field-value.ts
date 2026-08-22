import {z} from 'zod';

export function toNumberFieldValue(value: number | undefined): '' | number {
  return value ?? '';
}

export function numberFieldSchema<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema);
}
