import {z} from 'zod';
import {Result} from '@/Utils/Error';
import {authedClient} from './auth';

export const ContentTypeEnum = z.enum(['exercise', 'food', 'technique', 'activity', 'guide', 'lesson']);

export const ListMetrics_zod = z.object({
    content_type: ContentTypeEnum.optional(), // optional by backend
});

export type ListMetricsProps = z.infer<typeof ListMetrics_zod>;

export interface Metric {
    key: string;
    display_name: string;
    description: string;
    metric_type: 'number' | 'scale' | 'duration' | 'text' | 'boolean' | 'choice';
    scope: 'per_set' | 'per_session';
    is_global: boolean;
    display_order: number;
    unit?: string;
    category?: string;
    min_value?: number;
    max_value?: number;
    default_value?: number;
    chart_type?: string;
    icon?: string;
    options?: any; // JSON data for choice metrics
}

export interface ListMetricsResult {
    records: Metric[];
    total: number;
    page: number;
    page_size: number;
}

export const MetricsAPI = {
    listMetrics: async (params: ListMetricsProps = {}): Promise<Result<ListMetricsResult>> => {
        try {
            const response = await authedClient.get('/v1/coach/metrics', {
                params,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
