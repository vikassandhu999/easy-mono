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
    plug EasyWeb.Plugs.LoadClient
    plug EasyWeb.Plugs.RequireCoaching
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
    post "/invites/:token/accept", AuthController, :accept_invite_verify
    post "/otp", AuthController, :otp
    post "/verify", AuthController, :verify
    post "/token", AuthController, :token

    get "/trainer-invitations/:token", AuthController, :show_trainer_invitation
    post "/trainer-accept-invite", AuthController, :trainer_accept_invite
    post "/trainer-accept-invite/verify", AuthController, :trainer_accept_invite_verify
  end

  # Unauthenticated Razorpay webhook: verified by HMAC signature over the raw body, not auth.
  scope "/v1/webhooks", EasyWeb do
    pipe_through :api

    post "/razorpay", WebhookController, :razorpay
  end

  scope "/v1/businesses", EasyWeb do
    pipe_through :require_user
    post "/", BusinessController, :create
    get "/handle-availability", BusinessController, :handle_availability

    pipe_through :require_coach
    get "/me", BusinessController, :show
    get "/timezones", BusinessController, :timezones
    patch "/me", BusinessController, :update
  end

  scope "/v1/coach", EasyWeb.Coaches do
    pipe_through :require_coach

    get "/trackers", TrackerController, :index
    get "/trackers/:id", TrackerController, :show
    post "/trackers", TrackerController, :create
    patch "/trackers/:id", TrackerController, :update
    delete "/trackers/:id", TrackerController, :delete
    post "/trackers/:id/archive", TrackerController, :archive
    post "/trackers/:id/restore", TrackerController, :restore
    get "/tracker-templates", TrackerTemplateController, :index
    post "/tracker-templates", TrackerTemplateController, :create
    get "/tracker-templates/:id", TrackerTemplateController, :show
    patch "/tracker-templates/:id", TrackerTemplateController, :update
    get "/review-roster", ReviewController, :roster
    get "/review-settings", ReviewController, :settings
    patch "/review-settings", ReviewController, :update_settings
    get "/clients/:client_id/review-screen", ReviewController, :screen
    get "/clients/:client_id/reviews", ReviewController, :index
    post "/clients/:client_id/reviews", ReviewController, :create
    patch "/clients/:client_id/reviews/:id", ReviewController, :update
    get "/tracker-settings", TrackerTemplateController, :settings
    patch "/tracker-settings", TrackerTemplateController, :update_settings
    get "/clients/:client_id/tracker-assignments", TrackerClientController, :assignments
    get "/clients/:client_id/tracker-entries", TrackerClientController, :entries
    post "/clients/:client_id/tracker-entries", TrackerClientController, :create_entry
    patch "/clients/:client_id/tracker-entries/:id", TrackerClientController, :update_entry
    delete "/clients/:client_id/tracker-entries/:id", TrackerClientController, :remove_entry
    get "/clients/:client_id/tracker-today", TrackerClientController, :today
    get "/clients/:client_id/tracker-prompts", TrackerClientController, :prompts
    get "/clients/:client_id/tracker-requests", TrackerClientController, :requests
    get "/clients/:client_id/trackers/:id/metrics", TrackerClientController, :metrics
    post "/clients/:client_id/tracker-assignments", TrackerClientController, :add_assignment
    patch "/clients/:client_id/tracker-assignments/:id", TrackerClientController, :change_assignment
    delete "/clients/:client_id/tracker-assignments/:id", TrackerClientController, :end_assignment
    post "/clients/:client_id/tracker-requests", TrackerClientController, :request
    delete "/clients/:client_id/tracker-requests/:id", TrackerClientController, :cancel_request
    post "/clients/:client_id/tracker-templates/:id/apply", TrackerTemplateController, :apply

    get "/me", ProfileController, :show
    patch "/me", ProfileController, :update

    get "/billing", BillingController, :show
    post "/billing/checkout", BillingController, :checkout
    post "/billing/cancel", BillingController, :cancel
    post "/billing/sync", BillingController, :sync

    post "/clients", ClientController, :invite
    post "/clients/:id/invite", ClientController, :resend_invite
    get "/clients/:id", ClientController, :show
    patch "/clients/:id", ClientController, :update
    delete "/clients/:id", ClientController, :delete
    get "/clients", ClientController, :index
    post "/clients/:id/terms", CoachingTermController, :create
    patch "/terms/:id", CoachingTermController, :update
    post "/clients/:client_id/uploads", UploadController, :create
    post "/attachments/download-urls", UploadController, :download_urls
    post "/library-media/uploads", LibraryMediaController, :create

    get "/coaches", TeamController, :index
    get "/coaches/:id", TeamController, :show
    post "/coaches", TeamController, :invite
    post "/coaches/:id/invite", TeamController, :resend_invite
    delete "/coaches/:id", TeamController, :revoke_invite
    post "/coaches/:id/remove", TeamController, :remove

    get "/exercises", ExerciseController, :index
    post "/exercises", ExerciseController, :create
    get "/exercises/:id", ExerciseController, :show
    patch "/exercises/:id", ExerciseController, :update
    delete "/exercises/:id", ExerciseController, :delete
    post "/exercises/:id/copy", ExerciseController, :copy
    get "/workouts", WorkoutController, :index
    post "/workouts", WorkoutController, :create
    get "/workouts/:id", WorkoutController, :show
    patch "/workouts/:id", WorkoutController, :update
    delete "/workouts/:id", WorkoutController, :delete
    post "/workouts/:id/copy", WorkoutController, :copy
    get "/clients/:client_id/workouts", ClientWorkoutController, :index
    post "/clients/:client_id/workouts", ClientWorkoutController, :create
    get "/clients/:client_id/workouts/:id", ClientWorkoutController, :show
    patch "/clients/:client_id/workouts/:id", ClientWorkoutController, :update
    delete "/clients/:client_id/workouts/:id", ClientWorkoutController, :delete
    post "/clients/:client_id/workouts/:id/copy", ClientWorkoutController, :copy
    post "/clients/:client_id/workouts/:id/assign", ClientWorkoutController, :assign
    get "/clients/:client_id/workout-week", WorkoutWeekController, :show
    post "/clients/:client_id/workout-schedules", WorkoutWeekController, :create_schedule
    patch "/clients/:client_id/workout-schedules/:id", WorkoutWeekController, :update_schedule
    delete "/clients/:client_id/workout-schedules/:id", WorkoutWeekController, :remove_schedule
    post "/clients/:client_id/workout-undo", WorkoutWeekController, :undo

    # Client-scoped plan lists

    # Client-scoped training sessions (read-only)

    # Chat
    get "/conversations", ConversationController, :index
    get "/conversation-inbox", ConversationController, :inbox
    get "/conversations/:id/history", ConversationController, :history
    get "/conversations/:id", ConversationController, :show
    get "/conversations/:id/messages", ConversationController, :messages
    post "/conversations/:id/messages", ConversationController, :create_message
    post "/conversations/:id/read", ConversationController, :mark_read
    get "/clients/:client_id/conversation", ConversationController, :show_for_client

    get "/foods", FoodController, :index
    get "/foods/:id", FoodController, :show
    post "/foods", FoodController, :create
    patch "/foods/:id", FoodController, :update
    get "/nutrients", FoodController, :nutrients
    get "/clients/:client_id/nutrition-week", NutritionWeekController, :show
    get "/clients/:client_id/nutrition-presets", NutritionWeekController, :presets
    post "/clients/:client_id/nutrition-presets", NutritionWeekController, :create_preset
    patch "/clients/:client_id/nutrition-presets/:id", NutritionWeekController, :update_preset
    delete "/clients/:client_id/nutrition-presets/:id", NutritionWeekController, :archive_preset
    post "/clients/:client_id/nutrition-schedules", NutritionWeekController, :create_schedule
    patch "/clients/:client_id/nutrition-schedules/:id", NutritionWeekController, :update_schedule
    delete "/clients/:client_id/nutrition-schedules/:id", NutritionWeekController, :remove_schedule
    post "/clients/:client_id/nutrition-targets", NutritionWeekController, :create_targets
    patch "/clients/:client_id/nutrition-targets/:id", NutritionWeekController, :update_targets
    put "/clients/:client_id/nutrition-target-days/:weekday", NutritionWeekController, :assign_targets
    post "/clients/:client_id/nutrition-undo", NutritionWeekController, :undo
  end

  scope "/v1/client", EasyWeb.Clients do
    pipe_through :require_client

    get "/days/:date", DayController, :show
    get "/week-markers", DayController, :markers
    get "/foods", NutritionLogController, :foods
    get "/exercises", DayController, :exercises
    post "/nutrition-logs/restore", NutritionLogController, :restore
    post "/nutrition-logs", NutritionLogController, :create
    get "/nutrition-logs/:id", NutritionLogController, :show
    patch "/nutrition-logs/:id", NutritionLogController, :update
    delete "/nutrition-logs/:id", NutritionLogController, :delete
    post "/workout-logs/restore", WorkoutLogController, :restore
    post "/workout-logs", WorkoutLogController, :start
    get "/workout-logs/:id", WorkoutLogController, :show
    patch "/workout-logs/:id", WorkoutLogController, :update
    post "/workout-logs/:id/finish", WorkoutLogController, :finish
    post "/workout-logs/:id/discard", WorkoutLogController, :discard
    post "/workout-logs/:id/reopen", WorkoutLogController, :reopen
    delete "/workout-logs/:id", WorkoutLogController, :delete

    get "/review-replies", ReviewReplyController, :index
    get "/trackers", TrackerController, :index
    get "/trackers/:id", TrackerController, :show
    get "/tracker-assignments", TrackerClientController, :assignments
    get "/tracker-entries", TrackerClientController, :entries
    post "/tracker-entries", TrackerClientController, :create_entry
    patch "/tracker-entries/:id", TrackerClientController, :update_entry
    delete "/tracker-entries/:id", TrackerClientController, :remove_entry
    get "/tracker-today", TrackerClientController, :today
    get "/tracker-prompts", TrackerClientController, :prompts
    get "/tracker-requests", TrackerClientController, :requests
    get "/trackers/:id/metrics", TrackerClientController, :metrics

    get "/me", ProfileController, :show
    patch "/me", ProfileController, :update

    post "/uploads", UploadController, :create
    get "/attachments/download-urls", UploadController, :download_urls

    # Training plans (read-only)

    # Exercises (read-only)

    # Training sessions

    # Foods (read-only)

    # Chat
    get "/conversation", ConversationController, :show
    get "/conversation/history", ConversationController, :history
    get "/conversation/messages", ConversationController, :messages
    post "/conversation/messages", ConversationController, :create_message
    post "/conversation/read", ConversationController, :mark_read
  end
end
