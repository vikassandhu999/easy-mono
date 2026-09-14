defmodule EasyWeb.Router do
  use EasyWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
    plug OpenApiSpex.Plug.PutApiSpec, module: EasyWeb.ApiSpec
  end

  pipeline :require_user do
    plug :accepts, ["json"]
    plug OpenApiSpex.Plug.PutApiSpec, module: EasyWeb.ApiSpec
    plug EasyWeb.Plugs.Authenticate
  end

  pipeline :require_coach do
    plug :accepts, ["json"]
    plug OpenApiSpex.Plug.PutApiSpec, module: EasyWeb.ApiSpec
    plug EasyWeb.Plugs.Authenticate
    plug EasyWeb.Plugs.EnsureRole, role: :coach
  end

  pipeline :require_client do
    plug :accepts, ["json"]
    plug OpenApiSpex.Plug.PutApiSpec, module: EasyWeb.ApiSpec
    plug EasyWeb.Plugs.Authenticate
    plug EasyWeb.Plugs.EnsureRole, role: :client
    plug EasyWeb.Plugs.EnsureActiveClient
  end

  scope "/api", EasyWeb do
    pipe_through :api

    get "/health", HealthController, :index
  end

  scope "/api" do
    pipe_through :api

    get "/openapi", OpenApiSpex.Plug.RenderSpec, []
  end

  scope "/", EasyWeb do
    get "/ready", HealthController, :ready
  end

  scope "/" do
    get "/swaggerui", OpenApiSpex.Plug.SwaggerUI, path: "/api/openapi"
  end

  scope "/v1/auth", EasyWeb do
    pipe_through :api

    post "/signup", AuthController, :signup
    get "/invitations/:token", AuthController, :show_invitation
    post "/accept-invite", AuthController, :accept_invite
    post "/accept-invite/verify", AuthController, :accept_invite_verify
    post "/otp", AuthController, :otp
    post "/verify", AuthController, :verify
    post "/token", AuthController, :token

    get "/trainer-invitations/:token", AuthController, :show_trainer_invitation
    post "/trainer-accept-invite", AuthController, :trainer_accept_invite
    post "/trainer-accept-invite/verify", AuthController, :trainer_accept_invite_verify
  end

  # Unauthenticated public landing funnel: anonymous prospects render a coach's published
  # page and submit applications. No auth pipeline by design.
  scope "/v1/public", EasyWeb.Public do
    pipe_through :api

    get "/landing-pages/:slug", LandingPageController, :show
    post "/landing-pages/:slug/applications", LandingPageController, :apply
  end

  # Unauthenticated Razorpay webhook: verified by HMAC signature over the raw body, not auth.
  scope "/v1/webhooks", EasyWeb do
    pipe_through :api

    post "/razorpay", WebhookController, :razorpay
  end

  scope "/v1/businesses", EasyWeb do
    pipe_through :require_user
    post "/", BusinessController, :create

    pipe_through :require_coach
    get "/me", BusinessController, :show
    get "/timezones", BusinessController, :timezones
    patch "/me", BusinessController, :update
    patch "/me/dashboard-setup", BusinessController, :update_dashboard_setup
  end

  scope "/v1/coach", EasyWeb.Coaches do
    pipe_through :require_coach

    get "/me", ProfileController, :show
    patch "/me", ProfileController, :update

    get "/billing", BillingController, :show
    post "/billing/checkout", BillingController, :checkout
    post "/billing/cancel", BillingController, :cancel
    post "/billing/sync", BillingController, :sync

    # Landing funnel
    get "/landing-page", LandingPageController, :show
    put "/landing-page", LandingPageController, :update
    get "/prospects", ProspectController, :index
    get "/prospects/:id", ProspectController, :show
    patch "/prospects/:id", ProspectController, :update
    post "/prospects/:id/enroll", ProspectController, :enroll

    get "/workbench", WorkbenchController, :index
    get "/workbench/queues/onboarding", WorkbenchController, :onboarding
    get "/workbench/queues/programming", WorkbenchController, :programming
    get "/workbench/queues/expiring", WorkbenchController, :expiring
    get "/workbench/queues/quiet", WorkbenchController, :quiet
    get "/workbench/queues/check-ins", WorkbenchController, :check_ins
    get "/workbench/queues/replies", WorkbenchController, :replies
    put "/clients/:id/queue-snooze", WorkbenchController, :snooze

    post "/clients/invite", ClientController, :invite
    post "/clients/:id/resend-invite", ClientController, :resend_invite
    get "/clients/:id", ClientController, :show
    patch "/clients/:id", ClientController, :update
    delete "/clients/:id", ClientController, :delete
    get "/clients", ClientController, :index
    post "/clients/:id/reassign", ClientController, :reassign
    post "/clients/:client_id/uploads", UploadController, :create
    post "/attachments/download-urls", UploadController, :download_urls
    post "/library-media/uploads", LibraryMediaController, :create

    get "/team", TeamController, :index
    get "/team/:id", TeamController, :show
    post "/team/invite", TeamController, :invite
    post "/team/:id/resend-invite", TeamController, :resend_invite
    delete "/team/:id", TeamController, :revoke_invite
    post "/team/:id/deactivate", TeamController, :deactivate
    post "/team/:id/reactivate", TeamController, :reactivate

    get "/form-templates", FormTemplateController, :index
    get "/form-templates/default-intake", FormTemplateController, :default_intake
    post "/form-templates", FormTemplateController, :create
    get "/form-templates/:id", FormTemplateController, :show
    get "/form-templates/:id/management", FormTemplateController, :management
    patch "/form-templates/:id", FormTemplateController, :update
    delete "/form-templates/:id", FormTemplateController, :delete
    put "/form-templates/:id/default-intake", FormTemplateController, :set_default_intake
    delete "/form-templates/:id/default-intake", FormTemplateController, :clear_default_intake
    get "/clients/:client_id/check-in-schedules", CheckInScheduleController, :index
    post "/clients/:client_id/check-in-schedules", CheckInScheduleController, :create
    patch "/check-in-schedules/:id", CheckInScheduleController, :update
    delete "/check-in-schedules/:id", CheckInScheduleController, :delete
    get "/check-ins/review-queue", CheckInReviewController, :index
    get "/check-ins/submissions", CheckInReviewController, :history
    get "/check-ins/submissions/:id", CheckInReviewController, :show
    post "/form-submissions/:id/review", CheckInReviewController, :review
    get "/clients/:client_id/intake", FormAssignmentController, :intake
    get "/clients/:client_id/form-assignments", FormAssignmentController, :index
    get "/clients/:client_id/form-submissions/:id", FormAssignmentController, :submission
    post "/clients/:client_id/form-assignments", FormAssignmentController, :create
    get "/form-assignments/:id/submissions", FormAssignmentController, :submissions
    patch "/form-assignments/:id", FormAssignmentController, :update
    post "/form-assignments/:id/remind", FormAssignmentController, :remind

    # Client-scoped plan lists
    get "/clients/:client_id/training-plans", ClientTrainingPlanController, :index
    get "/clients/:client_id/nutrition-coverage", NutritionCoverageController, :show
    get "/clients/:client_id/weight_entries", ClientWeightEntryController, :index
    get "/clients/:client_id/weight-progress", ClientWeightEntryController, :progress

    get "/nutrition-foods", FoodController, :index
    get "/nutrition-foods/categories", FoodController, :categories
    post "/nutrition-foods", FoodController, :create
    get "/nutrition-foods/:id", FoodController, :show
    patch "/nutrition-foods/:id", FoodController, :update
    delete "/nutrition-foods/:id", FoodController, :delete
    get "/nutrition-foods/:id/impact", FoodController, :impact
    get "/nutrition-foods/:id/usage", FoodController, :usage
    post "/nutrition-foods/:id/copy", FoodController, :copy

    get "/nutrition-recipes", RecipeController, :index
    post "/nutrition-recipes", RecipeController, :create
    get "/nutrition-recipes/:id", RecipeController, :show
    patch "/nutrition-recipes/:id", RecipeController, :update
    delete "/nutrition-recipes/:id", RecipeController, :delete
    get "/nutrition-recipes/:id/impact", RecipeController, :impact
    get "/nutrition-recipes/:id/usage", RecipeController, :usage
    post "/nutrition-recipes/:id/copy", RecipeController, :copy

    get "/nutrition-plans", NutritionPlanController, :index
    post "/nutrition-plans", NutritionPlanController, :create
    post "/nutrition-plans/preview-menu", NutritionPlanController, :preview_menu
    get "/nutrition-plans/:id", NutritionPlanController, :show
    patch "/nutrition-plans/:id", NutritionPlanController, :update
    delete "/nutrition-plans/:id", NutritionPlanController, :delete
    post "/nutrition-plans/:id/archive", NutritionPlanController, :archive
    post "/nutrition-plans/:id/restore", NutritionPlanController, :restore
    post "/nutrition-plans/:id/duplicate", NutritionPlanController, :duplicate
    post "/clients/:client_id/nutrition-plans/:id/assign", NutritionPlanController, :assign
    put "/nutrition-plans/:id/menu", NutritionPlanController, :replace_menu

    get "/training-exercises", ExerciseController, :index
    post "/training-exercises", ExerciseController, :create
    get "/training-exercises/:id", ExerciseController, :show
    patch "/training-exercises/:id", ExerciseController, :update
    delete "/training-exercises/:id", ExerciseController, :delete
    post "/training-exercises/:id/copy", ExerciseController, :copy

    get "/training-muscles", MuscleController, :index
    get "/training-equipment", EquipmentController, :index

    get "/training-plans", TrainingPlanController, :index
    post "/training-plans", TrainingPlanController, :create
    get "/training-plans/:id", TrainingPlanController, :show
    patch "/training-plans/:id", TrainingPlanController, :update
    put "/training-plans/:id/prescription", TrainingPlanController, :replace_prescription
    delete "/training-plans/:id", TrainingPlanController, :delete
    post "/training-plans/:id/archive", TrainingPlanController, :archive
    post "/training-plans/:id/restore", TrainingPlanController, :restore
    post "/training-plans/:id/duplicate", TrainingPlanController, :duplicate
    post "/clients/:client_id/training-plans/:id/assign", TrainingPlanController, :assign

    # Client-scoped training sessions (read-only)
    get "/clients/:client_id/training-sessions", WorkoutSessionController, :index
    get "/clients/:client_id/training-sessions/:id", WorkoutSessionController, :show

    get "/clients/:client_id/nutrition-days", NutritionDayController, :index

    # Chat
    get "/conversations", ConversationController, :index
    get "/conversation-inbox", ConversationController, :inbox
    get "/conversations/:id/history", ConversationController, :history
    get "/conversations/:id", ConversationController, :show
    get "/conversations/:id/messages", ConversationController, :messages
    post "/conversations/:id/messages", ConversationController, :create_message
    post "/conversations/:id/read", ConversationController, :mark_read
    post "/conversations/:id/mark-handled", ConversationController, :mark_handled
    get "/clients/:client_id/conversation", ConversationController, :show_for_client
  end

  scope "/v1/client", EasyWeb.Clients do
    pipe_through :require_client

    get "/me", ProfileController, :show
    patch "/me", ProfileController, :update

    post "/uploads", UploadController, :create
    post "/attachments/download-urls", UploadController, :download_urls

    get "/form-assignments", FormAssignmentController, :index
    get "/form-assignments/:id", FormAssignmentController, :show
    post "/form-assignments/:id/submit", FormAssignmentController, :submit

    # Training plans (read-only)
    get "/training-plans", TrainingPlanController, :index
    get "/training-plans/coverage", TrainingPlanController, :coverage
    get "/training-plans/:id", TrainingPlanController, :show

    # Exercises (read-only)
    get "/training-exercises", ExerciseController, :index
    get "/training-exercises/:id", ExerciseController, :show

    # Training sessions
    get "/training-sessions", WorkoutSessionController, :index
    post "/training-sessions", WorkoutSessionController, :create
    get "/training-sessions/active", WorkoutSessionController, :active
    post "/training-sessions/:id/complete", WorkoutSessionController, :complete
    post "/training-sessions/:id/discard", WorkoutSessionController, :discard
    get "/training-sessions/:id", WorkoutSessionController, :show
    patch "/training-sessions/:id", WorkoutSessionController, :update
    post "/training-sessions/:session_id/performed-sets", PerformedSetController, :create
    patch "/training-performed-sets/:id", PerformedSetController, :update
    delete "/training-performed-sets/:id", PerformedSetController, :delete

    # Nutrition plans (read-only)
    get "/nutrition-plans", NutritionPlanController, :index
    get "/nutrition-plans/:id", NutritionPlanController, :show

    # Foods (read-only)
    get "/nutrition-foods", FoodController, :index
    get "/nutrition-foods/:id", FoodController, :show

    # Recipes (read-only)
    get "/nutrition-recipes", RecipeController, :index
    get "/nutrition-recipes/:id", RecipeController, :show

    get "/nutrition-days", NutritionDayController, :index
    patch "/nutrition-days/:date", NutritionDayController, :save

    # Weight entries
    get "/weight_entries", WeightEntryController, :index
    post "/weight_entries", WeightEntryController, :create
    delete "/weight_entries/:id", WeightEntryController, :delete

    # Chat
    get "/conversation", ConversationController, :show
    get "/conversation/messages", ConversationController, :messages
    post "/conversation/messages", ConversationController, :create_message
    post "/conversation/read", ConversationController, :mark_read
  end
end
