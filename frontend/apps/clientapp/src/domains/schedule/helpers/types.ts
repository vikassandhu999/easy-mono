import { ReactNode } from 'react';

export type DayKey = string;
export type FilterKind = 'all' | 'training' | 'nutrition';

export type CompletionState = 'completed' | 'in_progress' | 'not_started' | string | undefined;

export interface ScheduleEntity {
  planned_workout_id?: string;
  [key: string]: unknown;
}

export interface ScheduleItem {
  id?: string;
  kind?: 'training' | 'nutrition' | string;
  title?: string;
  subtitle?: string | null;
  status?: string;
  date?: string;
  time?: string;
  cta?: string;
  entity?: ScheduleEntity;
  completion?: { state?: CompletionState } | undefined;
}

export interface NormalizedDay {
  key: DayKey;
  header: string;
  fullHeader: string;
  isToday: boolean;
  items: ScheduleItem[];
  completedCount: number;
  totalCount: number;
}

export interface WeeklyStats {
  completed: number;
  total: number;
}

export interface ScheduleTabsMetadata {
  label: ReactNode;
  value: FilterKind;
}
