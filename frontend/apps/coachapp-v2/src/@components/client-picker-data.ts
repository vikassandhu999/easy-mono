/**
 * Pure data rules behind the Add-to-client picker: which clients are
 * assignable, what their coverage story is, and what selecting one should do.
 */
import type {PlanKind} from '@/@components/plan-assignment-dates';
import type {Client} from '@/api/clients';

export const CLIENT_PICKER_PAGE_SIZE = 20;

/**
 * Merge per-status server pages back into one page in the server's
 * newest-first order. Eligibility (active/pending only) is applied by the
 * per-status requests BEFORE the limit — filtering a bounded mixed page
 * afterwards let inactive rows consume eligible slots (RM-185).
 */
export function eligibleClientPage(clients: Client[], limit = CLIENT_PICKER_PAGE_SIZE): Client[] {
  return clients
    .filter((client) => client.status === 'active' || client.status === 'pending')
    .sort((a, b) => b.inserted_at.localeCompare(a.inserted_at) || b.id.localeCompare(a.id))
    .slice(0, limit);
}

export function clientContact(client: Client): string {
  return client.email || client.phone || 'No contact';
}

/** Who receives the plan, for dialogs and toasts: name → email → phone → 'Client'. */
export function clientRecipientName(client: Client, fullName: string): string {
  return fullName || client.email || client.phone || 'Client';
}

/**
 * The client's coverage story, in the workbench vocabulary (add-to-client
 * spec §2.2). A pending client's enriched plan name still proves coverage
 * (AC-009): invitation status does not make their assigned plan disappear.
 * Copy belongs to the rendering component; this returns the facts.
 */
export type ClientCoverage =
  | {kind: 'needs-programming'; coverageEnds: null | string}
  | {kind: 'covered'; until: null | string}
  | {kind: 'uncovered'};

export function clientCoverage(client: Client): ClientCoverage {
  if (client.needs_programming) {
    return {coverageEnds: client.covered_until ?? null, kind: 'needs-programming'};
  }
  if (client.covered_until) {
    return {kind: 'covered', until: client.covered_until};
  }
  if (client.nutrition_plan_name || client.training_plan_name || client.status === 'active') {
    return {kind: 'covered', until: null};
  }
  return {kind: 'uncovered'};
}

/**
 * What selecting a client does (add-to-client spec §3): a current
 * same-discipline plan hard-blocks, any other live coverage asks first, and
 * a client who needs programming goes straight to the date step.
 */
export type PlanAddDecision =
  | {kind: 'schedule'}
  | {kind: 'blocked'; existingPlanName: string}
  | {kind: 'confirm'; otherPlanName: null | string; coveredUntil: null | string};

export function planAddDecision(client: Client, planKind: PlanKind): PlanAddDecision {
  const existingPlanName = (planKind === 'nutrition' ? client.nutrition_plan_name : client.training_plan_name) || null;
  if (existingPlanName) {
    return {existingPlanName, kind: 'blocked'};
  }
  const otherPlanName = (planKind === 'nutrition' ? client.training_plan_name : client.nutrition_plan_name) || null;
  if (otherPlanName || clientCoverage(client).kind === 'covered') {
    return {coveredUntil: client.covered_until ?? null, kind: 'confirm', otherPlanName};
  }
  return {kind: 'schedule'};
}
