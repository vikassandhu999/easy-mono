import {
  CalendarClock,
  ClipboardCheck,
  Dumbbell,
  type LucideIcon,
  MessagesSquare,
  MoonStar,
  UserPlus,
} from 'lucide-react';

import type {TodayEntry} from '@/@components/today-card';
import type {WorkbenchCounts} from '@/api/workbench';

import {workbenchCount} from './workbench-counts';

/**
 * The Today queues — the workbench's vocabulary, owned by the clients feature
 * and consumed by every surface that shows today's work (workbench rail and
 * mobile menu, dashboard). One definition so labels, icons, order and copy
 * can never drift apart across surfaces (workbench spec §9).
 */

export type WorkbenchQueueId = 'check-ins' | 'expiring' | 'onboarding' | 'programming' | 'quiet' | 'replies';

export type QueueDef = {
  countKey: keyof WorkbenchCounts;
  /** What the queue IS — shown when it's drained (spec §12: "No items" alone reads as a bug). */
  definition: string;
  icon: LucideIcon;
  id: WorkbenchQueueId;
  label: string;
  /** The working meta line — only meaningful while count > 0. */
  meta: (count: number) => string;
  muted?: boolean;
  title: string;
};

// Order is the coach's morning sequence: review what came in, answer who's
// waiting, fix what's about to lapse, welcome who's new (spec §3).
export const TODAY_QUEUES: QueueDef[] = [
  {
    countKey: 'check_ins',
    definition: 'Submitted check-ins land here',
    icon: ClipboardCheck,
    id: 'check-ins',
    label: 'Check-ins',
    meta: (n) => `${n} to review, oldest first`,
    title: 'Check-ins',
  },
  {
    countKey: 'replies',
    definition: 'Clients waiting on your reply',
    icon: MessagesSquare,
    id: 'replies',
    label: 'Replies',
    meta: (n) => `${n} waiting on you, longest first`,
    title: 'Replies',
  },
  {
    countKey: 'programming',
    definition: 'Required services without coverage',
    icon: Dumbbell,
    id: 'programming',
    label: 'Programming',
    meta: (n) => `${n} needing programming`,
    title: 'Programming',
  },
  {
    countKey: 'expiring',
    definition: 'Engagements ending within 14 days',
    icon: CalendarClock,
    id: 'expiring',
    label: 'Expiring',
    meta: (n) => `${n} renewals due within 14 days`,
    title: 'Expiring',
  },
  {
    countKey: 'quiet',
    definition: 'Missed check-ins',
    icon: MoonStar,
    id: 'quiet',
    label: 'Quiet',
    meta: (n) => `${n} gone quiet, longest first`,
    title: 'Quiet',
  },
  {
    countKey: 'onboarding',
    definition: 'Invitations and overdue intakes requiring action',
    icon: UserPlus,
    id: 'onboarding',
    label: 'Onboarding',
    meta: (n) => `${n} requiring action`,
    muted: true,
    title: 'Onboarding',
  },
];

/** The queue's one-line story: the working figure, or its definition when drained. */
export function queueMeta(queue: QueueDef, count: number): string {
  return count > 0 ? queue.meta(count) : queue.definition;
}

/** Today-card entries for the current counts; count-less (and meta-less) while counts load. */
export function queueEntries(counts: undefined | WorkbenchCounts): TodayEntry[] {
  return TODAY_QUEUES.map((queue) => ({
    count: counts ? workbenchCount(counts, queue.countKey) : undefined,
    icon: queue.icon,
    id: queue.id,
    label: queue.label,
    meta: counts ? queueMeta(queue, workbenchCount(counts, queue.countKey)) : undefined,
    muted: queue.muted,
  }));
}

/** Whether any non-muted queue needs attention; Onboarding remains deliberately excluded. */
export function hasWorkbenchAttention(counts: WorkbenchCounts): boolean {
  return TODAY_QUEUES.some((queue) => !queue.muted && workbenchCount(counts, queue.countKey) > 0);
}
