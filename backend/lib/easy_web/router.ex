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
    get "/clients/:client_id/nutrition_plans", ClientPlanController, :nutrition_plans
    get "/clients/:client_id/weight_entries", ClientWeightEntryController, :index

    post "/foods", FoodController, :create
    get "/foods/:id", FoodController, :show
    patch "/foods/:id", FoodController, :update
    delete "/foods/:id", FoodController, :delete
    get "/foods", FoodController, :index

    post "/recipes", RecipeController, :create
    get "/recipes/:id", RecipeController, :show
    patch "/recipes/:id", RecipeController, :update
    delete "/recipes/:id", RecipeController, :delete
    get "/recipes", RecipeController, :index

    post "/nutrition_plans", NutritionPlanController, :create
    get "/nutrition_plans/:id", NutritionPlanController, :show
    patch "/nutrition_plans/:id", NutritionPlanController, :update
    delete "/nutrition_plans/:id", NutritionPlanController, :delete
    get "/nutrition_plans", NutritionPlanController, :index
    post "/nutrition_plans/:id/assign", NutritionPlanController, :assign
    post "/nutrition_plans/:id/duplicate", NutritionPlanController, :duplicate
    post "/nutrition_plans/:plan_id/meals", MealController, :create
    get "/nutrition_plans/:plan_id/meals", MealController, :index
    get "/meals/:id", MealController, :show
    patch "/meals/:id", MealController, :update
    delete "/meals/:id", MealController, :delete

    post "/nutrition_plans/:plan_id/plan_items", PlanItemController, :create
    get "/nutrition_plans/:plan_id/plan_items", PlanItemController, :index
    patch "/plan_items/:id", PlanItemController, :update
    delete "/plan_items/:id", PlanItemController, :delete

    post "/meals/:meal_id/items", MealItemController, :create
    get "/meals/:meal_id/items", MealItemController, :index
    patch "/meal_items/:id", MealItemController, :update
    delete "/meal_items/:id", MealItemController, :delete

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

    # Meal logs (view client nutrition data)
    get "/meal_logs", MealLogController, :index
    get "/meal_logs/summary", MealLogController, :summary
    delete "/food_log_entries/:id", FoodLogEntryController, :delete

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
    get "/nutrition_plans", NutritionPlanController, :index
    get "/nutrition_plans/today", NutritionPlanController, :today
    get "/nutrition_plans/:id", NutritionPlanController, :show

    # Foods (read-only)
    get "/foods", FoodController, :index
    get "/foods/:id", FoodController, :show

    # Recipes (read-only)
    get "/recipes", RecipeController, :index
    get "/recipes/:id", RecipeController, :show

    # Meal logs
    get "/meal_logs", MealLogController, :index
    get "/meal_logs/:id", MealLogController, :show

    # Food log entries
    post "/food_log_entries", FoodLogEntryController, :create
    post "/food_log_entries/log_meal", FoodLogEntryController, :log_meal
    post "/food_log_entries/log_day", FoodLogEntryController, :log_day
    patch "/food_log_entries/:id", FoodLogEntryController, :update
    delete "/food_log_entries/:id", FoodLogEntryController, :delete

    # Weight entries
    get "/weight_entries", WeightEntryController, :index
    post "/weight_entries", WeightEntryController, :create
    delete "/weight_entries/:id", WeightEntryController, :delete
  end

  scope "/v1/public", EasyWeb.Public do
    pipe_through :api

    get "/coaches/:slug/profile", StorefrontController, :show
    post "/coaches/:slug/inquiries", StorefrontController, :create_inquiry
  end
end
