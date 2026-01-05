import {baseAPISlice} from '../baseAPISlice';
import {MusclesList, MusclesListOpts} from './muscles_definition';

export const musclesApi = baseAPISlice.injectEndpoints({
  endpoints: (build) => ({
    listMuscles: build.query<MusclesList, MusclesListOpts>({
      query: (params) => ({
        url: '/api/coach/muscles',
        method: 'get',
        params,
      }),
      providesTags: (result) =>
        result
          ? [...result.data.map(({id}) => ({type: 'Muscles' as const, id})), {type: 'Muscles', id: 'LIST'}]
          : [{type: 'Muscles', id: 'LIST'}],
    }),
  }),
  overrideExisting: false,
});

export const {useListMusclesQuery: useListMuscles} = musclesApi;
