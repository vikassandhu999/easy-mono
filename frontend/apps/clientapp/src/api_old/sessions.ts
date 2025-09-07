import { Result } from '@/lib/error';
import { z } from 'zod';
import { authedClient } from './auth';

export const ListSessions_zod = z.object({
  page: z.number().min(1),
  page_size: z.number().min(1).max(20),
});

export type ListSessionsProps = z.infer<typeof ListSessions_zod>;

export interface Session {
  id: string;
  coach_id: string;
  client_id: string;
  business_id: string;
  session_type: 'online' | 'offline';
  scheduled_at: string;
  duration_minutes: number;
  feedback?: string;
  follow_up?: string;
  notes?: string;
  coach: { id: string; name: string };
  created_at: Date;
  updated_at: Date;
}

export interface ListSessions extends ListSessionsProps {
  sessions: Session[];
  total: number;
}

export const SessionAPI = {
  listSessions: async (data: ListSessionsProps): Promise<Result<ListSessions>> => {
    try {
      const response = await authedClient.get('/c1/sessions', {
        params: data,
      });
      return Result.success(response.data);
    } catch (error: unknown) {
      return Result.failure(error);
    }
  },
};
