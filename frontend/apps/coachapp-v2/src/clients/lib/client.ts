import type {Client, ClientStatus} from '@/api/clients';
import type {NutritionPlan, TrainingPlan} from '@/api/generated';

type NutritionPlanStatus = NutritionPlan['status'];
type TrainingPlanStatus = TrainingPlan['status'];

export type PlanStatus = NutritionPlanStatus | TrainingPlanStatus;

// Single source of truth for client status → chip color/label (RM-107).
export const STATUS_DISPLAY: Record<ClientStatus, {color: 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  pending: {color: 'default', label: 'Invited'},
  inactive: {color: 'default', label: 'Inactive'},
};

// The word "pending" is reserved for invites (see STATUS_DISPLAY.pending) — the
// intake flag always reads "Intake incomplete", never "pending".
export const INACTIVE_REASON_LABEL: Record<string, string> = {
  manual: 'Paused by you',
  subscription_expired: 'Subscription ended',
  awaiting_seat: 'Needs a seat',
};

// Stage chip per spec §3: during onboarding, show the highest-priority missing
// item instead of flag badges; during coaching the flags render as badges.
export function stageChip(client: Client): {color: 'default' | 'success' | 'warning'; label: string} {
  if (client.stage !== 'onboarding') {
    return {color: 'success', label: 'Coaching'};
  }
  if (client.intake_incomplete) {
    return {color: 'warning', label: 'Onboarding · Intake incomplete'};
  }
  if (client.needs_plan) {
    return {color: 'warning', label: 'Onboarding · Needs plan'};
  }
  return {color: 'default', label: 'Onboarding'};
}

export const PLAN_STATUS_MAP: Record<PlanStatus, {color: 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

// Fallback for statuses the backend might return that we don't recognize (e.g. legacy `draft` rows
// that escaped migration). Keeps the UI resilient instead of crashing on undefined lookups.
export const UNKNOWN_PLAN_STATUS = {color: 'default' as const, label: 'Unknown'};

export function getClientName(client: Client): string {
  return [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email || 'Client';
}

export function getWhatsAppUrl(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}`;
}
