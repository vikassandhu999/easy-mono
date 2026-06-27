import {api} from './base';

const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    logMeal: build.mutation<LogMealApiResponse, LogMealApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/nutrition-food-log-entries/log-meal`,
        method: 'POST',
        body: queryArg.foodLogEntryRequest,
      }),
    }),
    submitClientFormAssignment: build.mutation<SubmitClientFormAssignmentApiResponse, SubmitClientFormAssignmentApiArg>(
      {
        query: (queryArg) => ({
          url: `/v1/client/form-assignments/${queryArg.id}/submit`,
          method: 'POST',
          body: queryArg.clientProfileFormSubmissionRequest,
        }),
      },
    ),
    deleteFoodLogEntry: build.mutation<DeleteFoodLogEntryApiResponse, DeleteFoodLogEntryApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/nutrition-food-log-entries/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    updateFoodLogEntry: build.mutation<UpdateFoodLogEntryApiResponse, UpdateFoodLogEntryApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/nutrition-food-log-entries/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.foodLogEntryRequest,
      }),
    }),
    listClientTrainingSessions: build.query<ListClientTrainingSessionsApiResponse, ListClientTrainingSessionsApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/training-sessions`,
        params: {
          from: queryArg['from'],
          to: queryArg.to,
        },
      }),
    }),
    createClientTrainingSession: build.mutation<
      CreateClientTrainingSessionApiResponse,
      CreateClientTrainingSessionApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/client/training-sessions`,
        method: 'POST',
        body: queryArg.trainingSessionRequest,
      }),
    }),
    submitApplication: build.mutation<SubmitApplicationApiResponse, SubmitApplicationApiArg>({
      query: (queryArg) => ({
        url: `/v1/public/landing-pages/${queryArg.slug}/applications`,
        method: 'POST',
        body: queryArg.publicApplicationRequest,
      }),
    }),
    listClientThreads: build.query<ListClientThreadsApiResponse, ListClientThreadsApiArg>({
      query: () => ({url: `/v1/client/threads`}),
    }),
    createClientThread: build.mutation<CreateClientThreadApiResponse, CreateClientThreadApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/threads`,
        method: 'POST',
        body: queryArg.clientThreadCreateRequest,
      }),
    }),
    showInvitation: build.query<ShowInvitationApiResponse, ShowInvitationApiArg>({
      query: (queryArg) => ({url: `/v1/auth/invitations/${queryArg.token}`}),
    }),
    getClientExercise: build.query<GetClientExerciseApiResponse, GetClientExerciseApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/training-exercises/${queryArg.id}`,
      }),
    }),
    listClientNutritionPlans: build.query<ListClientNutritionPlansApiResponse, ListClientNutritionPlansApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/nutrition-plans`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
          status: queryArg.status,
        },
      }),
    }),
    getPublicLandingPage: build.query<GetPublicLandingPageApiResponse, GetPublicLandingPageApiArg>({
      query: (queryArg) => ({
        url: `/v1/public/landing-pages/${queryArg.slug}`,
      }),
    }),
    createAuthToken: build.mutation<CreateAuthTokenApiResponse, CreateAuthTokenApiArg>({
      query: (queryArg) => ({
        url: `/v1/auth/token`,
        method: 'POST',
        body: queryArg.tokenRequest,
      }),
    }),
    listClientRecipes: build.query<ListClientRecipesApiResponse, ListClientRecipesApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/nutrition-recipes`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
          search: queryArg.search,
        },
      }),
    }),
    getClientTrainingPlanToday: build.query<GetClientTrainingPlanTodayApiResponse, GetClientTrainingPlanTodayApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/training-plans/today`,
        params: {
          date: queryArg.date,
        },
      }),
    }),
    logDay: build.mutation<LogDayApiResponse, LogDayApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/nutrition-food-log-entries/log-day`,
        method: 'POST',
        body: queryArg.foodLogEntryRequest,
      }),
    }),
    acceptInvite: build.mutation<AcceptInviteApiResponse, AcceptInviteApiArg>({
      query: (queryArg) => ({
        url: `/v1/auth/accept-invite`,
        method: 'POST',
        body: queryArg.acceptInviteRequest,
      }),
    }),
    getClientThread: build.query<GetClientThreadApiResponse, GetClientThreadApiArg>({
      query: (queryArg) => ({url: `/v1/client/threads/${queryArg.id}`}),
    }),
    listClientFormAssignments: build.query<ListClientFormAssignmentsApiResponse, ListClientFormAssignmentsApiArg>({
      query: () => ({url: `/v1/client/form-assignments`}),
    }),
    createClientPerformedSet: build.mutation<CreateClientPerformedSetApiResponse, CreateClientPerformedSetApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/training-sessions/${queryArg.sessionId}/performed-sets`,
        method: 'POST',
        body: queryArg.trainingPerformedSetRequest,
      }),
    }),
    getClientRecipe: build.query<GetClientRecipeApiResponse, GetClientRecipeApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/nutrition-recipes/${queryArg.id}`,
      }),
    }),
    getClientCoachingProfile: build.query<GetClientCoachingProfileApiResponse, GetClientCoachingProfileApiArg>({
      query: () => ({url: `/v1/client/profile`}),
    }),
    updateClientCoachingProfile: build.mutation<
      UpdateClientCoachingProfileApiResponse,
      UpdateClientCoachingProfileApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/client/profile`,
        method: 'PATCH',
        body: queryArg.clientCoachingProfileUpdateRequest,
      }),
    }),
    listClientTrainingPlans: build.query<ListClientTrainingPlansApiResponse, ListClientTrainingPlansApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/training-plans`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
          status: queryArg.status,
        },
      }),
    }),
    listClientFoods: build.query<ListClientFoodsApiResponse, ListClientFoodsApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/nutrition-foods`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
          search: queryArg.search,
        },
      }),
    }),
    getClientFormAssignment: build.query<GetClientFormAssignmentApiResponse, GetClientFormAssignmentApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/form-assignments/${queryArg.id}`,
      }),
    }),
    verifyAuth: build.mutation<VerifyAuthApiResponse, VerifyAuthApiArg>({
      query: (queryArg) => ({
        url: `/v1/auth/verify`,
        method: 'POST',
        body: queryArg.verifyRequest,
      }),
    }),
    getClientProfile: build.query<GetClientProfileApiResponse, GetClientProfileApiArg>({
      query: () => ({url: `/v1/client/me`}),
    }),
    updateClientProfile: build.mutation<UpdateClientProfileApiResponse, UpdateClientProfileApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/me`,
        method: 'PATCH',
        body: queryArg.clientProfileUpdateRequest,
      }),
    }),
    deleteClientPerformedSet: build.mutation<DeleteClientPerformedSetApiResponse, DeleteClientPerformedSetApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/training-performed-sets/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    updateClientPerformedSet: build.mutation<UpdateClientPerformedSetApiResponse, UpdateClientPerformedSetApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/training-performed-sets/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.trainingPerformedSetRequest,
      }),
    }),
    getClientNutritionPlan: build.query<GetClientNutritionPlanApiResponse, GetClientNutritionPlanApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/nutrition-plans/${queryArg.id}`,
      }),
    }),
    getClientTrainingSession: build.query<GetClientTrainingSessionApiResponse, GetClientTrainingSessionApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/training-sessions/${queryArg.id}`,
      }),
    }),
    updateClientTrainingSession: build.mutation<
      UpdateClientTrainingSessionApiResponse,
      UpdateClientTrainingSessionApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/client/training-sessions/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.trainingSessionUpdateRequest,
      }),
    }),
    getClientTrainingPlan: build.query<GetClientTrainingPlanApiResponse, GetClientTrainingPlanApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/training-plans/${queryArg.id}`,
      }),
    }),
    getClientFood: build.query<GetClientFoodApiResponse, GetClientFoodApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/nutrition-foods/${queryArg.id}`,
      }),
    }),
    listWeightEntries: build.query<ListWeightEntriesApiResponse, ListWeightEntriesApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/weight_entries`,
        params: {
          since: queryArg.since,
        },
      }),
    }),
    createWeightEntry: build.mutation<CreateWeightEntryApiResponse, CreateWeightEntryApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/weight_entries`,
        method: 'POST',
        body: queryArg.weightEntryRequest,
      }),
    }),
    verifyInvitation: build.mutation<VerifyInvitationApiResponse, VerifyInvitationApiArg>({
      query: (queryArg) => ({
        url: `/v1/auth/accept-invite/verify`,
        method: 'POST',
        body: queryArg.acceptInviteVerifyRequest,
      }),
    }),
    getTodayNutritionPlan: build.query<GetTodayNutritionPlanApiResponse, GetTodayNutritionPlanApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/nutrition-plans/today`,
        params: {
          date: queryArg.date,
        },
      }),
    }),
    listClientMealLogs: build.query<ListClientMealLogsApiResponse, ListClientMealLogsApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/nutrition-meal-logs`,
        params: {
          date: queryArg.date,
          from: queryArg['from'],
          to: queryArg.to,
        },
      }),
    }),
    createClientThreadMessage: build.mutation<CreateClientThreadMessageApiResponse, CreateClientThreadMessageApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/threads/${queryArg.threadId}/messages`,
        method: 'POST',
        body: queryArg.threadMessageRequest,
      }),
    }),
    createFoodLogEntry: build.mutation<CreateFoodLogEntryApiResponse, CreateFoodLogEntryApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/nutrition-food-log-entries`,
        method: 'POST',
        body: queryArg.foodLogEntryRequest,
      }),
    }),
    signup: build.mutation<SignupApiResponse, SignupApiArg>({
      query: (queryArg) => ({
        url: `/v1/auth/signup`,
        method: 'POST',
        body: queryArg.signupRequest,
      }),
    }),
    deleteWeightEntry: build.mutation<DeleteWeightEntryApiResponse, DeleteWeightEntryApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/weight_entries/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    listClientExercises: build.query<ListClientExercisesApiResponse, ListClientExercisesApiArg>({
      query: (queryArg) => ({
        url: `/v1/client/training-exercises`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
          search: queryArg.search,
          muscle_ids: queryArg.muscleIds,
          equipment_ids: queryArg.equipmentIds,
        },
      }),
    }),
    sendOtp: build.mutation<SendOtpApiResponse, SendOtpApiArg>({
      query: (queryArg) => ({
        url: `/v1/auth/otp`,
        method: 'POST',
        body: queryArg.otpRequest,
      }),
    }),
    healthCheck: build.query<HealthCheckApiResponse, HealthCheckApiArg>({
      query: () => ({url: `/api/health`}),
    }),
  }),
  overrideExisting: false,
});

export {injectedRtkApi as clientApi};
export type LogMealApiResponse = /** status 201 Food log entries */ FoodLogEntryListResponse;
export type LogMealApiArg = {
  /** Log meal request */
  foodLogEntryRequest: FoodLogEntryRequest;
};
export type SubmitClientFormAssignmentApiResponse =
  /** status 201 Form submission created */ ClientProfileFormSubmissionResponse;
export type SubmitClientFormAssignmentApiArg = {
  /** Form assignment id */
  id: string;
  /** Form submission request */
  clientProfileFormSubmissionRequest: ClientProfileFormSubmissionRequest;
};
export type DeleteFoodLogEntryApiResponse = unknown;
export type DeleteFoodLogEntryApiArg = {
  /** Food log entry id */
  id: string;
};
export type UpdateFoodLogEntryApiResponse = /** status 200 Food log entry updated */ FoodLogEntryResponse;
export type UpdateFoodLogEntryApiArg = {
  /** Food log entry id */
  id: string;
  /** Food log entry request */
  foodLogEntryRequest: FoodLogEntryRequest;
};
export type ListClientTrainingSessionsApiResponse = /** status 200 Training sessions */ TrainingSessionListResponse;
export type ListClientTrainingSessionsApiArg = {
  /** Start date (YYYY-MM-DD) */
  from?: string;
  /** End date (YYYY-MM-DD) */
  to?: string;
};
export type CreateClientTrainingSessionApiResponse = /** status 201 Training session created */ TrainingSessionResponse;
export type CreateClientTrainingSessionApiArg = {
  /** Training session request */
  trainingSessionRequest: TrainingSessionRequest;
};
export type SubmitApplicationApiResponse = /** status 201 Application received */ PublicApplicationResponse;
export type SubmitApplicationApiArg = {
  /** Landing page slug */
  slug: string;
  /** Application request */
  publicApplicationRequest: PublicApplicationRequest;
};
export type ListClientThreadsApiResponse = /** status 200 Threads */ ThreadListResponse;
export type ListClientThreadsApiArg = void;
export type CreateClientThreadApiResponse = /** status 201 Thread */ ThreadResponse;
export type CreateClientThreadApiArg = {
  /** Thread */
  clientThreadCreateRequest: ClientThreadCreateRequest;
};
export type ShowInvitationApiResponse = /** status 200 Invitation preview */ InvitationPreviewResponse;
export type ShowInvitationApiArg = {
  /** Invitation token */
  token: string;
};
export type GetClientExerciseApiResponse = /** status 200 Exercise */ TrainingExerciseResponse;
export type GetClientExerciseApiArg = {
  /** Exercise id */
  id: string;
};
export type ListClientNutritionPlansApiResponse = /** status 200 Nutrition plans */ NutritionPlanListResponse;
export type ListClientNutritionPlansApiArg = {
  /** Number of nutrition plans to skip */
  offset?: number;
  /** Maximum nutrition plans to return */
  limit?: number;
  /** Only nutrition plans with this status */
  status?: 'active' | 'archived';
};
export type GetPublicLandingPageApiResponse = /** status 200 Landing page */ PublicLandingPageResponse;
export type GetPublicLandingPageApiArg = {
  /** Landing page slug */
  slug: string;
};
export type CreateAuthTokenApiResponse = /** status 200 Auth token */ AuthTokenResponse;
export type CreateAuthTokenApiArg = {
  /** Token request */
  tokenRequest: TokenRequest;
};
export type ListClientRecipesApiResponse = /** status 200 Recipes */ RecipeListResponse;
export type ListClientRecipesApiArg = {
  /** Number of recipes to skip */
  offset?: number;
  /** Maximum recipes to return */
  limit?: number;
  /** Case-insensitive recipe search */
  search?: string;
};
export type GetClientTrainingPlanTodayApiResponse =
  /** status 200 Today's training plan day */ ClientTrainingPlanResponse;
export type GetClientTrainingPlanTodayApiArg = {
  /** Date (YYYY-MM-DD), defaults to today */
  date?: string;
};
export type LogDayApiResponse = /** status 201 Food log entries */ FoodLogEntryListResponse;
export type LogDayApiArg = {
  /** Log day request */
  foodLogEntryRequest: FoodLogEntryRequest;
};
export type AcceptInviteApiResponse = /** status 200 OTP sent */ MessageResponse;
export type AcceptInviteApiArg = {
  /** Accept invite request */
  acceptInviteRequest: AcceptInviteRequest;
};
export type GetClientThreadApiResponse = /** status 200 Thread */ ThreadDetailResponse;
export type GetClientThreadApiArg = {
  /** Thread id */
  id: string;
};
export type ListClientFormAssignmentsApiResponse =
  /** status 200 Form assignments */ ClientProfileFormAssignmentListResponse;
export type ListClientFormAssignmentsApiArg = void;
export type CreateClientPerformedSetApiResponse = /** status 201 Performed set created */ TrainingPerformedSetResponse;
export type CreateClientPerformedSetApiArg = {
  /** Training session id */
  sessionId: string;
  /** Performed set request */
  trainingPerformedSetRequest: TrainingPerformedSetRequest;
};
export type GetClientRecipeApiResponse = /** status 200 Recipe */ RecipeResponse;
export type GetClientRecipeApiArg = {
  /** Recipe id */
  id: string;
};
export type GetClientCoachingProfileApiResponse =
  /** status 200 Client coaching profile */ ClientCoachingProfileResponse;
export type GetClientCoachingProfileApiArg = void;
export type UpdateClientCoachingProfileApiResponse =
  /** status 200 Client coaching profile updated */ ClientCoachingProfileResponse;
export type UpdateClientCoachingProfileApiArg = {
  /** Client profile update request */
  clientCoachingProfileUpdateRequest: ClientCoachingProfileUpdateRequest;
};
export type ListClientTrainingPlansApiResponse = /** status 200 Training plans */ ClientTrainingPlanListResponse;
export type ListClientTrainingPlansApiArg = {
  /** Number of training plans to skip */
  offset?: number;
  /** Maximum training plans to return */
  limit?: number;
  /** Only training plans with this status */
  status?: 'active' | 'archived';
};
export type ListClientFoodsApiResponse = /** status 200 Foods */ FoodListResponse;
export type ListClientFoodsApiArg = {
  /** Number of foods to skip */
  offset?: number;
  /** Maximum foods to return */
  limit?: number;
  /** Case-insensitive food name search */
  search?: string;
};
export type GetClientFormAssignmentApiResponse = /** status 200 Form assignment */ ClientProfileFormAssignmentResponse;
export type GetClientFormAssignmentApiArg = {
  /** Form assignment id */
  id: string;
};
export type VerifyAuthApiResponse = /** status 200 Auth token */ AuthTokenResponse;
export type VerifyAuthApiArg = {
  /** Verify request */
  verifyRequest: VerifyRequest;
};
export type GetClientProfileApiResponse = /** status 200 Client profile */ ClientProfileResponse;
export type GetClientProfileApiArg = void;
export type UpdateClientProfileApiResponse = /** status 200 Client profile updated */ ClientProfileResponse;
export type UpdateClientProfileApiArg = {
  /** Client profile update request */
  clientProfileUpdateRequest: ClientProfileUpdateRequest;
};
export type DeleteClientPerformedSetApiResponse = unknown;
export type DeleteClientPerformedSetApiArg = {
  /** Performed set id */
  id: string;
};
export type UpdateClientPerformedSetApiResponse = /** status 200 Performed set updated */ TrainingPerformedSetResponse;
export type UpdateClientPerformedSetApiArg = {
  /** Performed set id */
  id: string;
  /** Performed set request */
  trainingPerformedSetRequest: TrainingPerformedSetRequest;
};
export type GetClientNutritionPlanApiResponse = /** status 200 Nutrition plan */ NutritionPlanResponse;
export type GetClientNutritionPlanApiArg = {
  /** Nutrition plan id */
  id: string;
};
export type GetClientTrainingSessionApiResponse = /** status 200 Training session */ TrainingSessionResponse;
export type GetClientTrainingSessionApiArg = {
  /** Training session id */
  id: string;
};
export type UpdateClientTrainingSessionApiResponse = /** status 200 Training session updated */ TrainingSessionResponse;
export type UpdateClientTrainingSessionApiArg = {
  /** Training session id */
  id: string;
  /** Training session update request */
  trainingSessionUpdateRequest: TrainingSessionUpdateRequest;
};
export type GetClientTrainingPlanApiResponse = /** status 200 Training plan */ ClientTrainingPlanResponse;
export type GetClientTrainingPlanApiArg = {
  /** Training plan id */
  id: string;
};
export type GetClientFoodApiResponse = /** status 200 Food */ FoodResponse;
export type GetClientFoodApiArg = {
  /** Food id */
  id: string;
};
export type ListWeightEntriesApiResponse = /** status 200 Weight entries */ WeightEntryListResponse;
export type ListWeightEntriesApiArg = {
  /** Only entries since this date */
  since?: string;
};
export type CreateWeightEntryApiResponse = /** status 201 Weight entry created */ WeightEntryResponse;
export type CreateWeightEntryApiArg = {
  /** Weight entry request */
  weightEntryRequest: WeightEntryRequest;
};
export type VerifyInvitationApiResponse = /** status 200 Auth token */ AuthTokenResponse;
export type VerifyInvitationApiArg = {
  /** Accept invite verification request */
  acceptInviteVerifyRequest: AcceptInviteVerifyRequest;
};
export type GetTodayNutritionPlanApiResponse = /** status 200 Nutrition plan day */ NutritionMapResponse;
export type GetTodayNutritionPlanApiArg = {
  /** Date to load, defaults to today */
  date?: string;
};
export type ListClientMealLogsApiResponse = /** status 200 Meal logs */ MealLogListResponse;
export type ListClientMealLogsApiArg = {
  /** Exact date */
  date?: string;
  /** Start date */
  from?: string;
  /** End date */
  to?: string;
};
export type CreateClientThreadMessageApiResponse = /** status 201 Message */ ThreadMessageResponse;
export type CreateClientThreadMessageApiArg = {
  /** Thread id */
  threadId: string;
  /** Message */
  threadMessageRequest: ThreadMessageRequest;
};
export type CreateFoodLogEntryApiResponse = /** status 201 Food log entry created */ FoodLogEntryResponse;
export type CreateFoodLogEntryApiArg = {
  /** Food log entry request */
  foodLogEntryRequest: FoodLogEntryRequest;
};
export type SignupApiResponse = /** status 201 Signup */ SignupResponse;
export type SignupApiArg = {
  /** Signup request */
  signupRequest: SignupRequest;
};
export type DeleteWeightEntryApiResponse = unknown;
export type DeleteWeightEntryApiArg = {
  /** Weight entry id */
  id: string;
};
export type ListClientExercisesApiResponse = /** status 200 Exercises */ TrainingExerciseListResponse;
export type ListClientExercisesApiArg = {
  /** Number of exercises to skip */
  offset?: number;
  /** Maximum exercises to return */
  limit?: number;
  /** Case-insensitive exercise name search */
  search?: string;
  /** Only exercises linked to any of these muscle ids */
  muscleIds?: string[];
  /** Only exercises linked to any of these equipment ids */
  equipmentIds?: string[];
};
export type SendOtpApiResponse = /** status 200 OTP sent */ MessageResponse;
export type SendOtpApiArg = {
  /** OTP request */
  otpRequest: OtpRequest;
};
export type HealthCheckApiResponse = /** status 200 Health */ HealthResponse;
export type HealthCheckApiArg = void;
export type FoodLogEntry = {
  amount: number | null;
  calories?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  food_id?: string | null;
  food_name: string | null;
  id: string;
  inserted_at: string;
  meal_log_id: string;
  notes?: string | null;
  planned_item_index?: number | null;
  protein_g?: number | null;
  recipe_id?: string | null;
  source?: string | null;
  unit: string | null;
  updated_at: string;
  weight_g: number | null;
};
export type FoodLogEntryListResponse = {
  data: FoodLogEntry[];
};
export type ErrorResponse = {
  error?: {
    [key: string]: any;
  };
  errors?: {
    [key: string]: any;
  }[];
  [key: string]: any;
};
export type FoodLogEntryRequest = {
  amount?: number | null;
  date?: string;
  food_id?: string | null;
  food_name?: string | null;
  meal_id?: string | null;
  meal_slot?: string | null;
  notes?: string | null;
  plan_id?: string | null;
  planned_item_index?: number | null;
  recipe_id?: string | null;
  source?: string | null;
  unit?: string | null;
  weight_g?: number | null;
};
export type ClientProfileFormSubmission = {
  answers: {
    [key: string]: any;
  };
  form_assignment_id: string;
  id: string;
  inserted_at: string;
  question_snapshot: {
    [key: string]: any;
  }[];
  submitted_at: string;
  submitted_by_type: 'coach' | 'client' | 'system';
};
export type ClientProfileFormSubmissionResponse = {
  data: ClientProfileFormSubmission;
};
export type ClientProfileFormSubmissionRequest = {
  answers: {
    [key: string]: any;
  };
};
export type FoodLogEntryResponse = {
  data: FoodLogEntry;
};
export type TrainingPlanExercise = {
  force: ('push' | 'pull' | 'static') | null;
  id: string;
  images?: string[];
  mechanics: ('compound' | 'isolation' | 'isometric') | null;
  name: string;
  tracking_type?:
    | (
        | 'weight_reps'
        | 'bodyweight_reps'
        | 'weighted_bodyweight'
        | 'assisted_bodyweight'
        | 'reps_only'
        | 'duration'
        | 'weight_duration'
        | 'distance_duration'
        | 'weight_distance'
      )
    | null;
};
export type TrainingPerformedSet = {
  completed: boolean;
  distance_unit?: string | null;
  distance_value?: number | null;
  duration_seconds?: number | null;
  exercise?: TrainingPlanExercise | null;
  exercise_id: string;
  exercise_name?: string | null;
  id: string;
  inserted_at: string;
  load_unit: string | null;
  load_value: number | null;
  notes?: string | null;
  position: number;
  reps: string | null;
  rpe?: number | null;
  set_type?: ('working' | 'warmup' | 'dropset') | null;
  swapped_from_exercise_id?: string | null;
  training_session_id?: string | null;
  updated_at: string;
};
export type TrainingSession = {
  client_id?: string | null;
  date?: string | null;
  ended_at: string | null;
  id: string;
  inserted_at: string;
  notes?: string | null;
  performed_sets: TrainingPerformedSet[];
  planned_snapshot?: {
    [key: string]: any;
  } | null;
  soreness_rating?: number | null;
  started_at: string;
  state: 'active' | 'completed' | 'discarded';
  training_schedule_entry_id?: string | null;
  training_workout_id?: string | null;
  updated_at: string;
};
export type TrainingSessionListResponse = {
  count: number;
  data: TrainingSession[];
};
export type TrainingSessionResponse = {
  data: TrainingSession;
};
export type TrainingSessionRequest = {
  notes?: string | null;
  soreness_rating?: number | null;
  training_workout_id?: string | null;
};
export type PublicApplicationResponse = {
  data: {
    business_name: string;
    id: string;
    name: string;
    program_name?: string | null;
    whatsapp_number?: string | null;
  };
};
export type PublicApplicationRequest = {
  answers?: {
    [key: string]: any;
  };
  email?: string | null;
  instagram?: string | null;
  landing_program_id?: string | null;
  name: string;
  phone?: string | null;
};
export type Thread = {
  client_id: string;
  created_by_id?: string | null;
  created_by_type?: 'coach' | 'client' | 'system';
  id: string;
  inserted_at: string;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  module: 'nutrition' | 'training' | 'fitness' | 'profile' | 'general';
  priority: 'normal' | 'attention';
  status: 'open' | 'resolved' | 'archived';
  subject_ref?: {
    [key: string]: any;
  };
  subject_type?: string;
  title?: string | null;
  updated_at: string;
};
export type ThreadListResponse = {
  count: number;
  data: Thread[];
};
export type ThreadResponse = {
  data: Thread;
};
export type ClientThreadCreateRequest = {
  module: 'nutrition' | 'training' | 'fitness' | 'profile' | 'general';
  subject_ref?: {
    [key: string]: any;
  };
  subject_type?: string;
  title?: string;
};
export type InvitationPreviewResponse = {
  data: {
    business_name?: string | null;
    coach_first_name?: string | null;
    expires_at?: string | null;
    prefill_email?: string | null;
    state: 'pending' | 'used' | 'expired' | 'invalid';
  };
};
export type TrainingExerciseRelation = {
  description: string | null;
  id: string;
  name: string;
};
export type TrainingExercise = {
  description: string | null;
  equipment: TrainingExerciseRelation[];
  force: ('push' | 'pull' | 'static') | null;
  id: string;
  images: string[];
  inserted_at: string;
  instructions: string | null;
  mechanics: ('compound' | 'isolation' | 'isometric') | null;
  muscles: TrainingExerciseRelation[];
  name: string;
  source: string | null;
  tracking_type: string | null;
  updated_at: string;
};
export type TrainingExerciseResponse = {
  data: TrainingExercise;
};
export type NutritionMealItem = {
  amount: number | null;
  food_id: string | null;
  id: string;
  inserted_at: string;
  name?: string | null;
  nutrition?: {
    calories?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    fiber_g?: number | null;
    protein_g?: number | null;
  } | null;
  nutrition_meal_id?: string | null;
  position: number;
  recipe_id: string | null;
  unit: string | null;
  updated_at: string;
  weight_g: number | null;
};
export type NutritionMeal = {
  creator_id?: string | null;
  default_meal_slot?: ('breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'evening_snack') | null;
  id: string;
  inserted_at: string;
  meal_items: NutritionMealItem[];
  name: string;
  notes?: string | null;
  nutrition?: {
    calories?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    fiber_g?: number | null;
    protein_g?: number | null;
  } | null;
  nutrition_plan_id?: string | null;
  updated_at: string;
};
export type NutritionScheduleEntry = {
  day_of_week: string;
  id: string;
  inserted_at: string;
  meal_slot: string;
  nutrition_meal_id: string;
  nutrition_plan_id?: string | null;
  updated_at: string;
};
export type NutritionPlan = {
  client?: {
    [key: string]: any;
  } | null;
  client_id?: string | null;
  creator_id?: string | null;
  description: string | null;
  end_date: string | null;
  id: string;
  inserted_at: string;
  meals?: NutritionMeal[];
  name: string;
  schedule_entries?: NutritionScheduleEntry[];
  source_template_id?: string | null;
  start_date: string | null;
  status: 'active' | 'archived';
  tags: string[];
  target_calories?: number | null;
  target_carbs_g?: number | null;
  target_fat_g?: number | null;
  target_fiber_g?: number | null;
  target_protein_g?: number | null;
  updated_at: string;
};
export type NutritionPlanListResponse = {
  count: number;
  data: NutritionPlan[];
};
export type LandingProgram = {
  audience?: string | null;
  description?: string | null;
  id: string;
  name: string;
  position: number;
  price_display?: string | null;
  promise?: string | null;
};
export type PublicLandingPage = {
  application_questions: {
    id?: string;
    label?: string;
    options?: string[];
    type?: 'short_text' | 'long_text' | 'single_select';
  }[];
  business_name: string;
  coach_intro?: string | null;
  headline: string;
  programs: LandingProgram[];
  proof_points?: {
    label?: string;
    value?: string;
  }[];
  slug: string;
  subheadline?: string | null;
  template: 'proof_first' | 'problem_fit' | 'coach_story';
  whatsapp_number?: string | null;
};
export type PublicLandingPageResponse = {
  data: PublicLandingPage;
};
export type AuthTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
};
export type TokenRequest =
  | {
      email?: string;
      grant_type: 'refresh_token' | 'otp';
      otp?: string;
      refresh_token: string;
      role?: 'owner' | 'coach' | 'client' | 'guest';
    }
  | {
      email: string;
      grant_type: 'refresh_token' | 'otp';
      otp: string;
      refresh_token?: string;
      role: 'owner' | 'coach' | 'client' | 'guest';
    };
export type FoodServingSize = {
  amount: number;
  is_default: boolean;
  label: string;
  unit: string;
  weight_g: number;
};
export type Food = {
  allergens?: ('dairy' | 'egg' | 'fish' | 'shellfish' | 'tree_nuts' | 'peanuts' | 'wheat' | 'soy' | 'sesame')[];
  barcode?: string | null;
  brand?: string | null;
  calories_per_100g?: number | null;
  carbs_g_per_100g?: number | null;
  category: string | null;
  creator_id?: string | null;
  dietary_tags?: (
    | 'vegan'
    | 'vegetarian'
    | 'halal'
    | 'kosher'
    | 'gluten_free'
    | 'dairy_free'
    | 'low_fodmap'
    | 'keto'
    | 'high_protein'
  )[];
  fat_g_per_100g?: number | null;
  fiber_g_per_100g?: number | null;
  id: string;
  image_url: string | null;
  inserted_at: string;
  name: string;
  notes: string | null;
  protein_g_per_100g?: number | null;
  serving_sizes: FoodServingSize[];
  source: ('system' | 'imported' | 'custom') | null;
  updated_at: string;
};
export type RecipeIngredient = {
  amount: number | null;
  food: Food | null;
  food_id: string;
  position?: number;
  unit: string | null;
  weight_g: number | null;
};
export type Recipe = {
  allergens?: ('dairy' | 'egg' | 'fish' | 'shellfish' | 'tree_nuts' | 'peanuts' | 'wheat' | 'soy' | 'sesame')[];
  cooked_weight_g: number | null;
  creator_id?: string | null;
  description?: string | null;
  dietary_tags?: (
    | 'vegan'
    | 'vegetarian'
    | 'halal'
    | 'kosher'
    | 'gluten_free'
    | 'dairy_free'
    | 'low_fodmap'
    | 'keto'
    | 'high_protein'
  )[];
  foods?: Food[];
  id: string;
  inserted_at: string;
  instructions: string | null;
  name: string;
  nutrition?: {
    calories?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    fiber_g?: number | null;
    protein_g?: number | null;
  } | null;
  recipe_ingredients: RecipeIngredient[];
  serving_sizes: FoodServingSize[];
  servings_count?: number | null;
  updated_at: string;
};
export type RecipeListResponse = {
  count: number;
  data: Recipe[];
};
export type TrainingPlanItem = {
  creator_id?: string;
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  id: string;
  inserted_at: string;
  training_plan_id: string;
  training_workout_id: string;
  updated_at: string;
};
export type TrainingPlanPlannedSet = {
  distance_unit: ('meters' | 'km' | 'miles' | 'none') | null;
  distance_value: string | null;
  duration_seconds: number | null;
  load_unit: ('kg' | 'lbs' | 'bodyweight' | 'none') | null;
  load_value: string | null;
  notes: string | null;
  reps: string | null;
  rest_seconds: number | null;
  rpe: number | null;
  set_type: ('working' | 'warmup' | 'dropset') | null;
};
export type TrainingPlanWorkoutExercise = {
  exercise: TrainingPlanExercise | null;
  exercise_id: string;
  id: string;
  inserted_at: string;
  notes: string | null;
  planned_sets: TrainingPlanPlannedSet[];
  position: number;
  superset_group_id: string | null;
  updated_at: string;
  workout_id?: string;
};
export type TrainingPlanWorkout = {
  id: string;
  inserted_at: string;
  name: string;
  notes: string | null;
  training_plan_id?: string;
  updated_at: string;
  workout_elements: TrainingPlanWorkoutExercise[];
};
export type ClientTrainingPlan = {
  description: string | null;
  end_date: string | null;
  id: string;
  inserted_at: string;
  name: string;
  plan_items: TrainingPlanItem[];
  start_date: string | null;
  status: 'active' | 'archived';
  updated_at: string;
  workouts: TrainingPlanWorkout[];
};
export type ClientTrainingPlanResponse = {
  data: ClientTrainingPlan;
};
export type MessageResponse = {
  message: string;
};
export type AcceptInviteRequest = {
  email: string;
  invitation_token: string;
};
export type ThreadMessage = {
  author_id?: string | null;
  author_type: 'coach' | 'client' | 'system';
  body: string;
  id: string;
  inserted_at: string;
  kind: string;
  metadata?: {
    [key: string]: any;
  };
  thread_id: string;
  updated_at: string;
};
export type ThreadWithMessages = {
  client_id: string;
  created_by_id?: string | null;
  created_by_type?: 'coach' | 'client' | 'system';
  id: string;
  inserted_at: string;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  messages?: ThreadMessage[];
  module: 'nutrition' | 'training' | 'fitness' | 'profile' | 'general';
  priority: 'normal' | 'attention';
  status: 'open' | 'resolved' | 'archived';
  subject_ref?: {
    [key: string]: any;
  };
  subject_type?: string;
  title?: string | null;
  updated_at: string;
};
export type ThreadDetailResponse = {
  data: ThreadWithMessages;
};
export type ClientProfileFormTemplate = {
  id: string;
  inserted_at: string;
  name: string;
  purpose: 'intake' | 'weekly_check_in' | 'nutrition_update' | 'training_update' | 'custom';
  sections: {
    [key: string]: any;
  }[];
  status: 'active' | 'archived';
  updated_at: string;
};
export type ClientProfileFormAssignment = {
  client_id: string;
  completed_at: string | null;
  due_date: string | null;
  form_template: ClientProfileFormTemplate;
  form_template_id: string;
  id: string;
  inserted_at: string;
  priority: 'high' | 'normal';
  purpose: 'intake' | 'weekly_check_in' | 'nutrition_update' | 'training_update' | 'custom';
  status: 'assigned' | 'in_progress' | 'completed' | 'dismissed';
  updated_at: string;
};
export type ClientProfileFormAssignmentListResponse = {
  data: ClientProfileFormAssignment[];
};
export type TrainingPerformedSetResponse = {
  data: TrainingPerformedSet;
};
export type TrainingPerformedSetRequest = {
  completed?: boolean;
  distance_unit?: ('meters' | 'km' | 'miles' | 'none') | null;
  distance_value?: number | null;
  duration_seconds?: number | null;
  exercise_id?: string;
  exercise_name?: string | null;
  load_unit?: ('kg' | 'lbs' | 'bodyweight' | 'none') | null;
  load_value?: number | null;
  notes?: string | null;
  position?: number;
  reps?: string | null;
  rpe?: number | null;
  set_type?: ('working' | 'warmup' | 'dropset') | null;
  swapped_from_exercise_id?: string | null;
};
export type RecipeResponse = {
  data: Recipe;
};
export type ClientCoachingProfile = {
  client_id: string;
  general: {
    [key: string]: any;
  };
  id: string;
  inserted_at: string;
  intake_completed_at: string | null;
  intake_status: 'assigned' | 'in_progress' | 'completed' | 'dismissed';
  lifestyle: {
    [key: string]: any;
  };
  nutrition: {
    [key: string]: any;
  };
  training: {
    [key: string]: any;
  };
  updated_at: string;
};
export type ClientCoachingProfileResponse = {
  data: ClientCoachingProfile;
};
export type ClientCoachingProfileUpdateRequest = {
  general?: {
    [key: string]: any;
  };
  lifestyle?: {
    [key: string]: any;
  };
  nutrition?: {
    [key: string]: any;
  };
  training?: {
    [key: string]: any;
  };
};
export type ClientTrainingPlanListResponse = {
  count: number;
  data: ClientTrainingPlan[];
};
export type FoodListResponse = {
  count: number;
  data: Food[];
};
export type ClientProfileFormAssignmentResponse = {
  data: ClientProfileFormAssignment;
};
export type VerifyRequest =
  | {
      email?: string;
      otp?: string;
      token: string;
    }
  | {
      email: string;
      otp: string;
      token?: string;
    };
export type ClientProfileCoach = {
  business_name: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};
export type ClientProfile = {
  coach: ClientProfileCoach | null;
  email: string | null;
  first_name: string | null;
  goal_weight_unit: string | null;
  goal_weight_value: number | null;
  id: string;
  last_name: string | null;
  phone: string | null;
  status: string;
};
export type ClientProfileResponse = {
  data: ClientProfile;
};
export type ClientProfileUpdateRequest = {
  first_name?: string | null;
  goal_weight_unit?: string | null;
  goal_weight_value?: number | null;
  last_name?: string | null;
  phone?: string | null;
};
export type NutritionPlanResponse = {
  data: NutritionPlan;
};
export type TrainingSessionUpdateRequest = {
  ended_at?: string;
  notes?: string;
  soreness_rating?: number;
  state?: 'completed' | 'discarded';
};
export type FoodResponse = {
  data: Food;
};
export type WeightEntry = {
  date: string;
  id: string;
  inserted_at: string;
  note: string | null;
  unit: 'kg' | 'lbs';
  value: number;
};
export type WeightEntryListResponse = {
  adherence?: {
    [key: string]: any;
  } | null;
  entries: WeightEntry[];
  goal: {
    [key: string]: any;
  } | null;
  summary: {
    [key: string]: any;
  };
};
export type WeightEntryResponse = {
  data: WeightEntry;
};
export type WeightEntryRequest = {
  date: string;
  note?: string | null;
  unit: 'kg' | 'lbs';
  value: number;
};
export type AcceptInviteVerifyRequest = {
  email: string;
  invitation_token: string;
  otp: string;
};
export type NutritionMapResponse = {
  data: {
    [key: string]: any;
  };
};
export type MealLog = {
  client_id?: string | null;
  date: string;
  food_log_entries: FoodLogEntry[];
  id: string;
  inserted_at: string;
  logged_calories?: number | null;
  meal_slot: string;
  planned_calories?: number | null;
  planned_snapshot?: {
    [key: string]: any;
  } | null;
  updated_at: string;
};
export type MealLogListResponse = {
  data: MealLog[];
};
export type ThreadMessageResponse = {
  data: ThreadMessage;
};
export type ThreadMessageRequest = {
  body: string;
  kind?: string;
};
export type SignupResponse = {
  confirmation_sent_at: string | null;
  email: string;
  id: string;
  inserted_at: string;
  updated_at: string;
};
export type SignupRequest = {
  email: string;
  first_name?: string;
  last_name?: string;
};
export type TrainingExerciseListResponse = {
  count: number;
  data: TrainingExercise[];
};
export type OtpRequest = {
  email: string;
  type: 'email_confirmation' | 'authentication';
};
export type HealthResponse = {
  service: string;
  status: string;
  timestamp: string;
  version: string;
};
export const {
  useLogMealMutation,
  useSubmitClientFormAssignmentMutation,
  useDeleteFoodLogEntryMutation,
  useUpdateFoodLogEntryMutation,
  useListClientTrainingSessionsQuery,
  useLazyListClientTrainingSessionsQuery,
  useCreateClientTrainingSessionMutation,
  useSubmitApplicationMutation,
  useListClientThreadsQuery,
  useLazyListClientThreadsQuery,
  useCreateClientThreadMutation,
  useShowInvitationQuery,
  useLazyShowInvitationQuery,
  useGetClientExerciseQuery,
  useLazyGetClientExerciseQuery,
  useListClientNutritionPlansQuery,
  useLazyListClientNutritionPlansQuery,
  useGetPublicLandingPageQuery,
  useLazyGetPublicLandingPageQuery,
  useCreateAuthTokenMutation,
  useListClientRecipesQuery,
  useLazyListClientRecipesQuery,
  useGetClientTrainingPlanTodayQuery,
  useLazyGetClientTrainingPlanTodayQuery,
  useLogDayMutation,
  useAcceptInviteMutation,
  useGetClientThreadQuery,
  useLazyGetClientThreadQuery,
  useListClientFormAssignmentsQuery,
  useLazyListClientFormAssignmentsQuery,
  useCreateClientPerformedSetMutation,
  useGetClientRecipeQuery,
  useLazyGetClientRecipeQuery,
  useGetClientCoachingProfileQuery,
  useLazyGetClientCoachingProfileQuery,
  useUpdateClientCoachingProfileMutation,
  useListClientTrainingPlansQuery,
  useLazyListClientTrainingPlansQuery,
  useListClientFoodsQuery,
  useLazyListClientFoodsQuery,
  useGetClientFormAssignmentQuery,
  useLazyGetClientFormAssignmentQuery,
  useVerifyAuthMutation,
  useGetClientProfileQuery,
  useLazyGetClientProfileQuery,
  useUpdateClientProfileMutation,
  useDeleteClientPerformedSetMutation,
  useUpdateClientPerformedSetMutation,
  useGetClientNutritionPlanQuery,
  useLazyGetClientNutritionPlanQuery,
  useGetClientTrainingSessionQuery,
  useLazyGetClientTrainingSessionQuery,
  useUpdateClientTrainingSessionMutation,
  useGetClientTrainingPlanQuery,
  useLazyGetClientTrainingPlanQuery,
  useGetClientFoodQuery,
  useLazyGetClientFoodQuery,
  useListWeightEntriesQuery,
  useLazyListWeightEntriesQuery,
  useCreateWeightEntryMutation,
  useVerifyInvitationMutation,
  useGetTodayNutritionPlanQuery,
  useLazyGetTodayNutritionPlanQuery,
  useListClientMealLogsQuery,
  useLazyListClientMealLogsQuery,
  useCreateClientThreadMessageMutation,
  useCreateFoodLogEntryMutation,
  useSignupMutation,
  useDeleteWeightEntryMutation,
  useListClientExercisesQuery,
  useLazyListClientExercisesQuery,
  useSendOtpMutation,
  useHealthCheckQuery,
  useLazyHealthCheckQuery,
} = injectedRtkApi;
