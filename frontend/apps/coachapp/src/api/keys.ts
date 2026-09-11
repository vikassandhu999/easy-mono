import type {ScheduleFilters} from './check-in-schedules';
import type {ClientFilters} from './clients';
import type {FormTemplateFilters} from './forms';
import type {TrainingPlanFilters} from './training-plans';

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

export const formKeys = {
  all: ['forms'] as const,
  defaultIntake: () => [...formKeys.all, 'default-intake'] as const,
  lists: () => [...formKeys.all, 'list'] as const,
  infinite: (filters: FormTemplateFilters) => [...formKeys.lists(), 'templates', 'infinite', filters] as const,
  details: () => [...formKeys.all, 'detail'] as const,
  detail: (id: string) => [...formKeys.details(), id] as const,
  intake: (clientId: string) => [...formKeys.all, 'intake', clientId] as const,
  submissions: (assignmentId: string) => [...formKeys.lists(), 'submissions', {assignmentId}] as const,
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
  infinite: (search: string) => [...nutritionKeys.lists(), 'templates', 'infinite', {search}] as const,
  details: () => [...nutritionKeys.all, 'detail'] as const,
  detail: (id: string) => [...nutritionKeys.details(), id] as const,
  coverage: (clientId: string) => [...nutritionKeys.all, 'coverage', clientId] as const,
};

export const foodKeys = {
  all: ['foods'] as const,
  lists: () => [...foodKeys.all, 'list'] as const,
  infinite: (search: string) => [...foodKeys.lists(), 'infinite', {search}] as const,
  details: () => [...foodKeys.all, 'detail'] as const,
  detail: (id: string) => [...foodKeys.details(), id] as const,
};

export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  infinite: (search: string) => [...recipeKeys.lists(), 'infinite', {search}] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
};

export const checkInKeys = {
  all: ['check-in-schedules'] as const,
  lists: () => [...checkInKeys.all, 'list'] as const,
  forClient: (clientId: string) => [...checkInKeys.lists(), clientId] as const,
  infinite: (clientId: string, filters: ScheduleFilters) =>
    [...checkInKeys.forClient(clientId), 'infinite', filters] as const,
};
