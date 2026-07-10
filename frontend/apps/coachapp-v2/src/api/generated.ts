import {api} from './base';

const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    listTrainingPlans: build.query<ListTrainingPlansApiResponse, ListTrainingPlansApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-plans`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
          search: queryArg.search,
          status: queryArg.status,
        },
      }),
    }),
    createTrainingPlan: build.mutation<CreateTrainingPlanApiResponse, CreateTrainingPlanApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-plans`,
        method: 'POST',
        body: queryArg.trainingPlanCreateRequest,
      }),
    }),
    setTrainingPlanDaySchedule: build.mutation<SetTrainingPlanDayScheduleApiResponse, SetTrainingPlanDayScheduleApiArg>(
      {
        query: (queryArg) => ({
          url: `/v1/coach/training-plans/${queryArg.planId}/schedule/${queryArg.day}`,
          method: 'PUT',
          body: queryArg.trainingDayScheduleRequest,
        }),
      },
    ),
    deleteClient: build.mutation<DeleteClientApiResponse, DeleteClientApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/clients/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    getClient: build.query<GetClientApiResponse, GetClientApiArg>({
      query: (queryArg) => ({url: `/v1/coach/clients/${queryArg.id}`}),
    }),
    updateClient: build.mutation<UpdateClientApiResponse, UpdateClientApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/clients/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.clientUpdateRequest,
      }),
    }),
    getCoachingClientProfile: build.query<GetCoachingClientProfileApiResponse, GetCoachingClientProfileApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/clients/${queryArg.clientId}/profile`,
      }),
    }),
    updateCoachingClientProfile: build.mutation<
      UpdateCoachingClientProfileApiResponse,
      UpdateCoachingClientProfileApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/coach/clients/${queryArg.clientId}/profile`,
        method: 'PATCH',
        body: queryArg.coachingClientProfileRequest,
      }),
    }),
    enrollProspect: build.mutation<EnrollProspectApiResponse, EnrollProspectApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/prospects/${queryArg.id}/enroll`,
        method: 'POST',
        body: queryArg.prospectEnrollRequest,
      }),
    }),
    assignNutritionPlanWeekday: build.mutation<AssignNutritionPlanWeekdayApiResponse, AssignNutritionPlanWeekdayApiArg>(
      {
        query: (queryArg) => ({
          url: `/v1/coach/nutrition-plans/${queryArg.planId}/weekday-assignments`,
          method: 'PUT',
          body: queryArg.nutritionWeekdayAssignRequest,
        }),
      },
    ),
    getCoachProfile: build.query<GetCoachProfileApiResponse, GetCoachProfileApiArg>({
      query: () => ({url: `/v1/coach/me`}),
    }),
    updateCoachProfile: build.mutation<UpdateCoachProfileApiResponse, UpdateCoachProfileApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/me`,
        method: 'PATCH',
        body: queryArg.coachProfileUpdateRequest,
      }),
    }),
    resendClientInvite: build.mutation<ResendClientInviteApiResponse, ResendClientInviteApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/clients/${queryArg.id}/resend-invite`,
        method: 'POST',
      }),
    }),
    inviteTrainer: build.mutation<InviteTrainerApiResponse, InviteTrainerApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/team/invite`,
        method: 'POST',
        body: queryArg.trainerInviteRequest,
      }),
    }),
    listCoachClientTrainingSessions: build.query<
      ListCoachClientTrainingSessionsApiResponse,
      ListCoachClientTrainingSessionsApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/coach/clients/${queryArg.clientId}/training-sessions`,
        params: {
          from: queryArg['from'],
          to: queryArg.to,
        },
      }),
    }),
    submitApplication: build.mutation<SubmitApplicationApiResponse, SubmitApplicationApiArg>({
      query: (queryArg) => ({
        url: `/v1/public/landing-pages/${queryArg.slug}/applications`,
        method: 'POST',
        body: queryArg.publicApplicationRequest,
      }),
    }),
    getCoachClientTrainingSession: build.query<
      GetCoachClientTrainingSessionApiResponse,
      GetCoachClientTrainingSessionApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/coach/clients/${queryArg.clientId}/training-sessions/${queryArg.id}`,
      }),
    }),
    deactivateTrainer: build.mutation<DeactivateTrainerApiResponse, DeactivateTrainerApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/team/${queryArg.id}/deactivate`,
        method: 'POST',
      }),
    }),
    listCoachClientTrainingPlans: build.query<
      ListCoachClientTrainingPlansApiResponse,
      ListCoachClientTrainingPlansApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/coach/clients/${queryArg.clientId}/training-plans`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
          status: queryArg.status,
        },
      }),
    }),
    listClientFormAssignmentsForCoach: build.query<
      ListClientFormAssignmentsForCoachApiResponse,
      ListClientFormAssignmentsForCoachApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/coach/clients/${queryArg.clientId}/form-assignments`,
      }),
    }),
    resendTrainerInvite: build.mutation<ResendTrainerInviteApiResponse, ResendTrainerInviteApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/team/${queryArg.id}/resend-invite`,
        method: 'POST',
      }),
    }),
    showInvitation: build.query<ShowInvitationApiResponse, ShowInvitationApiArg>({
      query: (queryArg) => ({url: `/v1/auth/invitations/${queryArg.token}`}),
    }),
    listNutritionPlans: build.query<ListNutritionPlansApiResponse, ListNutritionPlansApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-plans`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
          status: queryArg.status,
        },
      }),
    }),
    createNutritionPlan: build.mutation<CreateNutritionPlanApiResponse, CreateNutritionPlanApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-plans`,
        method: 'POST',
        body: queryArg.nutritionPlanRequest,
      }),
    }),
    listProfileFields: build.query<ListProfileFieldsApiResponse, ListProfileFieldsApiArg>({
      query: () => ({url: `/v1/coach/profile-fields`}),
    }),
    createProfileField: build.mutation<CreateProfileFieldApiResponse, CreateProfileFieldApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/profile-fields`,
        method: 'POST',
        body: queryArg.clientProfileFieldRequest,
      }),
    }),
    getCurrentBusiness: build.query<GetCurrentBusinessApiResponse, GetCurrentBusinessApiArg>({
      query: () => ({url: `/v1/businesses/me`}),
    }),
    updateCurrentBusiness: build.mutation<UpdateCurrentBusinessApiResponse, UpdateCurrentBusinessApiArg>({
      query: (queryArg) => ({
        url: `/v1/businesses/me`,
        method: 'PATCH',
        body: queryArg.businessUpdateRequest,
      }),
    }),
    getPublicLandingPage: build.query<GetPublicLandingPageApiResponse, GetPublicLandingPageApiArg>({
      query: (queryArg) => ({
        url: `/v1/public/landing-pages/${queryArg.slug}`,
      }),
    }),
    createMealItem: build.mutation<CreateMealItemApiResponse, CreateMealItemApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-meals/${queryArg.mealId}/items`,
        method: 'POST',
        body: queryArg.nutritionMealItemRequest,
      }),
    }),
    listCoachConversations: build.query<ListCoachConversationsApiResponse, ListCoachConversationsApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/conversations`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
        },
      }),
    }),
    createAuthToken: build.mutation<CreateAuthTokenApiResponse, CreateAuthTokenApiArg>({
      query: (queryArg) => ({
        url: `/v1/auth/token`,
        method: 'POST',
        body: queryArg.tokenRequest,
      }),
    }),
    listProspects: build.query<ListProspectsApiResponse, ListProspectsApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/prospects`,
        params: {
          status: queryArg.status,
          offset: queryArg.offset,
          limit: queryArg.limit,
        },
      }),
    }),
    getCoachConversation: build.query<GetCoachConversationApiResponse, GetCoachConversationApiArg>({
      query: (queryArg) => ({url: `/v1/coach/conversations/${queryArg.id}`}),
    }),
    addNutritionSlotOption: build.mutation<AddNutritionSlotOptionApiResponse, AddNutritionSlotOptionApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-days/${queryArg.dayId}/options`,
        method: 'POST',
        body: queryArg.nutritionSlotOptionCreateRequest,
      }),
    }),
    getCoachClientConversation: build.query<GetCoachClientConversationApiResponse, GetCoachClientConversationApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/clients/${queryArg.clientId}/conversation`,
      }),
    }),
    createNutritionPlanDay: build.mutation<CreateNutritionPlanDayApiResponse, CreateNutritionPlanDayApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-plans/${queryArg.planId}/days`,
        method: 'POST',
        body: queryArg.nutritionPlanDayCreateRequest,
      }),
    }),
    acceptInvite: build.mutation<AcceptInviteApiResponse, AcceptInviteApiArg>({
      query: (queryArg) => ({
        url: `/v1/auth/accept-invite`,
        method: 'POST',
        body: queryArg.acceptInviteRequest,
      }),
    }),
    cancelBilling: build.mutation<CancelBillingApiResponse, CancelBillingApiArg>({
      query: () => ({url: `/v1/coach/billing/cancel`, method: 'POST'}),
    }),
    getTrainingPlanSchedule: build.query<GetTrainingPlanScheduleApiResponse, GetTrainingPlanScheduleApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-plans/${queryArg.planId}/schedule`,
      }),
    }),
    assignFormTemplate: build.mutation<AssignFormTemplateApiResponse, AssignFormTemplateApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/form-templates/${queryArg.id}/assign`,
        method: 'POST',
        body: queryArg.clientProfileFormAssignmentAssignRequest,
      }),
    }),
    makeNutritionSlotOptionDefault: build.mutation<
      MakeNutritionSlotOptionDefaultApiResponse,
      MakeNutritionSlotOptionDefaultApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-day-meals/${queryArg.id}/make-default`,
        method: 'POST',
      }),
    }),
    copyNutritionFood: build.mutation<CopyNutritionFoodApiResponse, CopyNutritionFoodApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-foods/${queryArg.id}/copy`,
        method: 'POST',
      }),
    }),
    listWorkouts: build.query<ListWorkoutsApiResponse, ListWorkoutsApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-plans/${queryArg.planId}/training-workouts`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
        },
      }),
    }),
    createWorkout: build.mutation<CreateWorkoutApiResponse, CreateWorkoutApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-plans/${queryArg.planId}/training-workouts`,
        method: 'POST',
        body: queryArg.trainingWorkoutRequest,
      }),
    }),
    updateFormAssignment: build.mutation<UpdateFormAssignmentApiResponse, UpdateFormAssignmentApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/form-assignments/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.clientProfileFormAssignmentUpdateRequest,
      }),
    }),
    deleteNutritionPlanDay: build.mutation<DeleteNutritionPlanDayApiResponse, DeleteNutritionPlanDayApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-days/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    updateNutritionPlanDay: build.mutation<UpdateNutritionPlanDayApiResponse, UpdateNutritionPlanDayApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-days/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.nutritionPlanDayUpdateRequest,
      }),
    }),
    duplicateTrainingPlan: build.mutation<DuplicateTrainingPlanApiResponse, DuplicateTrainingPlanApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-plans/${queryArg.id}/duplicate`,
        method: 'POST',
      }),
    }),
    listMeals: build.query<ListMealsApiResponse, ListMealsApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-plans/${queryArg.planId}/meals`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
        },
      }),
    }),
    createMeal: build.mutation<CreateMealApiResponse, CreateMealApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-plans/${queryArg.planId}/meals`,
        method: 'POST',
        body: queryArg.nutritionMealRequest,
      }),
    }),
    reassignClient: build.mutation<ReassignClientApiResponse, ReassignClientApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/clients/${queryArg.id}/reassign`,
        method: 'POST',
        body: queryArg.reassignClientRequest,
      }),
    }),
    getNutritionFoodImpact: build.query<GetNutritionFoodImpactApiResponse, GetNutritionFoodImpactApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-foods/${queryArg.id}/impact`,
      }),
    }),
    listCoachConversationMessages: build.query<
      ListCoachConversationMessagesApiResponse,
      ListCoachConversationMessagesApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/coach/conversations/${queryArg.id}/messages`,
        params: {
          before: queryArg.before,
          limit: queryArg.limit,
        },
      }),
    }),
    createCoachConversationMessage: build.mutation<
      CreateCoachConversationMessageApiResponse,
      CreateCoachConversationMessageApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/coach/conversations/${queryArg.id}/messages`,
        method: 'POST',
        body: queryArg.chatMessageCreateRequest,
      }),
    }),
    trainerAcceptInvite: build.mutation<TrainerAcceptInviteApiResponse, TrainerAcceptInviteApiArg>({
      query: (queryArg) => ({
        url: `/v1/auth/trainer-accept-invite`,
        method: 'POST',
        body: queryArg.trainerAcceptInviteRequest,
      }),
    }),
    assignNutritionPlan: build.mutation<AssignNutritionPlanApiResponse, AssignNutritionPlanApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-plans/${queryArg.id}/assign`,
        method: 'POST',
        body: queryArg.nutritionPlanAssignRequest,
      }),
    }),
    syncBilling: build.mutation<SyncBillingApiResponse, SyncBillingApiArg>({
      query: () => ({url: `/v1/coach/billing/sync`, method: 'POST'}),
    }),
    markCoachConversationRead: build.mutation<MarkCoachConversationReadApiResponse, MarkCoachConversationReadApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/conversations/${queryArg.id}/read`,
        method: 'POST',
      }),
    }),
    getBilling: build.query<GetBillingApiResponse, GetBillingApiArg>({
      query: () => ({url: `/v1/coach/billing`}),
    }),
    inviteClient: build.mutation<InviteClientApiResponse, InviteClientApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/clients/invite`,
        method: 'POST',
        body: queryArg.clientInviteRequest,
      }),
    }),
    createWorkoutElement: build.mutation<CreateWorkoutElementApiResponse, CreateWorkoutElementApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-workouts/${queryArg.workoutId}/exercises`,
        method: 'POST',
        body: queryArg.trainingWorkoutExerciseRequest,
      }),
    }),
    verifyAuth: build.mutation<VerifyAuthApiResponse, VerifyAuthApiArg>({
      query: (queryArg) => ({
        url: `/v1/auth/verify`,
        method: 'POST',
        body: queryArg.verifyRequest,
      }),
    }),
    deleteProfileField: build.mutation<DeleteProfileFieldApiResponse, DeleteProfileFieldApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/profile-fields/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    updateProfileField: build.mutation<UpdateProfileFieldApiResponse, UpdateProfileFieldApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/profile-fields/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.clientProfileFieldUpdateRequest,
      }),
    }),
    deleteNutritionPlan: build.mutation<DeleteNutritionPlanApiResponse, DeleteNutritionPlanApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-plans/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    getNutritionPlan: build.query<GetNutritionPlanApiResponse, GetNutritionPlanApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-plans/${queryArg.id}`,
      }),
    }),
    updateNutritionPlan: build.mutation<UpdateNutritionPlanApiResponse, UpdateNutritionPlanApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-plans/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.nutritionPlanRequest,
      }),
    }),
    reorderWorkoutElements: build.mutation<ReorderWorkoutElementsApiResponse, ReorderWorkoutElementsApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-workouts/${queryArg.workoutId}/exercises/reorder`,
        method: 'PUT',
        body: queryArg.trainingWorkoutReorderRequest,
      }),
    }),
    listCoachClientNutritionPlans: build.query<
      ListCoachClientNutritionPlansApiResponse,
      ListCoachClientNutritionPlansApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/coach/clients/${queryArg.clientId}/nutrition-plans`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
          status: queryArg.status,
        },
      }),
    }),
    getProspect: build.query<GetProspectApiResponse, GetProspectApiArg>({
      query: (queryArg) => ({url: `/v1/coach/prospects/${queryArg.id}`}),
    }),
    updateProspect: build.mutation<UpdateProspectApiResponse, UpdateProspectApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/prospects/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.prospectUpdateRequest,
      }),
    }),
    createBusiness: build.mutation<CreateBusinessApiResponse, CreateBusinessApiArg>({
      query: (queryArg) => ({
        url: `/v1/businesses`,
        method: 'POST',
        body: queryArg.businessRequest,
      }),
    }),
    listMuscles: build.query<ListMusclesApiResponse, ListMusclesApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-muscles`,
        params: {
          search: queryArg.search,
        },
      }),
    }),
    revokeTrainerInvite: build.mutation<RevokeTrainerInviteApiResponse, RevokeTrainerInviteApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/team/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    deleteMeal: build.mutation<DeleteMealApiResponse, DeleteMealApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-meals/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    getMeal: build.query<GetMealApiResponse, GetMealApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-meals/${queryArg.id}`,
      }),
    }),
    updateMeal: build.mutation<UpdateMealApiResponse, UpdateMealApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-meals/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.nutritionMealRequest,
      }),
    }),
    deleteWorkout: build.mutation<DeleteWorkoutApiResponse, DeleteWorkoutApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-workouts/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    getWorkout: build.query<GetWorkoutApiResponse, GetWorkoutApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-workouts/${queryArg.id}`,
      }),
    }),
    updateWorkout: build.mutation<UpdateWorkoutApiResponse, UpdateWorkoutApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-workouts/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.trainingWorkoutUpdateRequest,
      }),
    }),
    listClientWeightEntries: build.query<ListClientWeightEntriesApiResponse, ListClientWeightEntriesApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/clients/${queryArg.clientId}/weight_entries`,
        params: {
          since: queryArg.since,
        },
      }),
    }),
    getTeam: build.query<GetTeamApiResponse, GetTeamApiArg>({
      query: () => ({url: `/v1/coach/team`}),
    }),
    assignTrainingPlan: build.mutation<AssignTrainingPlanApiResponse, AssignTrainingPlanApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-plans/${queryArg.id}/assign`,
        method: 'POST',
        body: queryArg.trainingPlanAssignRequest,
      }),
    }),
    removeNutritionSlotOption: build.mutation<RemoveNutritionSlotOptionApiResponse, RemoveNutritionSlotOptionApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-day-meals/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    showTrainerInvitation: build.query<ShowTrainerInvitationApiResponse, ShowTrainerInvitationApiArg>({
      query: (queryArg) => ({
        url: `/v1/auth/trainer-invitations/${queryArg.token}`,
      }),
    }),
    listFormTemplates: build.query<ListFormTemplatesApiResponse, ListFormTemplatesApiArg>({
      query: () => ({url: `/v1/coach/form-templates`}),
    }),
    createFormTemplate: build.mutation<CreateFormTemplateApiResponse, CreateFormTemplateApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/form-templates`,
        method: 'POST',
        body: queryArg.clientProfileFormTemplateRequest,
      }),
    }),
    deleteWorkoutElement: build.mutation<DeleteWorkoutElementApiResponse, DeleteWorkoutElementApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-workout-exercises/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    updateWorkoutElement: build.mutation<UpdateWorkoutElementApiResponse, UpdateWorkoutElementApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-workout-exercises/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.trainingWorkoutExerciseRequest,
      }),
    }),
    listClients: build.query<ListClientsApiResponse, ListClientsApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/clients`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
          search: queryArg.search,
          status: queryArg.status,
          stage: queryArg.stage,
          profile_filter: queryArg.profileFilter,
        },
      }),
    }),
    deleteTrainingPlan: build.mutation<DeleteTrainingPlanApiResponse, DeleteTrainingPlanApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-plans/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    getTrainingPlan: build.query<GetTrainingPlanApiResponse, GetTrainingPlanApiArg>({
      query: (queryArg) => ({url: `/v1/coach/training-plans/${queryArg.id}`}),
    }),
    updateTrainingPlan: build.mutation<UpdateTrainingPlanApiResponse, UpdateTrainingPlanApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-plans/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.trainingPlanUpdateRequest,
      }),
    }),
    copyExercise: build.mutation<CopyExerciseApiResponse, CopyExerciseApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-exercises/${queryArg.id}/copy`,
        method: 'POST',
        body: queryArg.trainingExerciseCopyRequest,
      }),
    }),
    listCoachExercises: build.query<ListCoachExercisesApiResponse, ListCoachExercisesApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-exercises`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
          search: queryArg.search,
          muscle_ids: queryArg.muscleIds,
          equipment_ids: queryArg.equipmentIds,
        },
      }),
    }),
    createExercise: build.mutation<CreateExerciseApiResponse, CreateExerciseApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-exercises`,
        method: 'POST',
        body: queryArg.trainingExerciseCreateRequest,
      }),
    }),
    verifyInvitation: build.mutation<VerifyInvitationApiResponse, VerifyInvitationApiArg>({
      query: (queryArg) => ({
        url: `/v1/auth/accept-invite/verify`,
        method: 'POST',
        body: queryArg.acceptInviteVerifyRequest,
      }),
    }),
    deleteMealItem: build.mutation<DeleteMealItemApiResponse, DeleteMealItemApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-meal-items/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    updateMealItem: build.mutation<UpdateMealItemApiResponse, UpdateMealItemApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-meal-items/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.nutritionMealItemRequest,
      }),
    }),
    deleteExercise: build.mutation<DeleteExerciseApiResponse, DeleteExerciseApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-exercises/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    getExercise: build.query<GetExerciseApiResponse, GetExerciseApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-exercises/${queryArg.id}`,
      }),
    }),
    updateExercise: build.mutation<UpdateExerciseApiResponse, UpdateExerciseApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-exercises/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.trainingExerciseUpdateRequest,
      }),
    }),
    updateDashboardSetup: build.mutation<UpdateDashboardSetupApiResponse, UpdateDashboardSetupApiArg>({
      query: (queryArg) => ({
        url: `/v1/businesses/me/dashboard-setup`,
        method: 'PATCH',
        body: queryArg.dashboardSetupUpdateRequest,
      }),
    }),
    getNutritionRecipeImpact: build.query<GetNutritionRecipeImpactApiResponse, GetNutritionRecipeImpactApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-recipes/${queryArg.id}/impact`,
      }),
    }),
    duplicateNutritionPlan: build.mutation<DuplicateNutritionPlanApiResponse, DuplicateNutritionPlanApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-plans/${queryArg.id}/duplicate`,
        method: 'POST',
      }),
    }),
    copyNutritionRecipe: build.mutation<CopyNutritionRecipeApiResponse, CopyNutritionRecipeApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-recipes/${queryArg.id}/copy`,
        method: 'POST',
      }),
    }),
    getLandingPage: build.query<GetLandingPageApiResponse, GetLandingPageApiArg>({
      query: () => ({url: `/v1/coach/landing-page`}),
    }),
    saveLandingPage: build.mutation<SaveLandingPageApiResponse, SaveLandingPageApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/landing-page`,
        method: 'PUT',
        body: queryArg.landingPageUpsertRequest,
      }),
    }),
    checkoutBilling: build.mutation<CheckoutBillingApiResponse, CheckoutBillingApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/billing/checkout`,
        method: 'POST',
        body: queryArg.billingCheckoutRequest,
      }),
    }),
    listFormSubmissions: build.query<ListFormSubmissionsApiResponse, ListFormSubmissionsApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/form-assignments/${queryArg.id}/submissions`,
      }),
    }),
    deleteFormTemplate: build.mutation<DeleteFormTemplateApiResponse, DeleteFormTemplateApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/form-templates/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    getFormTemplate: build.query<GetFormTemplateApiResponse, GetFormTemplateApiArg>({
      query: (queryArg) => ({url: `/v1/coach/form-templates/${queryArg.id}`}),
    }),
    updateFormTemplate: build.mutation<UpdateFormTemplateApiResponse, UpdateFormTemplateApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/form-templates/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.clientProfileFormTemplateUpdateRequest,
      }),
    }),
    trainerAcceptInviteVerify: build.mutation<TrainerAcceptInviteVerifyApiResponse, TrainerAcceptInviteVerifyApiArg>({
      query: (queryArg) => ({
        url: `/v1/auth/trainer-accept-invite/verify`,
        method: 'POST',
        body: queryArg.trainerAcceptInviteVerifyRequest,
      }),
    }),
    signup: build.mutation<SignupApiResponse, SignupApiArg>({
      query: (queryArg) => ({
        url: `/v1/auth/signup`,
        method: 'POST',
        body: queryArg.signupRequest,
      }),
    }),
    listCoachMealLogs: build.query<ListCoachMealLogsApiResponse, ListCoachMealLogsApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/clients/${queryArg.clientId}/nutrition-meal-logs`,
        params: {
          date: queryArg.date,
          from: queryArg['from'],
          to: queryArg.to,
        },
      }),
    }),
    listRecipes: build.query<ListRecipesApiResponse, ListRecipesApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-recipes`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
          search: queryArg.search,
        },
      }),
    }),
    createRecipe: build.mutation<CreateRecipeApiResponse, CreateRecipeApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-recipes`,
        method: 'POST',
        body: queryArg.recipeRequest,
      }),
    }),
    deleteFood: build.mutation<DeleteFoodApiResponse, DeleteFoodApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-foods/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    getFood: build.query<GetFoodApiResponse, GetFoodApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-foods/${queryArg.id}`,
      }),
    }),
    updateFood: build.mutation<UpdateFoodApiResponse, UpdateFoodApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-foods/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.foodUpdateRequest,
      }),
    }),
    sendOtp: build.mutation<SendOtpApiResponse, SendOtpApiArg>({
      query: (queryArg) => ({
        url: `/v1/auth/otp`,
        method: 'POST',
        body: queryArg.otpRequest,
      }),
    }),
    listFoods: build.query<ListFoodsApiResponse, ListFoodsApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-foods`,
        params: {
          offset: queryArg.offset,
          limit: queryArg.limit,
          search: queryArg.search,
        },
      }),
    }),
    createFood: build.mutation<CreateFoodApiResponse, CreateFoodApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-foods`,
        method: 'POST',
        body: queryArg.foodRequest,
      }),
    }),
    listEquipment: build.query<ListEquipmentApiResponse, ListEquipmentApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/training-equipment`,
        params: {
          search: queryArg.search,
        },
      }),
    }),
    deleteRecipe: build.mutation<DeleteRecipeApiResponse, DeleteRecipeApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-recipes/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
    getRecipe: build.query<GetRecipeApiResponse, GetRecipeApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-recipes/${queryArg.id}`,
      }),
    }),
    updateRecipe: build.mutation<UpdateRecipeApiResponse, UpdateRecipeApiArg>({
      query: (queryArg) => ({
        url: `/v1/coach/nutrition-recipes/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.recipeRequest,
      }),
    }),
    healthCheck: build.query<HealthCheckApiResponse, HealthCheckApiArg>({
      query: () => ({url: `/api/health`}),
    }),
  }),
  overrideExisting: false,
});

export {injectedRtkApi as coachApi};
export type ListTrainingPlansApiResponse = /** status 200 Training plans */ TrainingPlanListResponse;
export type ListTrainingPlansApiArg = {
  /** Number of training plans to skip */
  offset?: number;
  /** Maximum training plans to return */
  limit?: number;
  /** Case-insensitive training plan name search */
  search?: string;
  /** Only training plans with this status */
  status?: 'active' | 'archived';
};
export type CreateTrainingPlanApiResponse = /** status 201 Training plan created */ TrainingPlanResponse;
export type CreateTrainingPlanApiArg = {
  /** Training plan create request */
  trainingPlanCreateRequest: TrainingPlanCreateRequest;
};
export type SetTrainingPlanDayScheduleApiResponse = /** status 200 Updated day */ TrainingScheduleDayResponse;
export type SetTrainingPlanDayScheduleApiArg = {
  planId: string;
  day: string;
  /** Day schedule */
  trainingDayScheduleRequest: TrainingDayScheduleRequest;
};
export type DeleteClientApiResponse = unknown;
export type DeleteClientApiArg = {
  /** Client id */
  id: string;
};
export type GetClientApiResponse = /** status 200 Client */ ClientResponse;
export type GetClientApiArg = {
  /** Client id */
  id: string;
};
export type UpdateClientApiResponse = /** status 200 Client updated */ ClientResponse;
export type UpdateClientApiArg = {
  /** Client id */
  id: string;
  /** Client update request */
  clientUpdateRequest: ClientUpdateRequest;
};
export type GetCoachingClientProfileApiResponse = /** status 200 Client profile */ CoachingClientProfileResponse;
export type GetCoachingClientProfileApiArg = {
  /** Client id */
  clientId: string;
};
export type UpdateCoachingClientProfileApiResponse =
  /** status 200 Client profile updated */ CoachingClientProfileResponse;
export type UpdateCoachingClientProfileApiArg = {
  /** Client id */
  clientId: string;
  /** Client profile update request */
  coachingClientProfileRequest: CoachingClientProfileRequest;
};
export type EnrollProspectApiResponse = /** status 201 Prospect enrolled */ ProspectEnrollResponse;
export type EnrollProspectApiArg = {
  /** Prospect id */
  id: string;
  /** Enroll request */
  prospectEnrollRequest: ProspectEnrollRequest;
};
export type AssignNutritionPlanWeekdayApiResponse = /** status 200 Assignment */ NutritionWeekdayAssignmentResponse;
export type AssignNutritionPlanWeekdayApiArg = {
  planId: string;
  /** Weekday assignment */
  nutritionWeekdayAssignRequest: NutritionWeekdayAssignRequest;
};
export type GetCoachProfileApiResponse = /** status 200 Coach profile */ CoachProfileResponse;
export type GetCoachProfileApiArg = void;
export type UpdateCoachProfileApiResponse = /** status 200 Coach profile updated */ CoachProfileResponse;
export type UpdateCoachProfileApiArg = {
  /** Coach profile update request */
  coachProfileUpdateRequest: CoachProfileUpdateRequest;
};
export type ResendClientInviteApiResponse = /** status 200 Client */ ClientResponse;
export type ResendClientInviteApiArg = {
  /** Client id */
  id: string;
};
export type InviteTrainerApiResponse = /** status 200 Trainer invited */ TeamMemberResponse;
export type InviteTrainerApiArg = {
  /** Trainer invite request */
  trainerInviteRequest: TrainerInviteRequest;
};
export type ListCoachClientTrainingSessionsApiResponse =
  /** status 200 Training sessions */ TrainingSessionListResponse;
export type ListCoachClientTrainingSessionsApiArg = {
  /** Client id */
  clientId: string;
  /** Start date (YYYY-MM-DD) */
  from?: string;
  /** End date (YYYY-MM-DD) */
  to?: string;
};
export type SubmitApplicationApiResponse = /** status 201 Application received */ PublicApplicationResponse;
export type SubmitApplicationApiArg = {
  /** Landing page slug */
  slug: string;
  /** Application request */
  publicApplicationRequest: PublicApplicationRequest;
};
export type GetCoachClientTrainingSessionApiResponse = /** status 200 Training session */ TrainingSessionResponse;
export type GetCoachClientTrainingSessionApiArg = {
  /** Client id */
  clientId: string;
  /** Training session id */
  id: string;
};
export type DeactivateTrainerApiResponse = /** status 200 Trainer deactivated */ TeamMemberResponse;
export type DeactivateTrainerApiArg = {
  /** Coach id */
  id: string;
};
export type ListCoachClientTrainingPlansApiResponse = /** status 200 Training plans */ ClientTrainingPlanListResponse;
export type ListCoachClientTrainingPlansApiArg = {
  /** Client id */
  clientId: string;
  /** Number of plans to skip */
  offset?: number;
  /** Maximum plans to return */
  limit?: number;
  /** Only plans with this status */
  status?: 'active' | 'archived';
};
export type ListClientFormAssignmentsForCoachApiResponse =
  /** status 200 Form assignments */ ClientProfileFormAssignmentListResponse;
export type ListClientFormAssignmentsForCoachApiArg = {
  /** Client id */
  clientId: string;
};
export type ResendTrainerInviteApiResponse = /** status 200 Trainer */ TeamMemberResponse;
export type ResendTrainerInviteApiArg = {
  /** Coach id */
  id: string;
};
export type ShowInvitationApiResponse = /** status 200 Invitation preview */ InvitationPreviewResponse;
export type ShowInvitationApiArg = {
  /** Invitation token */
  token: string;
};
export type ListNutritionPlansApiResponse = /** status 200 Nutrition plans */ NutritionPlanListResponse;
export type ListNutritionPlansApiArg = {
  /** Number of nutrition plans to skip */
  offset?: number;
  /** Maximum nutrition plans to return */
  limit?: number;
  /** Only nutrition plans with this status */
  status?: 'active' | 'archived';
};
export type CreateNutritionPlanApiResponse = /** status 201 Nutrition plan created */ NutritionPlanResponse;
export type CreateNutritionPlanApiArg = {
  /** Nutrition plan request */
  nutritionPlanRequest: NutritionPlanRequest;
};
export type ListProfileFieldsApiResponse = /** status 200 Profile fields */ ClientProfileFieldListResponse;
export type ListProfileFieldsApiArg = void;
export type CreateProfileFieldApiResponse = /** status 201 Profile field created */ ClientProfileFieldResponse;
export type CreateProfileFieldApiArg = {
  /** Profile field create request */
  clientProfileFieldRequest: ClientProfileFieldRequest;
};
export type GetCurrentBusinessApiResponse = /** status 200 Business */ BusinessResponse;
export type GetCurrentBusinessApiArg = void;
export type UpdateCurrentBusinessApiResponse = /** status 200 Business updated */ BusinessResponse;
export type UpdateCurrentBusinessApiArg = {
  /** Business update request */
  businessUpdateRequest: BusinessUpdateRequest;
};
export type GetPublicLandingPageApiResponse = /** status 200 Landing page */ PublicLandingPageResponse;
export type GetPublicLandingPageApiArg = {
  /** Landing page slug */
  slug: string;
};
export type CreateMealItemApiResponse = /** status 201 Meal item created */ NutritionMealItemResponse;
export type CreateMealItemApiArg = {
  /** Meal id */
  mealId: string;
  /** Meal item request */
  nutritionMealItemRequest: NutritionMealItemRequest;
};
export type ListCoachConversationsApiResponse = /** status 200 Conversations */ ConversationListResponse;
export type ListCoachConversationsApiArg = {
  /** Offset */
  offset?: number;
  /** Limit (max 100) */
  limit?: number;
};
export type CreateAuthTokenApiResponse = /** status 200 Auth token */ AuthTokenResponse;
export type CreateAuthTokenApiArg = {
  /** Token request */
  tokenRequest: TokenRequest;
};
export type ListProspectsApiResponse = /** status 200 Prospects */ ProspectListResponse;
export type ListProspectsApiArg = {
  /** Filter by status */
  status?: string;
  /** Pagination offset */
  offset?: number;
  /** Page size (max 100) */
  limit?: number;
};
export type GetCoachConversationApiResponse = /** status 200 Conversation */ ConversationResponse;
export type GetCoachConversationApiArg = {
  /** Conversation id */
  id: string;
};
export type AddNutritionSlotOptionApiResponse = /** status 201 Option */ NutritionDayMealResponse;
export type AddNutritionSlotOptionApiArg = {
  dayId: string;
  /** Option */
  nutritionSlotOptionCreateRequest: NutritionSlotOptionCreateRequest;
};
export type GetCoachClientConversationApiResponse = /** status 200 Conversation */ ConversationResponse;
export type GetCoachClientConversationApiArg = {
  /** Client id */
  clientId: string;
};
export type CreateNutritionPlanDayApiResponse = /** status 201 Day */ NutritionPlanDayResponse;
export type CreateNutritionPlanDayApiArg = {
  planId: string;
  /** Day */
  nutritionPlanDayCreateRequest: NutritionPlanDayCreateRequest;
};
export type AcceptInviteApiResponse = /** status 200 OTP sent */ MessageResponse;
export type AcceptInviteApiArg = {
  /** Accept invite request */
  acceptInviteRequest: AcceptInviteRequest;
};
export type CancelBillingApiResponse = /** status 200 Billing */ BillingResponse;
export type CancelBillingApiArg = void;
export type GetTrainingPlanScheduleApiResponse = /** status 200 Schedule */ TrainingScheduleResponse;
export type GetTrainingPlanScheduleApiArg = {
  planId: string;
};
export type AssignFormTemplateApiResponse =
  /** status 201 Form assignment created */ ClientProfileFormAssignmentResponse;
export type AssignFormTemplateApiArg = {
  /** Form template id */
  id: string;
  /** Form assignment request */
  clientProfileFormAssignmentAssignRequest: ClientProfileFormAssignmentAssignRequest;
};
export type MakeNutritionSlotOptionDefaultApiResponse = /** status 200 Option */ NutritionDayMealResponse;
export type MakeNutritionSlotOptionDefaultApiArg = {
  id: string;
};
export type CopyNutritionFoodApiResponse = /** status 201 Food */ FoodResponse;
export type CopyNutritionFoodApiArg = {
  id: string;
};
export type ListWorkoutsApiResponse = /** status 200 Workouts */ TrainingWorkoutListResponse;
export type ListWorkoutsApiArg = {
  /** Training plan id */
  planId: string;
  /** Number of workouts to skip */
  offset?: number;
  /** Maximum workouts to return */
  limit?: number;
};
export type CreateWorkoutApiResponse = /** status 201 Workout created */ TrainingWorkoutResponse;
export type CreateWorkoutApiArg = {
  /** Training plan id */
  planId: string;
  /** Workout create request */
  trainingWorkoutRequest: TrainingWorkoutRequest;
};
export type UpdateFormAssignmentApiResponse =
  /** status 200 Form assignment updated */ ClientProfileFormAssignmentResponse;
export type UpdateFormAssignmentApiArg = {
  /** Form assignment id */
  id: string;
  /** Form assignment update request */
  clientProfileFormAssignmentUpdateRequest: ClientProfileFormAssignmentUpdateRequest;
};
export type DeleteNutritionPlanDayApiResponse = unknown;
export type DeleteNutritionPlanDayApiArg = {
  id: string;
};
export type UpdateNutritionPlanDayApiResponse = /** status 200 Day */ NutritionPlanDayResponse;
export type UpdateNutritionPlanDayApiArg = {
  id: string;
  /** Day */
  nutritionPlanDayUpdateRequest: NutritionPlanDayUpdateRequest;
};
export type DuplicateTrainingPlanApiResponse = /** status 201 Training plan duplicated */ TrainingPlanResponse;
export type DuplicateTrainingPlanApiArg = {
  /** Training plan id */
  id: string;
};
export type ListMealsApiResponse = /** status 200 Meals */ NutritionMealListResponse;
export type ListMealsApiArg = {
  /** Nutrition plan id */
  planId: string;
  /** Number of meals to skip */
  offset?: number;
  /** Maximum meals to return */
  limit?: number;
};
export type CreateMealApiResponse = /** status 201 Meal created */ NutritionMealResponse;
export type CreateMealApiArg = {
  /** Nutrition plan id */
  planId: string;
  /** Meal request */
  nutritionMealRequest: NutritionMealRequest;
};
export type ReassignClientApiResponse = /** status 200 Client reassigned */ ClientResponse;
export type ReassignClientApiArg = {
  /** Client id */
  id: string;
  /** Reassign client request */
  reassignClientRequest: ReassignClientRequest;
};
export type GetNutritionFoodImpactApiResponse = /** status 200 Impact */ FoodImpactResponse;
export type GetNutritionFoodImpactApiArg = {
  id: string;
};
export type ListCoachConversationMessagesApiResponse = /** status 200 Messages */ ChatMessagesResponse;
export type ListCoachConversationMessagesApiArg = {
  /** Conversation id */
  id: string;
  /** Message id cursor — return messages older than this */
  before?: string;
  /** Page size (default 50, max 100) */
  limit?: number;
};
export type CreateCoachConversationMessageApiResponse = /** status 201 Message */ ChatMessageResponse;
export type CreateCoachConversationMessageApiArg = {
  /** Conversation id */
  id: string;
  /** Message */
  chatMessageCreateRequest: ChatMessageCreateRequest;
};
export type TrainerAcceptInviteApiResponse = /** status 200 OTP sent */ MessageResponse;
export type TrainerAcceptInviteApiArg = {
  /** Trainer accept invite request */
  trainerAcceptInviteRequest: TrainerAcceptInviteRequest;
};
export type AssignNutritionPlanApiResponse = /** status 201 Nutrition plan assigned */ NutritionPlanResponse;
export type AssignNutritionPlanApiArg = {
  /** Nutrition plan id */
  id: string;
  /** Nutrition plan assign request */
  nutritionPlanAssignRequest: NutritionPlanAssignRequest;
};
export type SyncBillingApiResponse = /** status 200 Billing */ BillingResponse;
export type SyncBillingApiArg = void;
export type MarkCoachConversationReadApiResponse = /** status 200 Conversation */ ConversationResponse;
export type MarkCoachConversationReadApiArg = {
  /** Conversation id */
  id: string;
};
export type GetBillingApiResponse = /** status 200 Billing */ BillingResponse;
export type GetBillingApiArg = void;
export type InviteClientApiResponse = /** status 201 Client invited */ ClientResponse;
export type InviteClientApiArg = {
  /** Client invite request */
  clientInviteRequest: ClientInviteRequest;
};
export type CreateWorkoutElementApiResponse = /** status 201 Workout element created */ TrainingWorkoutExerciseResponse;
export type CreateWorkoutElementApiArg = {
  /** Workout id */
  workoutId: string;
  /** Workout element request */
  trainingWorkoutExerciseRequest: TrainingWorkoutExerciseRequest;
};
export type VerifyAuthApiResponse = /** status 200 Auth token */ AuthTokenResponse;
export type VerifyAuthApiArg = {
  /** Verify request */
  verifyRequest: VerifyRequest;
};
export type DeleteProfileFieldApiResponse = unknown;
export type DeleteProfileFieldApiArg = {
  /** Profile field id */
  id: string;
};
export type UpdateProfileFieldApiResponse = /** status 200 Profile field updated */ ClientProfileFieldResponse;
export type UpdateProfileFieldApiArg = {
  /** Profile field id */
  id: string;
  /** Profile field update request */
  clientProfileFieldUpdateRequest: ClientProfileFieldUpdateRequest;
};
export type DeleteNutritionPlanApiResponse = unknown;
export type DeleteNutritionPlanApiArg = {
  /** Nutrition plan id */
  id: string;
};
export type GetNutritionPlanApiResponse = /** status 200 Nutrition plan */ NutritionPlanResponse;
export type GetNutritionPlanApiArg = {
  /** Nutrition plan id */
  id: string;
};
export type UpdateNutritionPlanApiResponse = /** status 200 Nutrition plan updated */ NutritionPlanResponse;
export type UpdateNutritionPlanApiArg = {
  /** Nutrition plan id */
  id: string;
  /** Nutrition plan request */
  nutritionPlanRequest: NutritionPlanRequest;
};
export type ReorderWorkoutElementsApiResponse =
  /** status 200 Workout elements reordered */ TrainingWorkoutExerciseArrayResponse;
export type ReorderWorkoutElementsApiArg = {
  /** Workout id */
  workoutId: string;
  /** Reorder request */
  trainingWorkoutReorderRequest: TrainingWorkoutReorderRequest;
};
export type ListCoachClientNutritionPlansApiResponse = /** status 200 Nutrition plans */ NutritionPlanListResponse;
export type ListCoachClientNutritionPlansApiArg = {
  /** Client id */
  clientId: string;
  /** Number of plans to skip */
  offset?: number;
  /** Maximum plans to return */
  limit?: number;
  /** Only plans with this status */
  status?: 'active' | 'archived';
};
export type GetProspectApiResponse = /** status 200 Prospect */ ProspectResponse;
export type GetProspectApiArg = {
  /** Prospect id */
  id: string;
};
export type UpdateProspectApiResponse = /** status 200 Prospect updated */ ProspectResponse;
export type UpdateProspectApiArg = {
  /** Prospect id */
  id: string;
  /** Prospect update request */
  prospectUpdateRequest: ProspectUpdateRequest;
};
export type CreateBusinessApiResponse = /** status 201 Business created */ BusinessResponse;
export type CreateBusinessApiArg = {
  /** Business create request */
  businessRequest: BusinessRequest;
};
export type ListMusclesApiResponse = /** status 200 Muscles */ TrainingMuscleListResponse;
export type ListMusclesApiArg = {
  /** Case-insensitive muscle name search */
  search?: string;
};
export type RevokeTrainerInviteApiResponse = /** status 200 Trainer invitation revoked */ TeamMemberResponse;
export type RevokeTrainerInviteApiArg = {
  /** Coach id */
  id: string;
};
export type DeleteMealApiResponse = unknown;
export type DeleteMealApiArg = {
  /** Meal id */
  id: string;
};
export type GetMealApiResponse = /** status 200 Meal */ NutritionMealResponse;
export type GetMealApiArg = {
  /** Meal id */
  id: string;
};
export type UpdateMealApiResponse = /** status 200 Meal updated */ NutritionMealResponse;
export type UpdateMealApiArg = {
  /** Meal id */
  id: string;
  /** Meal request */
  nutritionMealRequest: NutritionMealRequest;
};
export type DeleteWorkoutApiResponse = unknown;
export type DeleteWorkoutApiArg = {
  /** Workout id */
  id: string;
};
export type GetWorkoutApiResponse = /** status 200 Workout */ TrainingWorkoutResponse;
export type GetWorkoutApiArg = {
  /** Workout id */
  id: string;
};
export type UpdateWorkoutApiResponse = /** status 200 Workout updated */ TrainingWorkoutResponse;
export type UpdateWorkoutApiArg = {
  /** Workout id */
  id: string;
  /** Workout update request */
  trainingWorkoutUpdateRequest: TrainingWorkoutUpdateRequest;
};
export type ListClientWeightEntriesApiResponse = /** status 200 Weight entries */ WeightEntryListResponse;
export type ListClientWeightEntriesApiArg = {
  /** Client id */
  clientId: string;
  /** Only entries since this date */
  since?: string;
};
export type GetTeamApiResponse = /** status 200 Team */ TeamResponse;
export type GetTeamApiArg = void;
export type AssignTrainingPlanApiResponse = /** status 201 Training plan assigned */ TrainingPlanResponse;
export type AssignTrainingPlanApiArg = {
  /** Training plan id */
  id: string;
  /** Training plan assign request */
  trainingPlanAssignRequest: TrainingPlanAssignRequest;
};
export type RemoveNutritionSlotOptionApiResponse = unknown;
export type RemoveNutritionSlotOptionApiArg = {
  id: string;
};
export type ShowTrainerInvitationApiResponse =
  /** status 200 Trainer invitation preview */ TrainerInvitationPreviewResponse;
export type ShowTrainerInvitationApiArg = {
  /** Trainer invitation token */
  token: string;
};
export type ListFormTemplatesApiResponse = /** status 200 Form templates */ ClientProfileFormTemplateListResponse;
export type ListFormTemplatesApiArg = void;
export type CreateFormTemplateApiResponse = /** status 201 Form template created */ ClientProfileFormTemplateResponse;
export type CreateFormTemplateApiArg = {
  /** Form template create request */
  clientProfileFormTemplateRequest: ClientProfileFormTemplateRequest;
};
export type DeleteWorkoutElementApiResponse = unknown;
export type DeleteWorkoutElementApiArg = {
  /** Workout element id */
  id: string;
};
export type UpdateWorkoutElementApiResponse = /** status 200 Workout element updated */ TrainingWorkoutExerciseResponse;
export type UpdateWorkoutElementApiArg = {
  /** Workout element id */
  id: string;
  /** Workout element request */
  trainingWorkoutExerciseRequest: TrainingWorkoutExerciseRequest;
};
export type ListClientsApiResponse = /** status 200 Clients */ ClientListResponse;
export type ListClientsApiArg = {
  /** Number of clients to skip */
  offset?: number;
  /** Maximum clients to return */
  limit?: number;
  /** Case-insensitive client search */
  search?: string;
  /** Only clients with this status */
  status?: 'active' | 'pending' | 'inactive';
  /** Only clients with this stage */
  stage?: 'onboarding' | 'coaching';
  /** Nested profile filters using deepObject syntax. Example: profile_filter[nutrition][goal]=fat_loss or profile_filter[custom][meal_prep_ability]=high. Values may be scalar or repeated list values; list values match any selected value. */
  profileFilter?: {
    custom?: {
      [key: string]: any;
    };
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
    [key: string]: any;
  };
};
export type DeleteTrainingPlanApiResponse = unknown;
export type DeleteTrainingPlanApiArg = {
  /** Training plan id */
  id: string;
};
export type GetTrainingPlanApiResponse = /** status 200 Training plan */ TrainingPlanResponse;
export type GetTrainingPlanApiArg = {
  /** Training plan id */
  id: string;
};
export type UpdateTrainingPlanApiResponse = /** status 200 Training plan updated */ TrainingPlanResponse;
export type UpdateTrainingPlanApiArg = {
  /** Training plan id */
  id: string;
  /** Training plan update request */
  trainingPlanUpdateRequest: TrainingPlanUpdateRequest;
};
export type CopyExerciseApiResponse = /** status 201 Exercise copied */ TrainingExerciseResponse;
export type CopyExerciseApiArg = {
  /** Exercise id */
  id: string;
  /** Exercise copy request */
  trainingExerciseCopyRequest: TrainingExerciseCopyRequest;
};
export type ListCoachExercisesApiResponse = /** status 200 Exercises */ TrainingExerciseListResponse;
export type ListCoachExercisesApiArg = {
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
export type CreateExerciseApiResponse = /** status 201 Exercise created */ TrainingExerciseResponse;
export type CreateExerciseApiArg = {
  /** Exercise create request */
  trainingExerciseCreateRequest: TrainingExerciseCreateRequest;
};
export type VerifyInvitationApiResponse = /** status 200 Auth token */ AuthTokenResponse;
export type VerifyInvitationApiArg = {
  /** Accept invite verification request */
  acceptInviteVerifyRequest: AcceptInviteVerifyRequest;
};
export type DeleteMealItemApiResponse = unknown;
export type DeleteMealItemApiArg = {
  /** Meal item id */
  id: string;
};
export type UpdateMealItemApiResponse = /** status 200 Meal item updated */ NutritionMealItemResponse;
export type UpdateMealItemApiArg = {
  /** Meal item id */
  id: string;
  /** Meal item request */
  nutritionMealItemRequest: NutritionMealItemRequest;
};
export type DeleteExerciseApiResponse = unknown;
export type DeleteExerciseApiArg = {
  /** Exercise id */
  id: string;
};
export type GetExerciseApiResponse = /** status 200 Exercise */ TrainingExerciseResponse;
export type GetExerciseApiArg = {
  /** Exercise id */
  id: string;
};
export type UpdateExerciseApiResponse = /** status 200 Exercise updated */ TrainingExerciseResponse;
export type UpdateExerciseApiArg = {
  /** Exercise id */
  id: string;
  /** Exercise update request */
  trainingExerciseUpdateRequest: TrainingExerciseUpdateRequest;
};
export type UpdateDashboardSetupApiResponse = /** status 200 Business updated */ BusinessResponse;
export type UpdateDashboardSetupApiArg = {
  /** Dashboard setup update request */
  dashboardSetupUpdateRequest: DashboardSetupUpdateRequest;
};
export type GetNutritionRecipeImpactApiResponse = /** status 200 Impact */ RecipeImpactResponse;
export type GetNutritionRecipeImpactApiArg = {
  id: string;
};
export type DuplicateNutritionPlanApiResponse = /** status 201 Nutrition plan duplicated */ NutritionPlanResponse;
export type DuplicateNutritionPlanApiArg = {
  /** Nutrition plan id */
  id: string;
};
export type CopyNutritionRecipeApiResponse = /** status 201 Recipe */ RecipeResponse;
export type CopyNutritionRecipeApiArg = {
  id: string;
};
export type GetLandingPageApiResponse = /** status 200 Landing page */ LandingPageResponse;
export type GetLandingPageApiArg = void;
export type SaveLandingPageApiResponse = /** status 200 Landing page saved */ LandingPageResponse;
export type SaveLandingPageApiArg = {
  /** Landing page upsert request */
  landingPageUpsertRequest: LandingPageUpsertRequest;
};
export type CheckoutBillingApiResponse = /** status 200 Checkout result */ BillingCheckoutResponse;
export type CheckoutBillingApiArg = {
  /** Checkout request */
  billingCheckoutRequest: BillingCheckoutRequest;
};
export type ListFormSubmissionsApiResponse = /** status 200 Form submissions */ ClientProfileFormSubmissionListResponse;
export type ListFormSubmissionsApiArg = {
  /** Form assignment id */
  id: string;
};
export type DeleteFormTemplateApiResponse = unknown;
export type DeleteFormTemplateApiArg = {
  /** Form template id */
  id: string;
};
export type GetFormTemplateApiResponse = /** status 200 Form template */ ClientProfileFormTemplateResponse;
export type GetFormTemplateApiArg = {
  /** Form template id */
  id: string;
};
export type UpdateFormTemplateApiResponse = /** status 200 Form template updated */ ClientProfileFormTemplateResponse;
export type UpdateFormTemplateApiArg = {
  /** Form template id */
  id: string;
  /** Form template update request */
  clientProfileFormTemplateUpdateRequest: ClientProfileFormTemplateUpdateRequest;
};
export type TrainerAcceptInviteVerifyApiResponse = /** status 200 Auth token */ AuthTokenResponse;
export type TrainerAcceptInviteVerifyApiArg = {
  /** Trainer accept invite verification request */
  trainerAcceptInviteVerifyRequest: TrainerAcceptInviteVerifyRequest;
};
export type SignupApiResponse = /** status 201 Signup */ SignupResponse;
export type SignupApiArg = {
  /** Signup request */
  signupRequest: SignupRequest;
};
export type ListCoachMealLogsApiResponse = /** status 200 Meal logs */ MealLogListResponse;
export type ListCoachMealLogsApiArg = {
  /** Client id */
  clientId: string;
  /** Exact date */
  date?: string;
  /** Start date */
  from?: string;
  /** End date */
  to?: string;
};
export type ListRecipesApiResponse = /** status 200 Recipes */ RecipeListResponse;
export type ListRecipesApiArg = {
  /** Number of recipes to skip */
  offset?: number;
  /** Maximum recipes to return */
  limit?: number;
  /** Case-insensitive recipe search */
  search?: string;
};
export type CreateRecipeApiResponse = /** status 201 Recipe created */ RecipeResponse;
export type CreateRecipeApiArg = {
  /** Recipe request */
  recipeRequest: RecipeRequest;
};
export type DeleteFoodApiResponse = unknown;
export type DeleteFoodApiArg = {
  /** Food id */
  id: string;
};
export type GetFoodApiResponse = /** status 200 Food */ FoodResponse;
export type GetFoodApiArg = {
  /** Food id */
  id: string;
};
export type UpdateFoodApiResponse = /** status 200 Food updated */ FoodResponse;
export type UpdateFoodApiArg = {
  /** Food id */
  id: string;
  /** Food update request */
  foodUpdateRequest: FoodUpdateRequest;
};
export type SendOtpApiResponse = /** status 200 OTP sent */ MessageResponse;
export type SendOtpApiArg = {
  /** OTP request */
  otpRequest: OtpRequest;
};
export type ListFoodsApiResponse = /** status 200 Foods */ FoodListResponse;
export type ListFoodsApiArg = {
  /** Number of foods to skip */
  offset?: number;
  /** Maximum foods to return */
  limit?: number;
  /** Case-insensitive food name search */
  search?: string;
};
export type CreateFoodApiResponse = /** status 201 Food created */ FoodResponse;
export type CreateFoodApiArg = {
  /** Food create request */
  foodRequest: FoodRequest;
};
export type ListEquipmentApiResponse = /** status 200 Equipment */ TrainingEquipmentListResponse;
export type ListEquipmentApiArg = {
  /** Case-insensitive equipment name search */
  search?: string;
};
export type DeleteRecipeApiResponse = unknown;
export type DeleteRecipeApiArg = {
  /** Recipe id */
  id: string;
};
export type GetRecipeApiResponse = /** status 200 Recipe */ RecipeResponse;
export type GetRecipeApiArg = {
  /** Recipe id */
  id: string;
};
export type UpdateRecipeApiResponse = /** status 200 Recipe updated */ RecipeResponse;
export type UpdateRecipeApiArg = {
  /** Recipe id */
  id: string;
  /** Recipe request */
  recipeRequest: RecipeRequest;
};
export type HealthCheckApiResponse = /** status 200 Health */ HealthResponse;
export type HealthCheckApiArg = void;
export type TrainingPlanClient = {
  first_name: string;
  id: string;
  last_name: string;
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
export type TrainingPlan = {
  client: TrainingPlanClient | null;
  client_id: string | null;
  creator_id: string;
  description: string | null;
  end_date: string | null;
  id: string;
  inserted_at: string;
  name: string;
  plan_items: TrainingPlanItem[];
  source_template_id: string | null;
  start_date: string | null;
  status: 'active' | 'archived';
  updated_at: string;
  workouts: TrainingPlanWorkout[];
};
export type TrainingPlanListResponse = {
  count: number;
  data: TrainingPlan[];
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
export type TrainingPlanResponse = {
  data: TrainingPlan;
};
export type TrainingPlanCreateRequest = {
  description?: string | null;
  end_date?: string | null;
  name: string;
  start_date?: string | null;
  status?: ('active' | 'archived') | null;
};
export type TrainingScheduleEntry = {
  day_of_week?: string;
  id?: string;
  training_workout_id?: string | null;
  workout_name?: string | null;
};
export type TrainingScheduleDayResponse = {
  data?: TrainingScheduleEntry | null;
};
export type TrainingDayScheduleRequest = {
  training_workout_id?: string | null;
};
export type Client = {
  assigned_coach_id?: string | null;
  email: string | null;
  expiring_soon: boolean;
  first_name: string | null;
  goal_weight_unit: ('kg' | 'lbs') | null;
  goal_weight_value: number | null;
  id: string;
  inactive_reason: ('manual' | 'subscription_expired' | 'awaiting_seat') | null;
  inserted_at: string;
  intake_incomplete: boolean;
  invitation_expires_at: string | null;
  invitation_sent_at: string | null;
  invite_url: string | null;
  last_name: string | null;
  needs_plan: boolean;
  notes: string | null;
  phone: string | null;
  stage: 'onboarding' | 'coaching';
  status: 'active' | 'pending' | 'inactive';
  subscription_ends_on: string | null;
  subscription_started_on: string | null;
  updated_at: string;
};
export type ClientResponse = {
  data: Client;
};
export type BillingEvent = {
  /** INR (rupees) */
  amount_paid?: number | null;
  currency?: string | null;
  id: string;
  kind:
    | 'seats_added'
    | 'seats_removed'
    | 'payment_succeeded'
    | 'payment_failed'
    | 'cancellation_scheduled'
    | 'subscription_cancelled';
  occurred_at: string;
  seat_delta?: number | null;
};
export type BillingSummary = {
  available_seats: number;
  awaiting_seat_count: number;
  current_period_end: string | null;
  free_seats: number;
  is_owner: boolean;
  monthly_seat_price_inr: number;
  paid_seats: number;
  recent_events?: BillingEvent[] | null;
  seat_limit: number;
  status: 'free' | 'active' | 'past_due' | 'cancel_at_period_end' | 'cancelled';
  /** active clients + pending invites */
  used_seats: number;
};
export type SeatLimitError = {
  error_code: string;
  error_detail?: {
    [key: string]: any;
  };
  error_message: string;
  seat_summary: BillingSummary;
  [key: string]: any;
};
export type ClientUpdateRequest = {
  email?: string | null;
  first_name?: string | null;
  goal_weight_unit?: ('kg' | 'lbs') | null;
  goal_weight_value?: number | null;
  last_name?: string | null;
  notes?: string | null;
  phone?: string | null;
  stage?: ('onboarding' | 'coaching') | null;
  status?: 'active' | 'inactive';
  subscription_ends_on?: string | null;
  subscription_started_on?: string | null;
};
export type CoachingClientProfile = {
  business_id: string;
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
export type CoachingClientProfileResponse = {
  data: CoachingClientProfile;
};
export type CoachingClientProfileRequest = {
  general?: {
    [key: string]: any;
  };
  intake_completed_at?: string | null;
  intake_status?: 'assigned' | 'in_progress' | 'completed' | 'dismissed';
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
export type ProspectClient = {
  first_name?: string | null;
  id: string;
  last_name?: string | null;
  status: string;
};
export type ProspectProgram = {
  id: string;
  name: string;
};
export type Prospect = {
  answers: {
    [key: string]: any;
  };
  client?: ProspectClient | null;
  email?: string | null;
  id: string;
  inserted_at?: string;
  instagram?: string | null;
  landing_page_slug?: string | null;
  name: string;
  notes?: string | null;
  phone?: string | null;
  program?: ProspectProgram | null;
  status: 'new' | 'reviewing' | 'won' | 'lost';
  updated_at?: string;
};
export type ProspectEnrollResponse = {
  data: {
    already_enrolled: boolean;
    prospect: Prospect;
  };
};
export type ProspectEnrollRequest = {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
};
export type NutritionWeekdayAssignmentResponse = {
  data?: {
    [key: string]: any;
  };
};
export type NutritionWeekdayAssignRequest = {
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  nutrition_plan_day_id: string;
};
export type CoachProfileBusiness = {
  dashboard_setup_hidden_at: string | null;
  dashboard_setup_hidden_reason: ('dismissed' | 'completed') | null;
  id: string;
  name: string;
  slug: string;
  whatsapp_number: string | null;
};
export type CoachProfile = {
  business: CoachProfileBusiness;
  email: string;
  first_name: string | null;
  id: string;
  is_owner: boolean;
  last_name: string | null;
  phone: string | null;
};
export type CoachProfileResponse = {
  data: CoachProfile;
};
export type CoachProfileUpdateRequest = {
  business_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
};
export type TeamMember = {
  email: string | null;
  first_name: string | null;
  id: string;
  invitation_sent_at: string | null;
  is_owner: boolean;
  last_name: string | null;
  status: 'invited' | 'active' | 'inactive';
};
export type TeamMemberResponse = {
  data: TeamMember;
};
export type TrainerInviteRequest = {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
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
export type TrainingSessionResponse = {
  data: TrainingSession;
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
export type ClientTrainingPlanListResponse = {
  count: number;
  data: ClientTrainingPlan[];
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
export type InvitationPreviewResponse = {
  data: {
    business_name?: string | null;
    coach_first_name?: string | null;
    expires_at?: string | null;
    prefill_email?: string | null;
    state: 'pending' | 'used' | 'expired' | 'invalid';
  };
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
export type NutritionPlan = {
  client?: {
    [key: string]: any;
  } | null;
  client_id?: string | null;
  creator_id?: string | null;
  days?: {
    [key: string]: any;
  }[];
  description: string | null;
  end_date: string | null;
  id: string;
  inserted_at: string;
  meals?: NutritionMeal[];
  name: string;
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
  weekday_assignments?: {
    [key: string]: any;
  };
};
export type NutritionPlanListResponse = {
  count: number;
  data: NutritionPlan[];
};
export type NutritionPlanResponse = {
  data: NutritionPlan;
};
export type NutritionPlanRequest = {
  description?: string | null;
  end_date?: string | null;
  name: string;
  start_date?: string | null;
  status?: 'active' | 'archived';
  tags?: string[];
  target_calories?: number | null;
  target_carbs_g?: number | null;
  target_fat_g?: number | null;
  target_fiber_g?: number | null;
  target_protein_g?: number | null;
};
export type ClientProfileField = {
  archived_at: string | null;
  field_type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multi_select';
  filterable: boolean;
  id: string;
  inserted_at: string;
  key: string;
  label: string;
  options: string[];
  section: 'general' | 'nutrition' | 'training' | 'lifestyle';
  updated_at: string;
};
export type ClientProfileFieldListResponse = {
  data: ClientProfileField[];
};
export type ClientProfileFieldResponse = {
  data: ClientProfileField;
};
export type ClientProfileFieldRequest = {
  field_type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multi_select';
  filterable?: boolean;
  key: string;
  label: string;
  options?: string[];
  section: 'general' | 'nutrition' | 'training' | 'lifestyle';
};
export type Business = {
  about: string | null;
  dashboard_setup_hidden_at: string | null;
  dashboard_setup_hidden_reason: ('dismissed' | 'completed') | null;
  handle: string;
  id: string;
  inserted_at: string;
  name: string;
  updated_at: string;
};
export type BusinessResponse = {
  data: Business;
};
export type BusinessUpdateRequest = {
  about?: string | null;
  handle?: string;
  name?: string;
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
  eyebrow?: string | null;
  fit_points?: string[];
  headline: string;
  hero_image_url?: string | null;
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
export type NutritionMealItemResponse = {
  data: NutritionMealItem;
};
export type NutritionMealItemRequest = {
  amount?: number | null;
  food_id?: string | null;
  position?: number;
  recipe_id?: string | null;
  unit?: string | null;
  weight_g?: number | null;
};
export type Conversation = {
  client_id: string;
  client_name?: string | null;
  id: string;
  inserted_at: string;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  unread_count: number;
  updated_at: string;
};
export type ConversationListResponse = {
  count: number;
  data: Conversation[];
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
export type ProspectListResponse = {
  count: number;
  data: Prospect[];
  summary: {
    lost?: number;
    new?: number;
    reviewing?: number;
    won?: number;
  };
};
export type ConversationResponse = {
  data: Conversation;
};
export type NutritionDayMealResponse = {
  data?: {
    [key: string]: any;
  };
};
export type NutritionSlotOptionCreateRequest = {
  meal_slot: 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'evening_snack';
  nutrition_meal_id: string;
};
export type NutritionPlanDayResponse = {
  data?: {
    day_meals?: {
      [key: string]: any;
    }[];
    id?: string;
    name?: string;
    position?: number;
  };
};
export type NutritionPlanDayCreateRequest = {
  name?: string | null;
};
export type MessageResponse = {
  message: string;
};
export type AcceptInviteRequest = {
  email: string;
  invitation_token: string;
};
export type BillingResponse = {
  data: BillingSummary;
};
export type TrainingScheduleResponse = {
  data?: {
    [key: string]: TrainingScheduleEntry;
  };
};
export type ClientProfileFormAssignmentResponse = {
  data: ClientProfileFormAssignment;
};
export type ClientProfileFormAssignmentAssignRequest = {
  client_id: string;
  due_date?: string | null;
  priority?: 'high' | 'normal';
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
export type FoodResponse = {
  data: Food;
};
export type TrainingWorkoutListResponse = {
  count: number;
  data: TrainingPlanWorkout[];
};
export type TrainingWorkoutResponse = {
  data: TrainingPlanWorkout;
};
export type TrainingWorkoutRequest = {
  name: string;
  notes?: string | null;
};
export type ClientProfileFormAssignmentUpdateRequest = {
  due_date?: string | null;
  priority?: 'high' | 'normal';
  status?: 'assigned' | 'in_progress' | 'completed' | 'dismissed';
};
export type NutritionPlanDayUpdateRequest = {
  name: string;
};
export type NutritionMealListResponse = {
  count: number;
  data: NutritionMeal[];
};
export type NutritionMealResponse = {
  data: NutritionMeal;
};
export type NutritionMealRequest = {
  default_meal_slot?: ('breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'evening_snack') | null;
  name: string;
  notes?: string | null;
};
export type ReassignClientRequest = {
  coach_id: string;
};
export type FoodImpactResponse = {
  data?: {
    active_client_plans?: {
      client_id?: string | null;
      id?: string;
      name?: string;
    }[];
    templates?: {
      client_id?: string | null;
      id?: string;
      name?: string;
    }[];
  };
};
export type ChatMessage = {
  body: string;
  conversation_id: string;
  id: string;
  inserted_at: string;
  sender_id: string;
  sender_type: 'coach' | 'client';
};
export type ChatMessagesResponse = {
  /** Ascending by inserted_at */
  data: ChatMessage[];
  has_more: boolean;
};
export type ChatMessageResponse = {
  data: ChatMessage;
};
export type ChatMessageCreateRequest = {
  body: string;
};
export type TrainerAcceptInviteRequest = {
  email: string;
  invitation_token: string;
};
export type NutritionPlanAssignRequest = {
  client_id: string;
  end_date?: string | null;
  start_date?: string | null;
};
export type ClientInviteRequest = {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  notes?: string | null;
  phone?: string | null;
};
export type TrainingWorkoutExerciseResponse = {
  data: TrainingPlanWorkoutExercise;
};
export type TrainingWorkoutExerciseRequest = {
  exercise_id?: string;
  notes?: string | null;
  planned_sets?: TrainingPlanPlannedSet[];
  position?: number;
  superset_group_id?: string | null;
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
export type ClientProfileFieldUpdateRequest = {
  field_type?: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multi_select';
  filterable?: boolean;
  key?: string;
  label?: string;
  options?: string[];
  section?: 'general' | 'nutrition' | 'training' | 'lifestyle';
};
export type TrainingWorkoutExerciseArrayResponse = {
  data?: TrainingPlanWorkoutExercise[];
};
export type TrainingWorkoutReorderRequest = {
  /** Workout element ids in the desired order (must be exactly the workout's elements). */
  element_ids: string[];
};
export type ProspectResponse = {
  data: Prospect;
};
export type ProspectUpdateRequest = {
  notes?: string | null;
  status: 'new' | 'reviewing' | 'won' | 'lost';
};
export type BusinessRequest = {
  about?: string | null;
  handle: string;
  name: string;
};
export type TrainingMuscle = {
  description: string | null;
  id: string;
  name: string;
};
export type TrainingMuscleListResponse = {
  data: TrainingMuscle[];
};
export type TrainingWorkoutUpdateRequest = {
  name?: string;
  notes?: string | null;
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
export type TeamResponse = {
  data: TeamMember[];
};
export type TrainingPlanAssignRequest = {
  client_id: string;
  end_date?: string | null;
  start_date?: string | null;
};
export type TrainerInvitationPreviewResponse = {
  data: {
    business_name: string;
    email?: string | null;
    first_name?: string | null;
  };
};
export type ClientProfileFormTemplateListResponse = {
  data: ClientProfileFormTemplate[];
};
export type ClientProfileFormTemplateResponse = {
  data: ClientProfileFormTemplate;
};
export type ClientProfileFormTemplateRequest = {
  name: string;
  purpose: 'intake' | 'weekly_check_in' | 'nutrition_update' | 'training_update' | 'custom';
  sections: {
    [key: string]: any;
  }[];
  status?: 'active' | 'archived';
};
export type ClientSummary = {
  active: number;
  inactive: number;
  pending: number;
};
export type ClientListResponse = {
  count: number;
  data: Client[];
  summary: ClientSummary;
};
export type TrainingPlanUpdateRequest = {
  description?: string | null;
  end_date?: string | null;
  name?: string;
  start_date?: string | null;
  status?: ('active' | 'archived') | null;
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
export type TrainingExerciseCopyRequest = {
  name: string;
};
export type TrainingExerciseListResponse = {
  count: number;
  data: TrainingExercise[];
};
export type TrainingExerciseCreateRequest = {
  description?: string | null;
  equipment_ids?: string[];
  force?: ('push' | 'pull' | 'static') | null;
  images?: string[];
  instructions?: string | null;
  mechanics?: ('compound' | 'isolation' | 'isometric') | null;
  muscle_ids?: string[];
  name: string;
};
export type AcceptInviteVerifyRequest = {
  email: string;
  invitation_token: string;
  otp: string;
};
export type TrainingExerciseUpdateRequest = {
  description?: string | null;
  equipment_ids?: string[];
  force?: ('push' | 'pull' | 'static') | null;
  images?: string[];
  instructions?: string | null;
  mechanics?: ('compound' | 'isolation' | 'isometric') | null;
  muscle_ids?: string[];
  name?: string;
};
export type DashboardSetupUpdateRequest = {
  dashboard_setup_hidden_reason: ('dismissed' | 'completed') | null;
};
export type RecipeImpactResponse = {
  data?: {
    active_client_plans?: {
      client_id?: string | null;
      id?: string;
      name?: string;
    }[];
    templates?: {
      client_id?: string | null;
      id?: string;
      name?: string;
    }[];
  };
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
export type RecipeResponse = {
  data: Recipe;
};
export type LandingPage = {
  application_questions?: {
    id?: string;
    label?: string;
    options?: string[];
    type?: 'short_text' | 'long_text' | 'single_select';
  }[];
  coach_intro?: string | null;
  eyebrow?: string | null;
  fit_points?: string[];
  headline: string;
  hero_image_url?: string | null;
  id: string;
  inserted_at?: string;
  programs: LandingProgram[];
  proof_points?: {
    label?: string;
    value?: string;
  }[];
  slug: string;
  status: 'draft' | 'published';
  subheadline?: string | null;
  template: 'proof_first' | 'problem_fit' | 'coach_story';
  updated_at?: string;
};
export type LandingPageResponse = {
  data: LandingPage | null;
};
export type LandingProgramInput = {
  audience?: string | null;
  description?: string | null;
  name: string;
  price_display?: string | null;
  promise?: string | null;
};
export type LandingPageUpsertRequest = {
  application_questions?: {
    id?: string;
    label?: string;
    options?: string[];
    type?: 'short_text' | 'long_text' | 'single_select';
  }[];
  coach_intro?: string | null;
  eyebrow?: string | null;
  fit_points?: string[];
  headline: string;
  hero_image_url?: string | null;
  programs?: LandingProgramInput[];
  proof_points?: {
    label?: string;
    value?: string;
  }[];
  slug: string;
  status: 'draft' | 'published';
  subheadline?: string | null;
  template: 'proof_first' | 'problem_fit' | 'coach_story';
};
export type BillingCheckoutPayload = {
  key_id: string;
  subscription_id: string;
};
export type BillingCheckoutResult = {
  action: 'checkout' | 'updated';
  billing: BillingSummary;
  checkout: BillingCheckoutPayload | null;
};
export type BillingCheckoutResponse = {
  data: BillingCheckoutResult;
};
export type BillingCheckoutRequest = {
  seats_to_add: number;
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
export type ClientProfileFormSubmissionListResponse = {
  data: ClientProfileFormSubmission[];
};
export type ClientProfileFormTemplateUpdateRequest = {
  name?: string;
  purpose?: 'intake' | 'weekly_check_in' | 'nutrition_update' | 'training_update' | 'custom';
  sections?: {
    [key: string]: any;
  }[];
  status?: 'active' | 'archived';
};
export type TrainerAcceptInviteVerifyRequest = {
  email: string;
  invitation_token: string;
  otp: string;
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
export type RecipeListResponse = {
  count: number;
  data: Recipe[];
};
export type RecipeIngredientRequest = {
  amount?: number | null;
  food_id: string;
  position?: number;
  unit?: string | null;
  weight_g?: number | null;
};
export type RecipeRequest = {
  allergens?: ('dairy' | 'egg' | 'fish' | 'shellfish' | 'tree_nuts' | 'peanuts' | 'wheat' | 'soy' | 'sesame')[];
  cooked_weight_g?: number | null;
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
  instructions?: string | null;
  name: string;
  recipe_ingredients?: RecipeIngredientRequest[];
  serving_sizes?: FoodServingSize[];
  servings_count?: number | null;
};
export type FoodUpdateRequest = {
  allergens?: ('dairy' | 'egg' | 'fish' | 'shellfish' | 'tree_nuts' | 'peanuts' | 'wheat' | 'soy' | 'sesame')[];
  barcode?: string | null;
  brand?: string | null;
  calories_per_100g?: number | null;
  carbs_g_per_100g?: number | null;
  category?: string | null;
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
  image_url?: string | null;
  name?: string;
  notes?: string | null;
  protein_g_per_100g?: number | null;
  serving_sizes?: FoodServingSize[];
  source?: ('system' | 'imported' | 'custom') | null;
};
export type OtpRequest = {
  email: string;
  type: 'email_confirmation' | 'authentication';
};
export type FoodListResponse = {
  count: number;
  data: Food[];
};
export type FoodRequest = {
  allergens?: ('dairy' | 'egg' | 'fish' | 'shellfish' | 'tree_nuts' | 'peanuts' | 'wheat' | 'soy' | 'sesame')[];
  barcode?: string | null;
  brand?: string | null;
  calories_per_100g?: number | null;
  carbs_g_per_100g?: number | null;
  category?: string | null;
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
  image_url?: string | null;
  name: string;
  notes?: string | null;
  protein_g_per_100g?: number | null;
  serving_sizes?: FoodServingSize[];
  source?: ('system' | 'imported' | 'custom') | null;
};
export type TrainingEquipment = {
  description: string | null;
  id: string;
  name: string;
};
export type TrainingEquipmentListResponse = {
  data: TrainingEquipment[];
};
export type HealthResponse = {
  service: string;
  status: string;
  timestamp: string;
  version: string;
};
export const {
  useListTrainingPlansQuery,
  useLazyListTrainingPlansQuery,
  useCreateTrainingPlanMutation,
  useSetTrainingPlanDayScheduleMutation,
  useDeleteClientMutation,
  useGetClientQuery,
  useLazyGetClientQuery,
  useUpdateClientMutation,
  useGetCoachingClientProfileQuery,
  useLazyGetCoachingClientProfileQuery,
  useUpdateCoachingClientProfileMutation,
  useEnrollProspectMutation,
  useAssignNutritionPlanWeekdayMutation,
  useGetCoachProfileQuery,
  useLazyGetCoachProfileQuery,
  useUpdateCoachProfileMutation,
  useResendClientInviteMutation,
  useInviteTrainerMutation,
  useListCoachClientTrainingSessionsQuery,
  useLazyListCoachClientTrainingSessionsQuery,
  useSubmitApplicationMutation,
  useGetCoachClientTrainingSessionQuery,
  useLazyGetCoachClientTrainingSessionQuery,
  useDeactivateTrainerMutation,
  useListCoachClientTrainingPlansQuery,
  useLazyListCoachClientTrainingPlansQuery,
  useListClientFormAssignmentsForCoachQuery,
  useLazyListClientFormAssignmentsForCoachQuery,
  useResendTrainerInviteMutation,
  useShowInvitationQuery,
  useLazyShowInvitationQuery,
  useListNutritionPlansQuery,
  useLazyListNutritionPlansQuery,
  useCreateNutritionPlanMutation,
  useListProfileFieldsQuery,
  useLazyListProfileFieldsQuery,
  useCreateProfileFieldMutation,
  useGetCurrentBusinessQuery,
  useLazyGetCurrentBusinessQuery,
  useUpdateCurrentBusinessMutation,
  useGetPublicLandingPageQuery,
  useLazyGetPublicLandingPageQuery,
  useCreateMealItemMutation,
  useListCoachConversationsQuery,
  useLazyListCoachConversationsQuery,
  useCreateAuthTokenMutation,
  useListProspectsQuery,
  useLazyListProspectsQuery,
  useGetCoachConversationQuery,
  useLazyGetCoachConversationQuery,
  useAddNutritionSlotOptionMutation,
  useGetCoachClientConversationQuery,
  useLazyGetCoachClientConversationQuery,
  useCreateNutritionPlanDayMutation,
  useAcceptInviteMutation,
  useCancelBillingMutation,
  useGetTrainingPlanScheduleQuery,
  useLazyGetTrainingPlanScheduleQuery,
  useAssignFormTemplateMutation,
  useMakeNutritionSlotOptionDefaultMutation,
  useCopyNutritionFoodMutation,
  useListWorkoutsQuery,
  useLazyListWorkoutsQuery,
  useCreateWorkoutMutation,
  useUpdateFormAssignmentMutation,
  useDeleteNutritionPlanDayMutation,
  useUpdateNutritionPlanDayMutation,
  useDuplicateTrainingPlanMutation,
  useListMealsQuery,
  useLazyListMealsQuery,
  useCreateMealMutation,
  useReassignClientMutation,
  useGetNutritionFoodImpactQuery,
  useLazyGetNutritionFoodImpactQuery,
  useListCoachConversationMessagesQuery,
  useLazyListCoachConversationMessagesQuery,
  useCreateCoachConversationMessageMutation,
  useTrainerAcceptInviteMutation,
  useAssignNutritionPlanMutation,
  useSyncBillingMutation,
  useMarkCoachConversationReadMutation,
  useGetBillingQuery,
  useLazyGetBillingQuery,
  useInviteClientMutation,
  useCreateWorkoutElementMutation,
  useVerifyAuthMutation,
  useDeleteProfileFieldMutation,
  useUpdateProfileFieldMutation,
  useDeleteNutritionPlanMutation,
  useGetNutritionPlanQuery,
  useLazyGetNutritionPlanQuery,
  useUpdateNutritionPlanMutation,
  useReorderWorkoutElementsMutation,
  useListCoachClientNutritionPlansQuery,
  useLazyListCoachClientNutritionPlansQuery,
  useGetProspectQuery,
  useLazyGetProspectQuery,
  useUpdateProspectMutation,
  useCreateBusinessMutation,
  useListMusclesQuery,
  useLazyListMusclesQuery,
  useRevokeTrainerInviteMutation,
  useDeleteMealMutation,
  useGetMealQuery,
  useLazyGetMealQuery,
  useUpdateMealMutation,
  useDeleteWorkoutMutation,
  useGetWorkoutQuery,
  useLazyGetWorkoutQuery,
  useUpdateWorkoutMutation,
  useListClientWeightEntriesQuery,
  useLazyListClientWeightEntriesQuery,
  useGetTeamQuery,
  useLazyGetTeamQuery,
  useAssignTrainingPlanMutation,
  useRemoveNutritionSlotOptionMutation,
  useShowTrainerInvitationQuery,
  useLazyShowTrainerInvitationQuery,
  useListFormTemplatesQuery,
  useLazyListFormTemplatesQuery,
  useCreateFormTemplateMutation,
  useDeleteWorkoutElementMutation,
  useUpdateWorkoutElementMutation,
  useListClientsQuery,
  useLazyListClientsQuery,
  useDeleteTrainingPlanMutation,
  useGetTrainingPlanQuery,
  useLazyGetTrainingPlanQuery,
  useUpdateTrainingPlanMutation,
  useCopyExerciseMutation,
  useListCoachExercisesQuery,
  useLazyListCoachExercisesQuery,
  useCreateExerciseMutation,
  useVerifyInvitationMutation,
  useDeleteMealItemMutation,
  useUpdateMealItemMutation,
  useDeleteExerciseMutation,
  useGetExerciseQuery,
  useLazyGetExerciseQuery,
  useUpdateExerciseMutation,
  useUpdateDashboardSetupMutation,
  useGetNutritionRecipeImpactQuery,
  useLazyGetNutritionRecipeImpactQuery,
  useDuplicateNutritionPlanMutation,
  useCopyNutritionRecipeMutation,
  useGetLandingPageQuery,
  useLazyGetLandingPageQuery,
  useSaveLandingPageMutation,
  useCheckoutBillingMutation,
  useListFormSubmissionsQuery,
  useLazyListFormSubmissionsQuery,
  useDeleteFormTemplateMutation,
  useGetFormTemplateQuery,
  useLazyGetFormTemplateQuery,
  useUpdateFormTemplateMutation,
  useTrainerAcceptInviteVerifyMutation,
  useSignupMutation,
  useListCoachMealLogsQuery,
  useLazyListCoachMealLogsQuery,
  useListRecipesQuery,
  useLazyListRecipesQuery,
  useCreateRecipeMutation,
  useDeleteFoodMutation,
  useGetFoodQuery,
  useLazyGetFoodQuery,
  useUpdateFoodMutation,
  useSendOtpMutation,
  useListFoodsQuery,
  useLazyListFoodsQuery,
  useCreateFoodMutation,
  useListEquipmentQuery,
  useLazyListEquipmentQuery,
  useDeleteRecipeMutation,
  useGetRecipeQuery,
  useLazyGetRecipeQuery,
  useUpdateRecipeMutation,
  useHealthCheckQuery,
  useLazyHealthCheckQuery,
} = injectedRtkApi;
