export type {MacroFormFields, ServingSizeFormRow} from '@/shared/types/forms';

export type ResourceStatus = 'active' | 'archived' | 'draft';

export const getReturnTo = (state: Record<string, unknown>, fallback: string): string => {
  if (typeof state?.from === 'string') {
    return state.from;
  }

  return fallback;
};
