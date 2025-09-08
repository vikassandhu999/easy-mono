import {z} from 'zod';

import {Result} from '@/utils/error.ts';

import {authedClient} from './auth';

export const ContentTypeEnum = z.enum(['exercise', 'food', 'technique', 'activity', 'guide', 'lesson']);

export const ListMetrics_zod = z.object({
    content_type: ContentTypeEnum.optional(), // optional by backend
});

export type ListMetricsProps = z.infer<typeof ListMetrics_zod>;

export interface ListMetricsResult {
    page: number;
    page_size: number;
    records: Metric[];
    total: number;
}

export interface Metric {
    category?: string;
    chart_type?: string;
    default_value?: number;
    description: string;
    display_name: string;
    display_order: number;
    icon?: string;
    is_global: boolean;
    key: string;
    max_value?: number;
    metric_type: 'boolean' | 'choice' | 'duration' | 'number' | 'scale' | 'text';
    min_value?: number;
    options?: any; // JSON data for choice metrics
    scope: 'per_session' | 'per_set';
    unit?: string;
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
