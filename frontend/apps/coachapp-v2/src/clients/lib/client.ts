import type {ClientStatus} from '@/api/clients';
import type {NutritionPlanStatus} from '@/api/nutritionPlans';
import type {TrainingPlanStatus} from '@/api/trainingPlans';

export type PlanStatus = NutritionPlanStatus | TrainingPlanStatus;

export const STATUS_CHIP_COLOR: Record<ClientStatus, 'default' | 'success'> = {
  active: 'success',
  pending: 'default',
  inactive: 'default',
  archived: 'default',
};

export const PLAN_STATUS_MAP: Record<PlanStatus, {color: 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

// Fallback for statuses the backend might return that we don't recognize (e.g. legacy `draft` rows
// that escaped migration). Keeps the UI resilient instead of crashing on undefined lookups.
export const UNKNOWN_PLAN_STATUS = {color: 'default' as const, label: 'Unknown'};

export function getInitials(firstName: null | string, lastName: null | string): string {
  const first = firstName?.charAt(0)?.toUpperCase() ?? '';
  const last = lastName?.charAt(0)?.toUpperCase() ?? '';
  return first + last || '?';
}

export function getFullName(firstName: null | string, lastName: null | string): string {
  return [firstName, lastName].filter(Boolean).join(' ') || 'No name';
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getWhatsAppUrl(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}`;
}
