/**
 * Query-key factories — the single registry of cache identity, the React Query
 * successor to the old RTK `tagTypes` list. Every domain's keys live here so
 * cross-domain invalidation never needs a cross-file import of anything but
 * this module.
 *
 * Conventions:
 *   fooKeys.all            — root; invalidate to nuke the domain
 *   fooKeys.lists()        — every list-shaped query (flat AND infinite)
 *   fooKeys.list(filters)  — one flat list entry
 *   fooKeys.detail(id)     — one detail entry
 *
 * Old-tag mapping: `{type: 'Foo', id}` → fooKeys.detail(id);
 * `{type: 'Foo', id: 'LIST'}` → fooKeys.lists().
 */

type Filters = Record<string, unknown> | undefined | void;

const domain = <N extends string>(name: N) => ({
  all: [name] as const,
  lists: () => [name, 'list'] as const,
  list: (filters?: Filters) => [name, 'list', 'flat', filters ?? {}] as const,
  infinite: (filters?: Filters) => [name, 'list', 'infinite', filters ?? {}] as const,
  detail: (id: string) => [name, 'detail', id] as const,
});

/** Old tag: ClientProfile/ME. */
export const profileKeys = {
  all: ['client-profile'] as const,
};

/**
 * Old tags: Conversation/LIST → `detail()`, ChatMessage/MINE → `messages()`.
 * These are SIBLINGS, not nested: invalidating the header must not refetch every
 * loaded page of chat history. Only a socket rejoin (which may have missed
 * messages) invalidates `all`.
 */
export const conversationKeys = {
  all: ['conversation'] as const,
  /** The conversation itself — unread count, coach info. */
  detail: () => ['conversation', 'detail'] as const,
  /** Cursor-paginated message history (InfiniteData). */
  messages: () => ['conversation', 'messages'] as const,
};

/** Old tags: TrainingPlan/{id,LIST}. */
export const trainingPlanKeys = domain('training-plans');

/** Old tags: WorkoutSession/{id,LIST}. */
export const sessionKeys = domain('training-sessions');

export const exerciseKeys = domain('training-exercises');

/** Old tags: NutritionPlan/{LIST,TODAY}. */
export const nutritionPlanKeys = {
  ...domain('nutrition-plans'),
  // Nested under lists() on purpose (RM-143): today IS a list-shaped view of
  // the day's slots. As a sibling key, only one mutation ever remembered to
  // invalidate it; under the prefix, every lists() invalidation sweeps it.
  today: () => [...nutritionPlanKeys.lists(), 'today'] as const,
};

/** Old tag: MealLog/LIST. */
export const mealLogKeys = domain('nutrition-meal-logs');

export const foodKeys = domain('nutrition-foods');
export const recipeKeys = domain('nutrition-recipes');

/** Old tags: FormAssignment/{id,LIST}. */
export const formAssignmentKeys = domain('form-assignments');

/** Old tag: WeightEntry/LIST. */
export const weightEntryKeys = domain('weight-entries');

export const authKeys = {
  all: ['auth'] as const,
  invitation: (token: string) => ['auth', 'invitation', token] as const,
};
