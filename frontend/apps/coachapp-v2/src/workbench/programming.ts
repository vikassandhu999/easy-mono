import type {components} from '../api/schema.ts';
import {ROUTES} from '../routes.ts';

export type ProgrammingServiceFilter = 'all' | 'nutrition' | 'training';
export type ProgrammingPriorityId = 'coverage_lapsed' | 'ending_soon' | 'never_programmed';

type ProgrammingReason = components['schemas']['WorkbenchProgrammingReason'];
type ProgrammingItem = {
  client: {id: string};
  reasons: ProgrammingReason[];
};

export type NonEmpty<T> = [T, ...T[]];
export type ProgrammingReasonList = NonEmpty<ProgrammingReason>;

export type FilteredProgrammingItem<T extends ProgrammingItem = ProgrammingItem> = T & {
  reasons: ProgrammingReasonList;
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

const PRIORITY_DESCRIPTION: Record<ProgrammingPriorityId, string> = {
  coverage_lapsed: 'Coverage is already broken',
  ending_soon: 'Prepare the successor plan',
  never_programmed: 'Initial plans first',
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

export function programmingGroupDescription(id: ProgrammingPriorityId): string {
  return PRIORITY_DESCRIPTION[id];
}

/** Explicit Assign-plan navigation state for the matching Training/Nutrition tab. */
export function assignPlanHref(clientId: string, service: 'nutrition' | 'training'): string {
  return `${ROUTES.CLIENT_DETAIL.replace(':id', clientId)}?tab=${service}&assign=plan`;
}

export function primaryReason<T>(reasons: NonEmpty<T>): T {
  return reasons[0];
}

export function requirePrimaryReason<T>(reasons: readonly T[]): T {
  const first = reasons[0];
  if (first === undefined) {
    throw new Error('Workbench queue item is missing a reason');
  }
  return first;
}

function filterItemReasons<T extends ProgrammingItem>(
  item: T,
  filter: ProgrammingServiceFilter,
): FilteredProgrammingItem<T> | null {
  const reasons = filterProgrammingReasons(item.reasons, filter);
  const [first, ...rest] = reasons;
  if (first === undefined) {
    return null;
  }
  return {...item, reasons: [first, ...rest]};
}

export function groupProgrammingItems<T extends ProgrammingItem>(
  items: T[],
  filter: ProgrammingServiceFilter,
): {id: ProgrammingPriorityId; items: FilteredProgrammingItem<T>[]; label: string}[] {
  const filtered = items.flatMap((item) => {
    const withReasons = filterItemReasons(item, filter);
    return withReasons ? [withReasons] : [];
  });

  return PRIORITY_ORDER.flatMap((id) => {
    const groupItems = filtered.filter((item) => programmingPriorityId(primaryReason(item.reasons)) === id);
    return groupItems.length > 0 ? [{id, items: groupItems, label: PRIORITY_LABEL[id]}] : [];
  });
}
