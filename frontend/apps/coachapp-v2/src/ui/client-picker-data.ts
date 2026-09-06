/**
 * Pure data rules behind the Add-to-client picker: which clients are
 * assignable, what their coverage story is, and what selecting one should do.
 */

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

export function clientNeedsProgramming(client: Client): boolean {
  const required = client.required_services as readonly string[];
  const needsTraining = required.includes('training') && !client.training_plan_name;
  const needsNutrition = required.includes('nutrition') && !client.nutrition_plan_name;
  return needsTraining || needsNutrition;
}
