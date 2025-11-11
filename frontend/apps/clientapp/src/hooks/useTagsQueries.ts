import {useQuery} from '@tanstack/react-query';
import {TagsAPI} from '@/Api/Tags';
import {ContentType} from '@/Api/Contents';

// Query keys
export const TAGS_QUERY_KEYS = {
    all: ['tags'] as const,
    groups: () => [...TAGS_QUERY_KEYS.all, 'groups'] as const,
    group: (contentType: ContentType) => [...TAGS_QUERY_KEYS.groups(), contentType] as const,
};

interface UseTagGroupsOptions {
    contentType?: ContentType;
    enabled?: boolean;
}

// Hook to fetch tag groups for a specific content type
export const useTagGroups = ({contentType, enabled = true}: UseTagGroupsOptions) => {
    return useQuery({
        queryKey: TAGS_QUERY_KEYS.group(contentType!),
        queryFn: async () => {
            if (!contentType) {
                throw new Error('Content type is required');
            }
            const result = await TagsAPI.listTagGroups({
                content_type: contentType,
            });
            if (result.isError) throw result.error;
            return result.value;
        },
        enabled: enabled && !!contentType,
    });
};
