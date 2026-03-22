import {baseAPISlice} from '../baseAPISlice';
import {PublicJoinDetails} from './publicJoin_definition';

export const publicJoinApi = baseAPISlice.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Get public join details by code
     * GET /api/join/:code
     *
     * This is a public endpoint (no auth required)
     * Used to display business info before client joins via public link
     */
    getPublicJoinDetails: build.query<PublicJoinDetails, string>({
      query: (code) => ({
        url: `/api/join/${code}`,
        method: 'get',
      }),
      providesTags: (_result, _error, code) => [{type: 'PublicJoin', id: code}],
    }),
  }),
  overrideExisting: false,
});

export const {useGetPublicJoinDetailsQuery, useLazyGetPublicJoinDetailsQuery} = publicJoinApi;
