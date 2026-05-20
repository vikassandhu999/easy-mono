import {api} from '@/api/base';
import {testimonialFromApi} from '@/api/mappers/storefront';
import {ApiListResponse, ApiResponse} from '@/api/shared';

const PAGE_SIZE = 20;

export type TestimonialStatus = 'active' | 'archived';

export type Testimonial = {
  id: string;
  client_name: string;
  client_handle: null | string;
  quote: null | string;
  rating: null | number;
  result_tag: null | string;
  program_name: null | string;
  duration_text: null | string;
  before_image_url: null | string;
  after_image_url: null | string;
  before_weight: null | string;
  after_weight: null | string;
  is_featured: boolean;
  status: TestimonialStatus;
  position: number;
  inserted_at: string;
  updated_at: string;
};

export type TestimonialCreateRequest = {
  client_name: string;
  client_handle?: null | string;
  quote?: null | string;
  rating?: null | number;
  result_tag?: null | string;
  program_name?: null | string;
  duration_text?: null | string;
  before_image_url?: null | string;
  after_image_url?: null | string;
  before_weight?: null | number;
  after_weight?: null | number;
  is_featured?: boolean;
  position?: number;
};

export type TestimonialUpdateRequest = {
  client_name?: string;
  client_handle?: null | string;
  quote?: null | string;
  rating?: null | number;
  result_tag?: null | string;
  program_name?: null | string;
  duration_text?: null | string;
  before_image_url?: null | string;
  after_image_url?: null | string;
  before_weight?: null | number;
  after_weight?: null | number;
  is_featured?: boolean;
  status?: TestimonialStatus;
  position?: number;
};

export type ListTestimonialsParams = {
  offset?: number;
  limit?: number;
};

/** Filter params for infinite query — no offset/limit (pagination handled by infiniteQuery) */
export type ListTestimonialsFilters = Record<string, never>;

export type ApiTestimonial = Testimonial;

function mapTestimonialResponse(response: ApiResponse<ApiTestimonial>): ApiResponse<Testimonial> {
  return {
    ...response,
    data: testimonialFromApi(response.data),
  };
}

function mapTestimonialListResponse(response: ApiListResponse<ApiTestimonial>): ApiListResponse<Testimonial> {
  return {
    ...response,
    data: response.data.map(testimonialFromApi),
  };
}

export const testimonialsApi = api.injectEndpoints({
  endpoints: (build) => ({
    createTestimonial: build.mutation<ApiResponse<Testimonial>, TestimonialCreateRequest>({
      query: (body) => ({
        url: '/v1/coach/testimonials',
        method: 'POST',
        body,
      }),
      transformResponse: mapTestimonialResponse,
      invalidatesTags: [{type: 'Testimonial', id: 'LIST'}],
    }),
    getTestimonial: build.query<ApiResponse<Testimonial>, string>({
      query: (id) => `/v1/coach/testimonials/${id}`,
      transformResponse: mapTestimonialResponse,
      providesTags: (_, __, id) => [{type: 'Testimonial', id}],
    }),
    listTestimonials: build.query<ApiListResponse<Testimonial>, ListTestimonialsParams | void>({
      query: (params) =>
        params
          ? {
              url: '/v1/coach/testimonials',
              params,
            }
          : '/v1/coach/testimonials',
      transformResponse: mapTestimonialListResponse,
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((testimonial) => ({
                type: 'Testimonial' as const,
                id: testimonial.id,
              })),
              {type: 'Testimonial' as const, id: 'LIST'},
            ]
          : [{type: 'Testimonial' as const, id: 'LIST'}],
    }),
    testimonials: build.infiniteQuery<ApiListResponse<Testimonial>, ListTestimonialsFilters | void, number>({
      query: ({pageParam}) => ({
        url: '/v1/coach/testimonials',
        params: {
          offset: pageParam,
          limit: PAGE_SIZE,
        },
      }),
      transformResponse: mapTestimonialListResponse,
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: (lastPage, _allPages, lastPageParam) => {
          const nextOffset = lastPageParam + PAGE_SIZE;
          return nextOffset < lastPage.count ? nextOffset : undefined;
        },
      },
      providesTags: (result) =>
        result
          ? [
              ...result.pages.flatMap((page) =>
                page.data.map((testimonial) => ({
                  type: 'Testimonial' as const,
                  id: testimonial.id,
                })),
              ),
              {type: 'Testimonial' as const, id: 'LIST'},
            ]
          : [{type: 'Testimonial' as const, id: 'LIST'}],
    }),
    updateTestimonial: build.mutation<ApiResponse<Testimonial>, {body: TestimonialUpdateRequest; id: string}>({
      query: ({body, id}) => ({
        url: `/v1/coach/testimonials/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: mapTestimonialResponse,
      invalidatesTags: (_, __, {id}) => [
        {type: 'Testimonial', id},
        {type: 'Testimonial', id: 'LIST'},
      ],
    }),
    deleteTestimonial: build.mutation<void, string>({
      query: (id) => ({
        url: `/v1/coach/testimonials/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'Testimonial', id},
        {type: 'Testimonial', id: 'LIST'},
      ],
    }),
  }),
});

export const {
  useCreateTestimonialMutation,
  useDeleteTestimonialMutation,
  useGetTestimonialQuery,
  useListTestimonialsQuery,
  useTestimonialsInfiniteQuery,
  useUpdateTestimonialMutation,
} = testimonialsApi;
