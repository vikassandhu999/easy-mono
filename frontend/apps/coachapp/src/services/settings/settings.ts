import {baseAPISlice} from '../baseAPISlice';
import {
    BusinessSettings,
    BusinessSettingsResponse,
    UpdateAllSettingsProps,
    UpdateBrandingSettingsProps,
    UpdatePublicJoinSettingsProps,
} from './settings_definition';

export const settingsApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        // GET /api/organization/settings
        getBusinessSettings: build.query<BusinessSettings, void>({
            query: () => ({
                url: '/api/coach/organization/settings',
                method: 'get',
            }),
            transformResponse: (response: BusinessSettingsResponse) => response.data,
            providesTags: ['BusinessSettings'],
        }),

        // PATCH /api/organization/settings
        updateBusinessSettings: build.mutation<BusinessSettings, UpdateAllSettingsProps>({
            query: (body) => ({
                url: '/api/coach/organization/settings',
                method: 'patch',
                data: {settings: body},
            }),
            transformResponse: (response: BusinessSettingsResponse) => response.data,
            invalidatesTags: ['BusinessSettings'],
        }),

        // PATCH /api/organization/settings/public-join
        updatePublicJoinSettings: build.mutation<BusinessSettings, UpdatePublicJoinSettingsProps>({
            query: (body) => ({
                url: '/api/coach/organization/settings/public-join',
                method: 'patch',
                data: {settings: body},
            }),
            transformResponse: (response: BusinessSettingsResponse) => response.data,
            invalidatesTags: ['BusinessSettings'],
        }),

        // PATCH /api/organization/settings/branding
        updateBrandingSettings: build.mutation<BusinessSettings, UpdateBrandingSettingsProps>({
            query: (body) => ({
                url: '/api/coach/organization/settings/branding',
                method: 'patch',
                data: {settings: body},
            }),
            transformResponse: (response: BusinessSettingsResponse) => response.data,
            invalidatesTags: ['BusinessSettings'],
        }),

        // POST /api/organization/settings/regenerate-code
        regenerateJoinCode: build.mutation<BusinessSettings, void>({
            query: () => ({
                url: '/api/coach/organization/settings/regenerate-code',
                method: 'post',
            }),
            transformResponse: (response: BusinessSettingsResponse) => response.data,
            invalidatesTags: ['BusinessSettings'],
        }),

        // POST /api/organization/settings/enable-public-join
        enablePublicJoin: build.mutation<BusinessSettings, void>({
            query: () => ({
                url: '/api/coach/organization/settings/enable-public-join',
                method: 'post',
            }),
            transformResponse: (response: BusinessSettingsResponse) => response.data,
            invalidatesTags: ['BusinessSettings'],
        }),

        // POST /api/organization/settings/disable-public-join
        disablePublicJoin: build.mutation<BusinessSettings, void>({
            query: () => ({
                url: '/api/coach/organization/settings/disable-public-join',
                method: 'post',
            }),
            transformResponse: (response: BusinessSettingsResponse) => response.data,
            invalidatesTags: ['BusinessSettings'],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetBusinessSettingsQuery,
    useUpdateBusinessSettingsMutation,
    useUpdatePublicJoinSettingsMutation,
    useUpdateBrandingSettingsMutation,
    useRegenerateJoinCodeMutation,
    useEnablePublicJoinMutation,
    useDisablePublicJoinMutation,
} = settingsApi;
