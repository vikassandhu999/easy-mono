import {baseAPISlice} from '../baseAPISlice';

/**
 * NOTE:
 * This is a best-effort type model based on our backend "computed-on-read" schedule MVP.
 * If your backend JSON differs, adjust these types to match the response exactly.
 */

export type ScheduleItemKind = 'nutrition' | 'training';

export type ScheduleCompletion = {
  state: 'completed' | 'in_progress' | 'not_started';
  /**
   * Optional: the related workout session id (training), if present.
   * Backend may omit this depending on implementation.
   */
  session_id?: null | string;
};

export type TrainingScheduleItem = {
  kind: 'training';
  /**
   * Stable id for the item. Backend may use planned_workout_id or synthetic id.
   */
  id: string;
  title: string;
  /**
   * Optional: if you expose the plan/workout ids in the backend.
   */
  training_plan_id?: null | string;
  planned_workout_id?: null | string;

  completion?: ScheduleCompletion;
};

export type NutritionScheduleItem = {
  kind: 'nutrition';
  id: string;
  title: string;

  nutrition_plan_id?: null | string;
  meal_id?: null | string;

  completion?: ScheduleCompletion;
};

export type ScheduleItem = NutritionScheduleItem | TrainingScheduleItem;

export type ScheduleDay = {
  /**
   * ISO date string (YYYY-MM-DD) if provided by backend; some implementations
   * might return RFC3339 or omit this and just use `weekday`.
   */
  date?: string;
  /**
   * ISO weekday 1..7 (Mon..Sun) if provided by backend.
   */
  weekday?: number;

  items: ScheduleItem[];
};

export type GetWeekScheduleRequest = {
  /**
   * Optional: anchor date for week calculation (YYYY-MM-DD).
   * If omitted, backend typically uses "today" in business timezone.
   */
  date?: string;
};

export type GetWeekScheduleResponse = {
  data: {
    days: ScheduleDay[];
    /**
     * Optional: the week start and end boundaries (YYYY-MM-DD).
     */
    week_start?: string;
    week_end?: string;
  };
};

export type GetNextScheduleResponse = {
  data: {
    next: null | (ScheduleItem & {date?: string; weekday?: number});
  };
};

export const scheduleApi = baseAPISlice.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Client schedule - week view
     * GET /api/client/schedule/week
     *
     * Optionally pass `date` (YYYY-MM-DD) to anchor the requested week.
     */
    getWeekSchedule: build.query<GetWeekScheduleResponse, GetWeekScheduleRequest | void>({
      query: (arg) => ({
        url: '/api/client/schedule/week',
        method: 'get',
        params: arg && 'date' in arg ? {date: arg.date} : undefined,
      }),
      providesTags: (_result) => [{type: 'Schedule', id: 'WEEK'}],
    }),

    /**
     * Client schedule - next item
     * GET /api/client/schedule/next
     */
    getNextSchedule: build.query<GetNextScheduleResponse, void>({
      query: () => ({
        url: '/api/client/schedule/next',
        method: 'get',
      }),
      providesTags: (_result) => [{type: 'Schedule', id: 'NEXT'}],
    }),
  }),
});

export const {useGetWeekScheduleQuery, useGetNextScheduleQuery} = scheduleApi;
