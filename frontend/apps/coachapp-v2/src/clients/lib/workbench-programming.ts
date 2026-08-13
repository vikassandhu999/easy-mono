import {ROUTES} from '../../@config/routes.ts';
import type {components} from '../../api/schema.ts';

export type ProgrammingServiceFilter = 'all' | 'nutrition' | 'training';
export type ProgrammingPriorityId = 'coverage_lapsed' | 'ending_soon' | 'never_programmed';

type ProgrammingReason = components['schemas']['WorkbenchProgrammingReason'];
type ProgrammingItem = {
  client: {id: string};
  reasons: ProgrammingReason[];
};

const PRIORITY: Record<ProgrammingReason['code'], ProgrammingPriorityId> = {
  service_coverage_ending_soon: 'ending_soon',
  service_coverage_missing: 'coverage_lapsed',
  service_never_programmed: 'never_programmed',
};

const PRIORITY_ORDER: ProgrammingPriorityId[] = ['never_programmed', 'coverage_lapsed', 'ending_soon'];

const PRIORITY_LABEL: Record<ProgrammingPriorityId, string> = {
  coverage_lapsed: 'Coverage lapsed',
  ending_soon: 'Ending soon',
  never_programmed: 'Never programmed',
};

export function filterProgrammingReasons(
  reasons: ProgrammingReason[],
  filter: ProgrammingServiceFilter,
): ProgrammingReason[] {
  return filter === 'all' ? reasons : reasons.filter((reason) => reason.service === filter);
}

export function programmingPriorityRank(reason: ProgrammingReason): number {
  return PRIORITY_ORDER.indexOf(PRIORITY[reason.code]);
}

export function programmingPriorityId(reason: ProgrammingReason): ProgrammingPriorityId {
  return PRIORITY[reason.code];
}

/** Explicit Assign-plan navigation state for the matching Training/Nutrition tab. */
export function assignPlanHref(clientId: string, service: 'nutrition' | 'training'): string {
  return `${ROUTES.CLIENT_DETAIL.replace(':id', clientId)}?tab=${service}&assign=plan`;
}

export function groupProgrammingItems<T extends ProgrammingItem>(
  items: T[],
  filter: ProgrammingServiceFilter,
): {id: ProgrammingPriorityId; items: Array<T & {reasons: ProgrammingReason[]}>; label: string}[] {
  const filtered = items.flatMap((item) => {
    const reasons = filterProgrammingReasons(item.reasons, filter);
    return reasons.length > 0 ? [{...item, reasons}] : [];
  });

  return PRIORITY_ORDER.flatMap((id) => {
    const groupItems = filtered.filter((item) => programmingPriorityId(item.reasons[0]!) === id);
    return groupItems.length > 0 ? [{id, items: groupItems, label: PRIORITY_LABEL[id]}] : [];
  });
}
