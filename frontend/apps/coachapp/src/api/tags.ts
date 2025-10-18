import {z} from 'zod';

export const ContentTypeEnum = z.enum(['exercise', 'food', 'technique', 'activity', 'guide', 'lesson']);

export const ListTagGroups_zod = z.object({
    content_type: ContentTypeEnum.optional(), // required by backend when called
});

export const ListTags_zod = z.object({
    content_type: ContentTypeEnum.optional(), // required by backend
});

export type ListTagGroupsProps = z.infer<typeof ListTagGroups_zod>;
export interface ListTagGroupsResult {
    page: number;
    page_size: number;
    records: TagGroup[];
    total: number;
}

export type ListTagsProps = z.infer<typeof ListTags_zod>;

export interface ListTagsResult {
    page: number;
    page_size: number;
    records: Tag[];
    total: number;
}

export interface Tag {
    color: string;
    description: string;
    id: string;
    name: string;
    sort_order: number;
    tag_group_id: string;
}
export interface TagGroup {
    color: string;
    description: string;
    id: string;
    name: string;
    show_in_listing: boolean;
    sort_order: number;
    tags: Tag[];
}
