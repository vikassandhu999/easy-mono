import {z} from 'zod';
import {Result} from '@/Utils/Error';
import {authedClient} from './auth';

export const ContentTypeEnum = z.enum(['exercise', 'food', 'technique', 'activity', 'guide', 'lesson']);

export const ListTagGroups_zod = z.object({
    content_type: ContentTypeEnum.optional(), // required by backend when called
});

export const ListTags_zod = z.object({
    content_type: ContentTypeEnum.optional(), // required by backend
});

export type ListTagGroupsProps = z.infer<typeof ListTagGroups_zod>;
export type ListTagsProps = z.infer<typeof ListTags_zod>;

export interface Tag {
    id: string;
    tag_group_id: string;
    name: string;
    description: string;
    color: string;
    sort_order: number;
}

export interface TagGroup {
    id: string;
    name: string;
    description: string;
    color: string;
    sort_order: number;
    show_in_listing: boolean;
    tags: Tag[];
}

export interface ListTagGroupsResult {
    records: TagGroup[];
    total: number;
    page: number;
    page_size: number;
}
export interface ListTagsResult {
    records: Tag[];
    total: number;
    page: number;
    page_size: number;
}

export const TagsAPI = {
    listTagGroups: async (params: ListTagGroupsProps): Promise<Result<ListTagGroupsResult>> => {
        try {
            const response = await authedClient.get('/v1/coach/tag-groups', {
                params,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    listTags: async (tagGroupId: string, params: ListTagsProps): Promise<Result<ListTagsResult>> => {
        try {
            const response = await authedClient.get(`/v1/coach/tag-groups/${tagGroupId}/tags`, {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
