import {useInfiniteQuery, useQuery} from '@tanstack/react-query';
import {ListProgramsProps, ProgramsAPI} from '@/Api/Programs';

export const useProgram = (id?: string) => {
    const query = useQuery({
        queryKey: ['program', id],
        queryFn: async () => {
            if (!id) throw new Error('Program ID is required');
            const result = await ProgramsAPI.getProgram(id);
            return result.getValue();
        },
        enabled: !!id,
    });

    return {
        data: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
    };
};

export const usePrograms = (params: ListProgramsProps = {}) => {
    return useInfiniteQuery({
        queryKey: ['programs', params],
        queryFn: async ({pageParam = 1}) => {
            const result = await ProgramsAPI.listPrograms({
                ...params,
                page: pageParam,
                page_size: 20,
            });
            return result.getValue();
        },
        getNextPageParam: (lastPage) => {
            return lastPage.total === lastPage.page_size ? lastPage.page + 1 : undefined;
        },
        initialPageParam: 1,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};
