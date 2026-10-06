import type {ClientPlanFilters} from './client-plans';
import type {ClientFilters} from './clients';
import type {ConversationFilters} from './conversations';
import type {FoodFilters} from './foods';
import type {NutritionPlanFilters} from './nutrition-plans';
import type {TeamFilters} from './team';
import type {TrainingPlanFilters} from './training-plans';
import type {SessionFilters} from './training-sessions';

export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
  setup: () => [...authKeys.all, 'setup'] as const,
  invitation: (token: string) => [...authKeys.all, 'invitation', token] as const,
};

export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  infinite: (filters: ClientFilters) => [...clientKeys.lists(), 'infinite', filters] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientKeys.details(), id] as const,
};

export const attachmentKeys = {
  all: ['attachments'] as const,
  downloads: (ids: string[]) => [...attachmentKeys.all, 'downloads', ids] as const,
};

export const trainingPlanKeys = {
  all: ['training-plans'] as const,
  lists: () => [...trainingPlanKeys.all, 'list'] as const,
  infinite: (filters: TrainingPlanFilters) => [...trainingPlanKeys.lists(), 'templates', 'infinite', filters] as const,
  forClient: (clientId: string) => [...trainingPlanKeys.lists(), 'client', clientId, 'infinite'] as const,
  clientPlans: (clientId: string, filters: ClientPlanFilters) =>
    [...trainingPlanKeys.lists(), 'client-plans', clientId, filters] as const,
  details: () => [...trainingPlanKeys.all, 'detail'] as const,
  detail: (id: string) => [...trainingPlanKeys.details(), id] as const,
};

export const exerciseKeys = {
  all: ['exercises'] as const,
  lists: () => [...exerciseKeys.all, 'list'] as const,
  infinite: (search: string) => [...exerciseKeys.lists(), 'infinite', {search}] as const,
  details: () => [...exerciseKeys.all, 'detail'] as const,
  detail: (id: string) => [...exerciseKeys.details(), id] as const,
  relations: (kind: 'muscles' | 'equipment', search: string) =>
    [...exerciseKeys.lists(), 'relations', kind, {search}] as const,
};

export const nutritionKeys = {
  all: ['nutrition'] as const,
  lists: () => [...nutritionKeys.all, 'list'] as const,
  infinite: (filters: NutritionPlanFilters) => [...nutritionKeys.lists(), 'templates', 'infinite', filters] as const,
  details: () => [...nutritionKeys.all, 'detail'] as const,
  detail: (id: string) => [...nutritionKeys.details(), id] as const,
  coverage: (clientId: string) => [...nutritionKeys.all, 'coverage', clientId] as const,
  clientPlans: (clientId: string, filters: ClientPlanFilters) =>
    [...nutritionKeys.lists(), 'client-plans', clientId, filters] as const,
};

export const foodKeys = {
  all: ['foods'] as const,
  lists: () => [...foodKeys.all, 'list'] as const,
  infinite: (filters: FoodFilters) => [...foodKeys.lists(), 'infinite', filters] as const,
  categories: () => [...foodKeys.lists(), 'categories'] as const,
  details: () => [...foodKeys.all, 'detail'] as const,
  detail: (id: string) => [...foodKeys.details(), id] as const,
  usage: (id: string, kind: string, search: string) => [...foodKeys.lists(), 'usage', id, {kind, search}] as const,
  copyCandidates: (search: string) => [...foodKeys.lists(), 'copy-candidates', {search}] as const,
};

export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  infinite: (search: string) => [...recipeKeys.lists(), 'infinite', {search}] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
  usage: (id: string, kind: string, search: string) => [...recipeKeys.lists(), 'usage', id, {kind, search}] as const,
  copyCandidates: (search: string) => [...recipeKeys.lists(), 'copy-candidates', {search}] as const,
};

export const trainingSessionKeys = {
  all: ['training-sessions'] as const,
  occurrences: (clientId: string, from: string, to: string) =>
    [...trainingSessionKeys.lists(), clientId, 'occurrences', from, to] as const,
  exercise: (clientId: string, exerciseId: string) =>
    [...trainingSessionKeys.lists(), clientId, 'exercise', exerciseId] as const,
  lists: () => [...trainingSessionKeys.all, 'list'] as const,
  infinite: (clientId: string, filters: SessionFilters) =>
    [...trainingSessionKeys.lists(), clientId, 'infinite', filters] as const,
  details: () => [...trainingSessionKeys.all, 'detail'] as const,
  detail: (clientId: string, id: string) => [...trainingSessionKeys.details(), clientId, id] as const,
};

export const nutritionDayKeys = {
  all: ['nutrition-days'] as const,
  lists: () => [...nutritionDayKeys.all, 'list'] as const,
  day: (clientId: string, date?: string) => [...nutritionDayKeys.lists(), clientId, {date: date ?? 'today'}] as const,
  range: (clientId: string, from: string, to: string) => [...nutritionDayKeys.lists(), clientId, {from, to}] as const,
  metrics: (clientId: string, from: string, to: string) =>
    [...nutritionDayKeys.lists(), clientId, 'food-metrics', {from, to}] as const,
};

export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  infinite: (filters: ConversationFilters) => [...conversationKeys.lists(), 'infinite', filters] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  forClient: (clientId: string) => [...conversationKeys.details(), 'client', clientId] as const,
  history: (id: string) => [...conversationKeys.lists(), 'history', id] as const,
};

export const businessKeys = {
  all: ['business'] as const,
  detail: () => [...businessKeys.all, 'detail'] as const,
  timezones: () => [...businessKeys.all, 'timezones'] as const,
  handle: (handle: string) => [...businessKeys.all, 'handle', handle] as const,
};

export const teamKeys = {
  all: ['team'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  infinite: (filters: TeamFilters) => [...teamKeys.lists(), 'infinite', filters] as const,
  details: () => [...teamKeys.all, 'detail'] as const,
  detail: (id: string) => [...teamKeys.details(), id] as const,
};

export const billingKeys = {all: ['billing'] as const, detail: () => ['billing', 'detail'] as const};

export const trackerKeys = {
  all: ['trackers'] as const,
  lists: () => [...trackerKeys.all, 'list'] as const,
  infinite: (filters: object) => [...trackerKeys.lists(), 'infinite', filters] as const,
  details: () => [...trackerKeys.all, 'detail'] as const,
  detail: (id: string) => [...trackerKeys.details(), id] as const,
  assignments: (clientId: string) => [...trackerKeys.lists(), clientId, 'assignments'] as const,
  requests: (clientId: string) => [...trackerKeys.lists(), clientId, 'requests'] as const,
  entries: (clientId: string, filters: object) => [...trackerKeys.lists(), clientId, 'entries', filters] as const,
  metrics: (clientId: string, id: string, filters: object) =>
    [...trackerKeys.lists(), clientId, 'metrics', id, filters] as const,
  settings: () => [...trackerKeys.all, 'settings'] as const,
};

export const trackerTemplateKeys = {
  all: ['tracker-templates'] as const,
  lists: () => [...trackerTemplateKeys.all, 'list'] as const,
  infinite: (search: string) => [...trackerTemplateKeys.lists(), 'infinite', {search}] as const,
  details: () => [...trackerTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...trackerTemplateKeys.details(), id] as const,
};

export const reviewKeys = {
  all: ['reviews'] as const,
  lists: () => [...reviewKeys.all, 'list'] as const,
  roster: (filters: object) => [...reviewKeys.lists(), 'roster', filters] as const,
  history: (clientId: string) => [...reviewKeys.lists(), 'history', clientId] as const,
  screen: (clientId: string, range: object) => [...reviewKeys.all, 'screen', clientId, range] as const,
  settings: () => [...reviewKeys.all, 'settings'] as const,
};
