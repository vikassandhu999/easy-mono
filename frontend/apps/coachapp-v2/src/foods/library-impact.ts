import type {components} from '../api/schema.ts';

export type FoodImpact = NonNullable<components['schemas']['FoodImpactResponse']['data']>;
export type RecipeImpact = NonNullable<components['schemas']['RecipeImpactResponse']['data']>;

type FoodRecipeReference = NonNullable<FoodImpact['recipes']>[number];
type LibraryReference =
  | FoodRecipeReference
  | NonNullable<FoodImpact['templates']>[number]
  | NonNullable<RecipeImpact['templates']>[number];

export type LibraryUsageItem = Required<Pick<FoodRecipeReference, 'id' | 'name'>>;

export type LibraryImpact = {
  recipes: LibraryUsageItem[];
  templates: LibraryUsageItem[];
  active_client_plans: LibraryUsageItem[];
};

export function normalizeLibraryImpact(data: FoodImpact | RecipeImpact | undefined): LibraryImpact {
  return {
    recipes: namedRefs(data && 'recipes' in data ? data.recipes : undefined),
    templates: namedRefs(data?.templates),
    active_client_plans: namedRefs(data?.active_client_plans),
  };
}

export function hasLibraryUsage(impact: LibraryImpact): boolean {
  return impact.recipes.length + impact.templates.length + impact.active_client_plans.length > 0;
}

export function libraryInUseMessage(error: unknown, fallback: string): string {
  const data = objectProperty(error, 'data');
  if (objectProperty(data, 'error_code') === 'in_use') {
    const message = objectProperty(data, 'error_message');
    return typeof message === 'string' ? message : fallback;
  }
  return fallback;
}

function namedRefs(items: LibraryReference[] | undefined): LibraryUsageItem[] {
  return (items ?? []).flatMap((item) => (item.id && item.name ? [{id: item.id, name: item.name}] : []));
}

function objectProperty(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return Object.entries(value).find(([name]) => name === key)?.[1];
}
