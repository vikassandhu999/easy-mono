import type {WorkbenchCounts} from '../../api/workbench.ts';

/** Every Today queue exposes a scalar count; Programming's scalar is its distinct-client All count. */
export function workbenchCount(counts: WorkbenchCounts, key: keyof WorkbenchCounts): number {
  const value = counts[key];
  return typeof value === 'number' ? value : value.all;
}
