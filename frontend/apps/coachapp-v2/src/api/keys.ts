/**
 * Query-key factories — the single registry of cache identity, the React Query
 * successor to the old RTK `tagTypes` list. Every domain's keys live here so
 * cross-domain invalidation (e.g. inviting a client refreshes billing) never
 * needs a cross-file import of anything but this module.
 *
 * Conventions:
 *   fooKeys.all            — root; invalidate to nuke the domain
 *   fooKeys.lists()        — every list-shaped query (flat AND infinite)
 *   fooKeys.list(filters)  — one flat list entry
 *   fooKeys.infinite(f)    — one infinite list entry (separate from `list`:
 *                            the cached value is InfiniteData, not a page)
 *   fooKeys.detail(id)     — one detail entry
 *
 * Old-tag mapping: `{type: 'Foo', id}` → fooKeys.detail(id);
 * `{type: 'Foo', id: 'LIST'}` (and per-row list tags) → fooKeys.lists().
 */

type Filters = Record<string, unknown> | undefined | void;

const domain = <N extends string>(name: N) => ({
  all: [name] as const,
  lists: () => [name, 'list'] as const,
  list: (filters?: Filters) => [name, 'list', 'flat', filters ?? {}] as const,
  infinite: (filters?: Filters) => [name, 'list', 'infinite', filters ?? {}] as const,
  /** Prefix over every detail entry — for mutations that affect details but don't know which id. */
  details: () => [name, 'detail'] as const,
  detail: (id: string) => [name, 'detail', id] as const,
});

export const clientKeys = {
  ...domain('clients'),
  // Nested under lists() on purpose: it IS a list of clients, so every mutation
  // that already invalidates clientKeys.lists() (invite, update, assign, enroll,
  // reassign) refreshes the attention tab + count for free. As a sibling key it
  // was invalidated by nothing and served stale rows for the whole staleTime.
  attention: () => [...clientKeys.lists(), 'attention'] as const,
  weightEntries: (clientId: string) => [...clientKeys.detail(clientId), 'weight-entries'] as const,
};

export const billingKeys = {
  all: ['billing'] as const,
};

export const conversationKeys = {
  ...domain('conversations'),
  /** Prefix over every client-scoped conversation record — for mutations that only know the conversation id. */
  forClients: () => ['conversations', 'for-client'] as const,
  /** The conversation for a given client (GET /clients/{client_id}/conversation). */
  forClient: (clientId: string) => [...conversationKeys.forClients(), clientId] as const,
  /** Cursor-paginated message history (InfiniteData). */
  messages: (conversationId: string) => ['conversations', 'messages', conversationId] as const,
};

export const profileKeys = {
  all: ['coach-profile'] as const,
};

export const businessKeys = {
  all: ['business'] as const,
};

export const teamKeys = {
  all: ['team'] as const,
};

export const landingPageKeys = {
  all: ['landing-page'] as const,
};

export const prospectKeys = domain('prospects');

export const exerciseKeys = domain('training-exercises');
export const muscleKeys = {
  all: ['training-muscles'] as const,
};
export const equipmentKeys = {
  all: ['training-equipment'] as const,
};

export const foodKeys = {
  ...domain('nutrition-foods'),
  categories: () => ['nutrition-foods', 'categories'] as const,
};

export const recipeKeys = domain('nutrition-recipes');

export const nutritionPlanKeys = {
  ...domain('nutrition-plans'),
  /** Prefix over every client's assigned-plans list — for mutations that don't know which client. */
  forClients: () => ['nutrition-plans', 'for-client'] as const,
  forClient: (clientId: string) => [...nutritionPlanKeys.forClients(), clientId] as const,
};

export const mealLogKeys = {
  all: ['nutrition-meal-logs'] as const,
  forClient: (clientId: string, filters?: Filters) => ['nutrition-meal-logs', clientId, filters ?? {}] as const,
};

export const trainingPlanKeys = {
  ...domain('training-plans'),
  /** Prefix over every client's assigned-plans list — for mutations that don't know which client. */
  forClients: () => ['training-plans', 'for-client'] as const,
  forClient: (clientId: string) => [...trainingPlanKeys.forClients(), clientId] as const,
};

export const trainingSessionKeys = {
  forClient: (clientId: string, filters?: Filters) => ['training-sessions', clientId, filters ?? {}] as const,
  detail: (clientId: string, id: string) => ['training-sessions', clientId, 'detail', id] as const,
};

export const formTemplateKeys = domain('form-templates');

export const formAssignmentKeys = {
  all: ['form-assignments'] as const,
  forClient: (clientId: string) => ['form-assignments', 'for-client', clientId] as const,
};

export const checkInKeys = {
  all: ['check-ins'] as const,
  schedules: (clientId: string) => ['check-ins', 'schedules', clientId] as const,
  reviewQueue: (filters?: Filters) =>
    filters ? (['check-ins', 'review-queue', filters] as const) : (['check-ins', 'review-queue'] as const),
};

export const authKeys = {
  all: ['auth'] as const,
  trainerInvitation: (token: string) => ['auth', 'trainer-invitation', token] as const,
};
