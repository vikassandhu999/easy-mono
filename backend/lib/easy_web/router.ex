defmodule EasyWeb.Router do
  use EasyWeb, :router

  # PIPELINES

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :api_authenticated do
    plug :accepts, ["json"]

    plug EasyWeb.Plugs.Authenticate
    plug EasyWeb.Plugs.PopulateScope
  end

  scope "/api", EasyWeb do
    pipe_through :api

    get "/health", HealthController, :index
  end

  scope "/api/auth", EasyWeb do
    pipe_through :api

    post "/register", AuthController, :register
    post "/verify", AuthController, :verify
    post "/send-login-code", AuthController, :send_login_code
    post "/token", AuthController, :token
    post "/me", AuthController, :me
    post "/client-signup", AuthController, :client_signup
  end

  scope "/api/auth", EasyWeb do
    pipe_through :api_authenticated

    get "/me", AuthController, :me
  end

  scope "/api/invitations", EasyWeb do
    pipe_through :api

    get "/:token", InvitationController, :show
  end

  # Organization management
  scope "/api/organization", EasyWeb do
    pipe_through :api_authenticated

    get "/", BusinessController, :show
    get "/subscription", BusinessController, :get_subscription
    get "/coaches", BusinessController, :list_coaches
  end

  # Client self-service (authenticated client)
  scope "/api/me", EasyWeb do
    pipe_through :api_authenticated

    get "/profile", ProfileController, :show
    patch "/profile", ProfileController, :update
  end

  # Client management (coach actions)
  scope "/api/clients", EasyWeb do
    pipe_through :api_authenticated

    get "/", ClientController, :index
    post "/invite", ClientController, :invite
    get "/:id", ClientController, :show
    patch "/:id", ClientController, :update
    patch "/:id/status", ClientController, :update_status
    post "/:id/resend-invitation", ClientController, :resend_invitation
    delete "/:id", ClientController, :delete
  end

  scope "/api/ingredients", EasyWeb do
    pipe_through :api_authenticated

    get "/", IngredientController, :index
    post "/", IngredientController, :create
    get "/:id", IngredientController, :show
    patch "/:id", IngredientController, :update
    delete "/:id", IngredientController, :delete
  end

  scope "/api/recipes", EasyWeb do
    pipe_through :api_authenticated

    get "/", RecipeController, :index
    post "/", RecipeController, :create
    get "/:id", RecipeController, :show
    patch "/:id", RecipeController, :update
    delete "/:id", RecipeController, :delete
  end

  scope "/api/nutrition_plans", EasyWeb do
    pipe_through :api_authenticated

    get "/", NutritionPlanController, :index
    post "/", NutritionPlanController, :create
    get "/:id", NutritionPlanController, :show
    patch "/:id", NutritionPlanController, :update
    delete "/:id", NutritionPlanController, :delete

    post "/:id/assign", NutritionPlanController, :assign
    post "/:id/duplicate", NutritionPlanController, :duplicate
    post "/:id/copy-day", NutritionPlanController, :copy_day
    get "/:id/shopping-list", NutritionPlanController, :shopping_list
    post "/:id/reorder-meals", NutritionPlanController, :reorder_meals
    post "/:id/bulk-create-meals", NutritionPlanController, :bulk_create_meals
    get "/:id/macros", NutritionPlanController, :macros
  end

  scope "/api/meals", EasyWeb do
    pipe_through :api_authenticated

    post "/", MealController, :create
    get "/:id", MealController, :show
    patch "/:id", MealController, :update
    delete "/:id", MealController, :delete

    # Items nested under meals for creation/listing
    post "/:meal_id/items", MealItemController, :create
    get "/:meal_id/items", MealItemController, :index
    post "/:meal_id/reorder-items", MealItemController, :reorder
  end

  scope "/api/meal_items", EasyWeb do
    pipe_through :api_authenticated

    patch "/:id", MealItemController, :update
    delete "/:id", MealItemController, :delete
  end

  # Training Domain
  scope "/api/exercises", EasyWeb do
    pipe_through :api_authenticated

    get "/", ExerciseController, :index
    post "/", ExerciseController, :create
    get "/:id", ExerciseController, :show
    put "/:id", ExerciseController, :update
    delete "/:id", ExerciseController, :delete
    post "/:id/duplicate", ExerciseController, :duplicate
  end

  scope "/api/muscles", EasyWeb do
    pipe_through :api_authenticated

    get "/", MuscleController, :index
  end

  scope "/api/equipment", EasyWeb do
    pipe_through :api_authenticated

    get "/", EquipmentController, :index
  end

  scope "/api/training_plans", EasyWeb do
    pipe_through :api_authenticated

    get "/", TrainingPlanController, :index
    post "/", TrainingPlanController, :create
    get "/:id", TrainingPlanController, :show
    put "/:id", TrainingPlanController, :update

    post "/:id/assign", TrainingPlanController, :assign
    post "/:id/duplicate", TrainingPlanController, :duplicate
    delete "/:id", TrainingPlanController, :delete
  end

  scope "/api/planned_workouts", EasyWeb do
    pipe_through :api_authenticated

    post "/", PlannedWorkoutController, :create
    get "/:id", PlannedWorkoutController, :show
    put "/:id", PlannedWorkoutController, :update
    delete "/:id", PlannedWorkoutController, :delete
  end

  scope "/api/workout_elements", EasyWeb do
    pipe_through :api_authenticated

    post "/", WorkoutElementController, :create
    get "/:id", WorkoutElementController, :show
    put "/:id", WorkoutElementController, :update
    delete "/:id", WorkoutElementController, :delete
  end

  scope "/api/sessions", EasyWeb do
    pipe_through :api_authenticated

    get "/", WorkoutSessionController, :index
    post "/", WorkoutSessionController, :create
    get "/:id", WorkoutSessionController, :show
    put "/:id/complete", WorkoutSessionController, :complete
  end
end
