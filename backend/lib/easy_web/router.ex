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
  end

  scope "/api", EasyWeb do
    pipe_through :api

    get "/health", HealthController, :index
  end

  scope "/api" do
    pipe_through :api

    get "/openapi", OpenApiSpex.Plug.RenderSpec, []
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
    patch "/me", BusinessController, :update
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

    post "/clients/invite", ClientController, :invite
    post "/clients/:id/resend-invite", ClientController, :resend_invite
    get "/clients/:id", ClientController, :show
    patch "/clients/:id", ClientController, :update
    delete "/clients/:id", ClientController, :delete
    get "/clients", ClientController, :index
    post "/clients/:id/reassign", ClientController, :reassign

    get "/team", TeamController, :index
    post "/team/invite", TeamController, :invite
    post "/team/:id/resend-invite", TeamController, :resend_invite
    delete "/team/:id", TeamController, :revoke_invite
    post "/team/:id/deactivate", TeamController, :deactivate

    get "/clients/:client_id/profile", ClientProfileController, :show
    patch "/clients/:client_id/profile", ClientProfileController, :update

    get "/profile-fields", ProfileFieldController, :index
    post "/profile-fields", ProfileFieldController, :create
    patch "/profile-fields/:id", ProfileFieldController, :update
    delete "/profile-fields/:id", ProfileFieldController, :delete

    get "/form-templates", FormTemplateController, :index
    post "/form-templates", FormTemplateController, :create
    get "/form-templates/:id", FormTemplateController, :show
    patch "/form-templates/:id", FormTemplateController, :update
    delete "/form-templates/:id", FormTemplateController, :delete
    post "/form-templates/:id/assign", FormTemplateController, :assign
    get "/clients/:client_id/form-assignments", FormAssignmentController, :index
    get "/form-assignments/:id/submissions", FormAssignmentController, :submissions
    patch "/form-assignments/:id", FormAssignmentController, :update

    # Client-scoped plan lists
    get "/clients/:client_id/training-plans", ClientPlanController, :training_plans
    get "/clients/:client_id/nutrition-plans", ClientPlanController, :nutrition_plans
    get "/clients/:client_id/weight_entries", ClientWeightEntryController, :index

    get "/nutrition-foods", FoodController, :index
    post "/nutrition-foods", FoodController, :create
    get "/nutrition-foods/:id", FoodController, :show
    patch "/nutrition-foods/:id", FoodController, :update
    delete "/nutrition-foods/:id", FoodController, :delete
    get "/nutrition-foods/:id/impact", FoodController, :impact
    post "/nutrition-foods/:id/copy", FoodController, :copy

    get "/nutrition-recipes", RecipeController, :index
    post "/nutrition-recipes", RecipeController, :create
    get "/nutrition-recipes/:id", RecipeController, :show
    patch "/nutrition-recipes/:id", RecipeController, :update
    delete "/nutrition-recipes/:id", RecipeController, :delete
    get "/nutrition-recipes/:id/impact", RecipeController, :impact
    post "/nutrition-recipes/:id/copy", RecipeController, :copy

    get "/nutrition-plans", NutritionPlanController, :index
    post "/nutrition-plans", NutritionPlanController, :create
    get "/nutrition-plans/:id", NutritionPlanController, :show
    patch "/nutrition-plans/:id", NutritionPlanController, :update
    delete "/nutrition-plans/:id", NutritionPlanController, :delete
    post "/nutrition-plans/:id/assign", NutritionPlanController, :assign
    post "/nutrition-plans/:id/duplicate", NutritionPlanController, :duplicate
    get "/nutrition-plans/:plan_id/meals", MealController, :index
    post "/nutrition-plans/:plan_id/meals", MealController, :create
    get "/nutrition-meals/:id", MealController, :show
    patch "/nutrition-meals/:id", MealController, :update
    delete "/nutrition-meals/:id", MealController, :delete

    post "/nutrition-meals/:meal_id/items", MealItemController, :create
    patch "/nutrition-meal-items/:id", MealItemController, :update
    delete "/nutrition-meal-items/:id", MealItemController, :delete

    post "/nutrition-plans/:plan_id/days", PlanDayController, :create
    patch "/nutrition-days/:id", PlanDayController, :update
    delete "/nutrition-days/:id", PlanDayController, :delete
    put "/nutrition-plans/:plan_id/weekday-assignments", PlanDayController, :assign_weekday
    post "/nutrition-days/:day_id/options", PlanDayController, :add_option
    delete "/nutrition-day-meals/:id", PlanDayController, :remove_option
    post "/nutrition-day-meals/:id/make-default", PlanDayController, :make_default

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
    delete "/training-plans/:id", TrainingPlanController, :delete
    post "/training-plans/:id/assign", TrainingPlanController, :assign
    post "/training-plans/:id/duplicate", TrainingPlanController, :duplicate

    get "/training-plans/:plan_id/training-workouts", WorkoutController, :index
    post "/training-plans/:plan_id/training-workouts", WorkoutController, :create
    get "/training-workouts/:id", WorkoutController, :show
    patch "/training-workouts/:id", WorkoutController, :update
    delete "/training-workouts/:id", WorkoutController, :delete

    get "/training-plans/:plan_id/schedule", TrainingScheduleController, :show
    put "/training-plans/:plan_id/schedule/:day", TrainingScheduleController, :update

    post "/training-workouts/:workout_id/exercises", WorkoutElementController, :create
    put "/training-workouts/:workout_id/exercises/reorder", WorkoutElementController, :reorder
    patch "/training-workout-exercises/:id", WorkoutElementController, :update
    delete "/training-workout-exercises/:id", WorkoutElementController, :delete

    # Client-scoped training sessions (read-only)
    get "/clients/:client_id/training-sessions", WorkoutSessionController, :index
    get "/clients/:client_id/training-sessions/:id", WorkoutSessionController, :show

    # Meal logs (view client nutrition data — read-only)
    get "/clients/:client_id/nutrition-meal-logs", MealLogController, :index
  end

  scope "/v1/client", EasyWeb.Clients do
    pipe_through :require_client

    get "/me", ProfileController, :show
    patch "/me", ProfileController, :update
    get "/profile", ClientProfileController, :show
    patch "/profile", ClientProfileController, :update

    get "/form-assignments", FormAssignmentController, :index
    get "/form-assignments/:id", FormAssignmentController, :show
    post "/form-assignments/:id/submit", FormAssignmentController, :submit

    # Training plans (read-only)
    get "/training-plans", TrainingPlanController, :index
    get "/training-plans/today", TrainingPlanController, :today
    get "/training-plans/:id", TrainingPlanController, :show

    # Exercises (read-only)
    get "/training-exercises", ExerciseController, :index
    get "/training-exercises/:id", ExerciseController, :show

    # Training sessions
    get "/training-sessions", WorkoutSessionController, :index
    post "/training-sessions", WorkoutSessionController, :create
    get "/training-sessions/:id", WorkoutSessionController, :show
    patch "/training-sessions/:id", WorkoutSessionController, :update
    post "/training-sessions/:session_id/performed-sets", PerformedSetController, :create
    patch "/training-performed-sets/:id", PerformedSetController, :update
    delete "/training-performed-sets/:id", PerformedSetController, :delete

    # Nutrition plans (read-only)
    get "/nutrition-plans", NutritionPlanController, :index
    get "/nutrition-plans/today", NutritionPlanController, :today
    get "/nutrition-plans/:id", NutritionPlanController, :show

    # Foods (read-only)
    get "/nutrition-foods", FoodController, :index
    get "/nutrition-foods/:id", FoodController, :show

    # Recipes (read-only)
    get "/nutrition-recipes", RecipeController, :index
    get "/nutrition-recipes/:id", RecipeController, :show

    # Meal logs
    get "/nutrition-meal-logs", MealLogController, :index

    # Food log entries
    post "/nutrition-food-log-entries", FoodLogEntryController, :create
    post "/nutrition-food-log-entries/log-meal", FoodLogEntryController, :log_meal
    post "/nutrition-food-log-entries/log-day", FoodLogEntryController, :log_day
    post "/nutrition-food-log-entries/switch-option", FoodLogEntryController, :switch_option
    patch "/nutrition-food-log-entries/:id", FoodLogEntryController, :update
    delete "/nutrition-food-log-entries/:id", FoodLogEntryController, :delete

    # Weight entries
    get "/weight_entries", WeightEntryController, :index
    post "/weight_entries", WeightEntryController, :create
    delete "/weight_entries/:id", WeightEntryController, :delete
  end
end
