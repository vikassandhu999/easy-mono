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

    post "/clients/invite", ClientController, :invite
    post "/clients/:id/resend-invite", ClientController, :resend_invite
    get "/clients/:id", ClientController, :show
    patch "/clients/:id", ClientController, :update
    delete "/clients/:id", ClientController, :delete
    get "/clients", ClientController, :index

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
    patch "/form-assignments/:id", FormAssignmentController, :update

    # Client-scoped plan lists
    get "/clients/:client_id/training_plans", ClientPlanController, :training_plans
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
    get "/nutrition-plans/:plan_id/schedule", ScheduleController, :show
    put "/nutrition-plans/:plan_id/schedule/:day", ScheduleController, :update
    get "/nutrition-meals/:id", MealController, :show
    patch "/nutrition-meals/:id", MealController, :update
    delete "/nutrition-meals/:id", MealController, :delete

    post "/nutrition-meals/:meal_id/items", MealItemController, :create
    patch "/nutrition-meal-items/:id", MealItemController, :update
    delete "/nutrition-meal-items/:id", MealItemController, :delete

    get "/exercises", ExerciseController, :index
    post "/exercises", ExerciseController, :create
    get "/exercises/:id", ExerciseController, :show
    patch "/exercises/:id", ExerciseController, :update
    delete "/exercises/:id", ExerciseController, :delete
    post "/exercises/:id/duplicate", ExerciseController, :duplicate

    get "/muscles", MuscleController, :index
    get "/equipment", EquipmentController, :index

    get "/training_plans", TrainingPlanController, :index
    post "/training_plans", TrainingPlanController, :create
    get "/training_plans/:id", TrainingPlanController, :show
    patch "/training_plans/:id", TrainingPlanController, :update
    delete "/training_plans/:id", TrainingPlanController, :delete
    post "/training_plans/:id/assign", TrainingPlanController, :assign
    post "/training_plans/:id/duplicate", TrainingPlanController, :duplicate

    get "/training_plans/:plan_id/workouts", WorkoutController, :index
    post "/training_plans/:plan_id/workouts", WorkoutController, :create
    get "/workouts/:id", WorkoutController, :show
    patch "/workouts/:id", WorkoutController, :update
    delete "/workouts/:id", WorkoutController, :delete
    post "/workouts/:id/duplicate", WorkoutController, :duplicate

    post "/training_plans/:plan_id/training_plan_items", TrainingPlanItemController, :create
    get "/training_plans/:plan_id/training_plan_items", TrainingPlanItemController, :index
    patch "/training_plan_items/:id", TrainingPlanItemController, :update
    delete "/training_plan_items/:id", TrainingPlanItemController, :delete

    post "/workout_elements", WorkoutElementController, :create
    get "/workout_elements/:id", WorkoutElementController, :show
    patch "/workout_elements/:id", WorkoutElementController, :update
    delete "/workout_elements/:id", WorkoutElementController, :delete

    get "/workout_sessions", WorkoutSessionController, :index
    post "/workout_sessions", WorkoutSessionController, :create
    get "/workout_sessions/:id", WorkoutSessionController, :show
    post "/workout_sessions/:id/complete", WorkoutSessionController, :complete
    post "/workout_sessions/:id/discard", WorkoutSessionController, :discard
    delete "/workout_sessions/:id", WorkoutSessionController, :delete

    post "/performed_sets", PerformedSetController, :create
    patch "/performed_sets/:id", PerformedSetController, :update
    delete "/performed_sets/:id", PerformedSetController, :delete

    # Threads
    get "/threads", ThreadController, :index
    post "/threads", ThreadController, :create
    get "/threads/:id", ThreadController, :show
    patch "/threads/:id", ThreadController, :update
    post "/threads/:thread_id/messages", ThreadMessageController, :create
    get "/clients/:client_id/threads", ThreadController, :client_threads

    # Meal logs (view client nutrition data — read-only)
    get "/clients/:client_id/nutrition-meal-logs", MealLogController, :index

    # Storefront
    get "/storefront/profile", StoreProfileController, :show
    patch "/storefront/profile", StoreProfileController, :update
    post "/storefront/check-slug", StoreProfileController, :check_slug

    get "/offers", OfferController, :index
    post "/offers", OfferController, :create
    get "/offers/:id", OfferController, :show
    patch "/offers/:id", OfferController, :update
    delete "/offers/:id", OfferController, :delete

    get "/testimonials", TestimonialController, :index
    post "/testimonials", TestimonialController, :create
    get "/testimonials/:id", TestimonialController, :show
    patch "/testimonials/:id", TestimonialController, :update
    delete "/testimonials/:id", TestimonialController, :delete
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
    get "/training_plans", TrainingPlanController, :index
    get "/training_plans/:id", TrainingPlanController, :show

    # Exercises (read-only)
    get "/exercises", ExerciseController, :index
    get "/exercises/:id", ExerciseController, :show

    # Workout sessions
    get "/workout_sessions/active", WorkoutSessionController, :active
    get "/workout_sessions", WorkoutSessionController, :index
    post "/workout_sessions", WorkoutSessionController, :create
    get "/workout_sessions/:id", WorkoutSessionController, :show
    patch "/workout_sessions/:id", WorkoutSessionController, :update
    post "/workout_sessions/:id/complete", WorkoutSessionController, :complete
    post "/workout_sessions/:id/discard", WorkoutSessionController, :discard

    # Performed sets
    post "/performed_sets", PerformedSetController, :create
    patch "/performed_sets/:id", PerformedSetController, :update
    delete "/performed_sets/:id", PerformedSetController, :delete

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
    patch "/nutrition-food-log-entries/:id", FoodLogEntryController, :update
    delete "/nutrition-food-log-entries/:id", FoodLogEntryController, :delete

    # Weight entries
    get "/weight_entries", WeightEntryController, :index
    post "/weight_entries", WeightEntryController, :create
    delete "/weight_entries/:id", WeightEntryController, :delete

    # Threads
    get "/threads", ThreadController, :index
    post "/threads", ThreadController, :create
    get "/threads/:id", ThreadController, :show
    post "/threads/:thread_id/messages", ThreadMessageController, :create
  end

  scope "/v1/public", EasyWeb.Public do
    pipe_through :api

    get "/coaches/:slug/profile", StorefrontController, :show
    post "/coaches/:slug/inquiries", StorefrontController, :create_inquiry
  end
end
