import type {ClientStatus} from '@/api/clients';
import type {NutritionPlan, TrainingPlan} from '@/api/generated';

type NutritionPlanStatus = NutritionPlan['status'];
type TrainingPlanStatus = TrainingPlan['status'];

export type PlanStatus = NutritionPlanStatus | TrainingPlanStatus;

// Single source of truth for client status → chip color/label (RM-107).
export const STATUS_DISPLAY: Record<ClientStatus, {color: 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  pending: {color: 'default', label: 'Pending'},
  awaiting_seat: {color: 'warning', label: 'Joined, waiting for a seat.'},
  inactive: {color: 'default', label: 'Inactive'},
  archived: {color: 'default', label: 'Archived'},
};

export const PLAN_STATUS_MAP: Record<PlanStatus, {color: 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

// Fallback for statuses the backend might return that we don't recognize (e.g. legacy `draft` rows
// that escaped migration). Keeps the UI resilient instead of crashing on undefined lookups.
export const UNKNOWN_PLAN_STATUS = {color: 'default' as const, label: 'Unknown'};

export function getWhatsAppUrl(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}`;
}
