import {baseAPISlice} from '../baseAPISlice';
import {EquipmentList, EquipmentListOpts} from './equipment_definition';

export const equipmentApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        listEquipment: build.query<EquipmentList, EquipmentListOpts>({
            query: (params) => ({
                url: '/api/equipment',
                method: 'get',
                params,
            }),
            providesTags: (result) =>
                result
                    ? [
                          ...result.data.map(({id}) => ({type: 'Equipment' as const, id})),
                          {type: 'Equipment', id: 'LIST'},
                      ]
                    : [{type: 'Equipment', id: 'LIST'}],
        }),
    }),
    overrideExisting: false,
});

export const {useListEquipmentQuery: useListEquipment} = equipmentApi;
