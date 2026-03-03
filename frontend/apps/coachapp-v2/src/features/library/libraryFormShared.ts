import type {Location} from 'react-router';

export type {MacroFormFields, ServingSizeFormRow} from '@/shared/types/forms';

export type ResourceStatus = 'active' | 'archived' | 'draft';

type ReturnToState = {
  from?: unknown;
};

export const getReturnTo = (location: Location, fallback: string): string => {
  const state = location.state as null | ReturnToState;
  if (state && typeof state.from === 'string') {
    return state.from;
  }

  return fallback;
};
