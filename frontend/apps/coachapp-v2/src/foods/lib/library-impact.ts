import type {components} from '../../api/schema.ts';
import {getApiErrorCode, getApiErrorMessage} from '../../api/shared.ts';

export type FoodImpact = NonNullable<components['schemas']['FoodImpactResponse']['data']>;
export type RecipeImpact = NonNullable<components['schemas']['RecipeImpactResponse']['data']>;

export type LibraryUsageItem = {id: string; name: string};

export type LibraryImpact = {
  recipes: LibraryUsageItem[];
  templates: LibraryUsageItem[];
  active_client_plans: LibraryUsageItem[];
};

export function normalizeLibraryImpact(data: FoodImpact | RecipeImpact | undefined): LibraryImpact {
  return {
    recipes: namedRefs('recipes' in (data ?? {}) ? (data as FoodImpact).recipes : []),
    templates: namedRefs(data?.templates),
    active_client_plans: namedRefs(data?.active_client_plans),
  };
}

export function hasLibraryUsage(impact: LibraryImpact): boolean {
  return impact.recipes.length + impact.templates.length + impact.active_client_plans.length > 0;
}

export function libraryInUseMessage(error: unknown, fallback: string): string {
  if (getApiErrorCode(error) === 'in_use') {
    return getApiErrorMessage(error, fallback);
  }
  return fallback;
}

function namedRefs(items: {id?: string; name?: string}[] | undefined): LibraryUsageItem[] {
  return (items ?? []).flatMap((item) => (item.id && item.name ? [{id: item.id, name: item.name}] : []));
}
