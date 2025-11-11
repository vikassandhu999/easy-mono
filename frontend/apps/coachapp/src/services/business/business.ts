import {baseAPISlice} from '../baseAPISlice';
import {CreateBusinessOnboardingResponse, CreateBusinessRequest} from './business_definition';

// RTK Query API for business onboarding
export const businessApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        createBusiness: build.mutation<CreateBusinessOnboardingResponse, CreateBusinessRequest>({
            query: (body) => ({
                url: '/api/onboarding/business',
                method: 'post',
                data: body,
            }),
        }),
    }),
    overrideExisting: false,
});

export const {useCreateBusinessMutation} = businessApi;
