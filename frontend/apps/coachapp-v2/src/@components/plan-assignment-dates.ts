/**
 * Assignment-date vocabulary shared by every plan→client flow (builder
 * Add-to-client and the client-tab assign surface).
 */
import {parseDate} from '@internationalized/date';
import {z} from 'zod';

export type PlanKind = 'nutrition' | 'training';

export const PLAN_ASSIGNMENT_DURATIONS = [4, 8, 12] as const;

/**
 * Start is required; end is optional — open-ended coverage is the model
 * (spec 2026-08-06), and nothing in the backend requires a bounded period
 * for either discipline. End may equal but not precede start.
 */
export const planAssignmentDatesSchema = z
  .object({
    endDate: z.string().nullable(),
    startDate: z.string().min(1, 'Start date is required'),
  })
  .refine(({startDate, endDate}) => !startDate || !endDate || parseDate(endDate).compare(parseDate(startDate)) >= 0, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });

export type PlanAssignmentDates = z.infer<typeof planAssignmentDatesSchema>;

/** Choose the earlier calendar day so a "starts today" copy is in force on both local and UTC clocks. */
export function assignmentStartDate(localDate: string, utcDate: string): string {
  return localDate < utcDate ? localDate : utcDate;
}

export function addAssignmentWeeks(startDate: string, weeks: number): string {
  // '' is DateInput's cleared/incomplete value; parseDate('') throws.
  if (!startDate) {
    return startDate;
  }
  return parseDate(startDate).add({weeks}).toString();
}

/**
 * The overlap rejection is a 422 changeset error whose field message reads
 * "overlaps an existing active plan for this client" (both disciplines'
 * exclusion constraints). Returns undefined for anything else so the caller
 * falls back to its generic retry copy.
 */
export function planAssignmentConflictMessage(
  error: unknown,
  planKind: PlanKind,
  clientName: string,
): string | undefined {
  const detail = (error as {data?: {error_detail?: unknown}} | null)?.data?.error_detail;
  const fields = (detail as {fields?: unknown} | null)?.fields ?? detail;
  const messages = Object.values((fields as Record<string, unknown>) ?? {}).flat();
  if (!messages.some((message) => typeof message === 'string' && message.includes('overlap'))) {
    return undefined;
  }
  return `${clientName} already has an active ${planKind} plan during these dates. End or reschedule it before adding another.`;
}
