defmodule EasyWeb.Router do
  use EasyWeb, :router

  # PIPELINES

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :authenticated do
    plug EasyWeb.Plugs.EnsureAuthenticated
    plug EasyWeb.Plugs.LoadCurrentUser
  end

  pipeline :api_authenticated do
    plug :accepts, ["json"]
    plug EasyWeb.Plugs.AuthenticateToken
  end

  scope "/api", EasyWeb do
    pipe_through :api

    get "/health", HealthController, :index
    get "/test/error", ErrorTestController, :trigger_error
  end

  scope "/api/auth", EasyWeb do
    pipe_through :api

    post "/register", AuthController, :register
    post "/verify", AuthController, :verify
    post "/send-login-code", AuthController, :send_login_code
    post "/login", AuthController, :login
    post "/refresh-token", AuthController, :refresh_token
  end

  # AUTHENTICATED AUTH ENDPOINTS

  scope "/api/auth", EasyWeb do
    pipe_through :api_authenticated

    post "/logout", AuthController, :logout
    post "/switch-context", AuthController, :switch_context
    get "/contexts", AuthController, :list_contexts
  end

  # PUBLIC INVITATION ENDPOINTS

  scope "/api/invitations", EasyWeb do
    pipe_through :api

    get "/:token_id", ClientController, :show_invitation
    post "/:token_id/accept", ClientController, :accept_invitation
  end

  # AUTHENTICATED ONBOARDING ENDPOINTS

  scope "/api/onboarding", EasyWeb do
    pipe_through :api_authenticated

    post "/business", OnboardingController, :create_business
  end

  # AUTHENTICATED BUSINESS ENDPOINTS

  scope "/api/businesses", EasyWeb do
    pipe_through :api_authenticated

    get "/:id", BusinessController, :show
    patch "/:id", BusinessController, :update
    get "/:id/coaches", BusinessController, :list_coaches
    get "/:id/clients", BusinessController, :list_clients
    get "/:id/subscription", BusinessController, :show_subscription
  end

  # AUTHENTICATED COACH ENDPOINTS

  scope "/api/coaches", EasyWeb do
    pipe_through :api_authenticated

    get "/:id", CoachController, :show
    patch "/:id", CoachController, :update
    get "/:id/clients", CoachController, :list_clients
    post "/:id/clients/:client_id/assign", CoachController, :assign_client
    delete "/:id/clients/:client_id/unassign", CoachController, :unassign_client
  end

  # AUTHENTICATED CLIENT ENDPOINTS

  scope "/api/clients", EasyWeb do
    pipe_through :api_authenticated

    get "/", ClientController, :index
    post "/invite", ClientController, :invite
    get "/:id", ClientController, :show
    patch "/:id", ClientController, :update
    get "/:id/coaches", ClientController, :list_coaches
    patch "/:id/status", ClientController, :update_status
  end

  # AUTHENTICATED NUTRITION ENDPOINTS

  scope "/api/recipes", EasyWeb do
    pipe_through :api_authenticated

    get "/", RecipeController, :index
    post "/", RecipeController, :create
    get "/:id", RecipeController, :show
    patch "/:id", RecipeController, :update
    delete "/:id", RecipeController, :delete
  end

  scope "/api/meals", EasyWeb do
    pipe_through :api_authenticated

    get "/", MealController, :index
    post "/", MealController, :create
    get "/:id", MealController, :show
    patch "/:id", MealController, :update
    delete "/:id", MealController, :delete
    post "/:id/duplicate", MealController, :duplicate

    # Meal recipe endpoints
    post "/:meal_id/recipes", MealController, :add_recipe
    patch "/:meal_id/recipes/:recipe_id", MealController, :update_recipe
    delete "/:meal_id/recipes/:recipe_id", MealController, :remove_recipe
  end

  scope "/api/meal-plans", EasyWeb do
    pipe_through :api_authenticated

    get "/", MealPlanController, :index
    post "/", MealPlanController, :create
    get "/:id", MealPlanController, :show
    patch "/:id", MealPlanController, :update
    delete "/:id", MealPlanController, :delete
    post "/:id/duplicate", MealPlanController, :duplicate
    post "/:id/publish", MealPlanController, :publish
    post "/:id/archive", MealPlanController, :archive
    post "/:id/assign", MealPlanController, :assign_to_client

    # Meal plan meals endpoints
    post "/:meal_plan_id/meals", MealPlanController, :add_meal
    patch "/:meal_plan_id/meals/:meal_id", MealPlanController, :update_meal
    delete "/:meal_plan_id/meals/:meal_id", MealPlanController, :remove_meal
  end
end
