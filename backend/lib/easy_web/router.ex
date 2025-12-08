defmodule EasyWeb.Router do
  use EasyWeb, :router

  alias Easy.Auth.Scope
  alias EasyWeb.FallbackController

  # PIPELINES

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :api_authenticated do
    plug :accepts, ["json"]
    plug EasyWeb.Plugs.Authenticate
    plug EasyWeb.Plugs.PopulateScope
  end

  pipeline :coach_authenticated do
    plug :accepts, ["json"]
    plug EasyWeb.Plugs.Authenticate
    plug EasyWeb.Plugs.PopulateScope
    plug :ensure_coach_scope
  end

  pipeline :client_authenticated do
    plug :accepts, ["json"]
    plug EasyWeb.Plugs.Authenticate
    plug EasyWeb.Plugs.PopulateScope
    plug :ensure_client_scope
  end

  scope "/api", EasyWeb do
    pipe_through :api

    get "/health", HealthController, :index
  end

  # Coach/standard auth
  scope "/api/auth", EasyWeb do
    pipe_through :api

    post "/register", AuthController, :register
    post "/verify", AuthController, :verify
    post "/send-login-code", AuthController, :send_login_code
    post "/token", AuthController, :token
  end

  scope "/api/auth/client", EasyWeb do
    pipe_through :api

    post "/login/code", ClientAuthController, :send_login_code
    post "/login", ClientAuthController, :verify_login_code
    post "/refresh", ClientAuthController, :refresh_token
    get "/me", ClientAuthController, :me
  end

  scope "/api/auth/client/invite", EasyWeb do
    pipe_through :api

    post "/validate", InvitationController, :validate_invitation
    post "/accept", InvitationController, :accept_invitation
  end

  # Public invitation/join flows
  scope "/api/invitations", EasyWeb do
    pipe_through :api

    get "/:token", InvitationController, :show
  end

  scope "/api/join", EasyWeb do
    pipe_through :api

    get "/:code", PublicJoinController, :show
  end

  # SHARED AUTHENTICATED ROUTES (applies to any authenticated role)

  scope "/api/auth", EasyWeb do
    pipe_through :api_authenticated

    get "/me", AuthController, :me
    post "/logout", AuthController, :logout
  end

  # COACH ROUTES

  scope "/api/coach", EasyWeb do
    pipe_through :coach_authenticated

    # Coach profile
    patch "/profile", AuthController, :update_coach_profile

    # Organization management
    get "/organization", BusinessController, :show
    patch "/organization", BusinessController, :update
    get "/organization/subscription", BusinessController, :get_subscription
    get "/organization/coaches", BusinessController, :list_coaches

    # Business settings
    get "/organization/settings", BusinessSettingsController, :show
    patch "/organization/settings", BusinessSettingsController, :update
    patch "/organization/settings/public-join", BusinessSettingsController, :update_public_join
    patch "/organization/settings/branding", BusinessSettingsController, :update_branding
    post "/organization/settings/regenerate-code", BusinessSettingsController, :regenerate_code

    post "/organization/settings/enable-public-join",
         BusinessSettingsController,
         :enable_public_join

    post "/organization/settings/disable-public-join",
         BusinessSettingsController,
         :disable_public_join

    # Client management
    get "/clients", ClientController, :index
    post "/clients/invite", ClientController, :invite
    get "/clients/:id", ClientController, :show
    patch "/clients/:id", ClientController, :update
    patch "/clients/:id/status", ClientController, :update_status
    post "/clients/:id/resend-invitation", ClientController, :resend_invitation
    delete "/clients/:id", ClientController, :delete

    # Ingredients
    get "/ingredients", IngredientController, :index
    post "/ingredients", IngredientController, :create
    get "/ingredients/:id", IngredientController, :show
    patch "/ingredients/:id", IngredientController, :update
    delete "/ingredients/:id", IngredientController, :delete

    # Recipes
    get "/recipes", RecipeController, :index
    post "/recipes", RecipeController, :create
    get "/recipes/:id", RecipeController, :show
    patch "/recipes/:id", RecipeController, :update
    delete "/recipes/:id", RecipeController, :delete
    post "/recipes/:id/duplicate", RecipeController, :duplicate

    # Nutrition plans
    get "/nutrition_plans", NutritionPlanController, :index
    post "/nutrition_plans", NutritionPlanController, :create
    get "/nutrition_plans/:id", NutritionPlanController, :show
    patch "/nutrition_plans/:id", NutritionPlanController, :update
    delete "/nutrition_plans/:id", NutritionPlanController, :delete
    post "/nutrition_plans/:id/assign", NutritionPlanController, :assign
    post "/nutrition_plans/:id/duplicate", NutritionPlanController, :duplicate
    post "/nutrition_plans/:id/copy-day", NutritionPlanController, :copy_day
    get "/nutrition_plans/:id/shopping-list", NutritionPlanController, :shopping_list
    post "/nutrition_plans/:id/reorder-meals", NutritionPlanController, :reorder_meals
    post "/nutrition_plans/:id/bulk-create-meals", NutritionPlanController, :bulk_create_meals
    get "/nutrition_plans/:id/macros", NutritionPlanController, :macros

    # Meals
    post "/meals", MealController, :create
    get "/meals/:id", MealController, :show
    patch "/meals/:id", MealController, :update
    delete "/meals/:id", MealController, :delete
    post "/meals/:meal_id/items", MealItemController, :create
    get "/meals/:meal_id/items", MealItemController, :index
    post "/meals/:meal_id/reorder-items", MealItemController, :reorder

    # Meal items (direct update/delete)
    patch "/meal_items/:id", MealItemController, :update
    delete "/meal_items/:id", MealItemController, :delete

    # Training domain
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
    put "/training_plans/:id", TrainingPlanController, :update
    post "/training_plans/:id/assign", TrainingPlanController, :assign
    post "/training_plans/:id/duplicate", TrainingPlanController, :duplicate
    delete "/training_plans/:id", TrainingPlanController, :delete

    post "/planned_workouts", PlannedWorkoutController, :create
    get "/planned_workouts/:id", PlannedWorkoutController, :show
    put "/planned_workouts/:id", PlannedWorkoutController, :update
    delete "/planned_workouts/:id", PlannedWorkoutController, :delete

    post "/workout_elements", WorkoutElementController, :create
    get "/workout_elements/:id", WorkoutElementController, :show
    put "/workout_elements/:id", WorkoutElementController, :update
    delete "/workout_elements/:id", WorkoutElementController, :delete

    get "/sessions", WorkoutSessionController, :index
    post "/sessions", WorkoutSessionController, :create
    get "/sessions/:id", WorkoutSessionController, :show
    put "/sessions/:id/complete", WorkoutSessionController, :complete
  end

  # CLIENT ROUTES

  scope "/api/client", EasyWeb do
    pipe_through :client_authenticated

    get "/profile", ProfileController, :show
    patch "/profile", ProfileController, :update
  end

  # (Optional backward-compatible client self-service path)
  scope "/api/me", EasyWeb do
    pipe_through :client_authenticated

    get "/profile", ProfileController, :show
    patch "/profile", ProfileController, :update
  end

  # GUARDS

  defp ensure_coach_scope(conn, _opts) do
    case conn.assigns[:scope] do
      %Scope{} = scope ->
        if Scope.can_act_as_coach?(scope) do
          conn
        else
          FallbackController.send_unauthorized_response(conn, "Coach access required")
        end

      _ ->
        FallbackController.send_unauthorized_response(conn, "Coach access required")
    end
  end

  defp ensure_client_scope(conn, _opts) do
    case conn.assigns[:scope] do
      %Scope{} = scope ->
        if Scope.can_act_as_client?(scope) do
          conn
        else
          FallbackController.send_unauthorized_response(conn, "Client access required")
        end

      _ ->
        FallbackController.send_unauthorized_response(conn, "Client access required")
    end
  end
end
