import {baseAPISlice} from '../baseAPISlice';

export type BusinessBranding = {
    id: string;
    name: string;
    handle: string;
    logo_url: string | null;
};

export type GetBusinessResponse = {
    data: BusinessBranding;
};

export const businessApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        /**
         * Client-authenticated business branding endpoint
         * GET /api/client/business
         */
        getBusiness: build.query<GetBusinessResponse, void>({
            query: () => ({
                url: '/api/client/business',
                method: 'get',
            }),
            providesTags: (_result) => [{type: 'Business', id: 'CURRENT'}],
        }),
    }),
    overrideExisting: false,
});

export const {useGetBusinessQuery, useLazyGetBusinessQuery} = businessApi;
