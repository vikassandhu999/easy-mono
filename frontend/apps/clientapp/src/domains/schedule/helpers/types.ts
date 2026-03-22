import {ReactNode} from 'react';

export type DayKey = string;
export type FilterKind = 'all' | 'nutrition' | 'training';

export type CompletionState = 'completed' | 'in_progress' | 'not_started' | string | undefined;

export interface ScheduleEntity {
  [key: string]: unknown;
  planned_workout_id?: string;
}

export interface ScheduleItem {
  completion?: undefined | {state?: CompletionState};
  cta?: string;
  date?: string;
  entity?: ScheduleEntity;
  id?: string;
  kind?: 'nutrition' | 'training' | string;
  status?: string;
  subtitle?: null | string;
  time?: string;
  title?: string;
}

export interface NormalizedDay {
  completedCount: number;
  fullHeader: string;
  header: string;
  isToday: boolean;
  items: ScheduleItem[];
  key: DayKey;
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
