defmodule EasyWeb.Router do
  use EasyWeb, :router

  # PIPELINES

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :api_authenticated do
    plug :accepts, ["json"]

    plug EasyWeb.Plugs.Authenticate
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
  end

  scope "/api/auth", EasyWeb do
    pipe_through :api_authenticated

    get "/me", AuthController, :me
  end

  scope "/api/invitations", EasyWeb do
    pipe_through :api

    get "/:token_id", ClientController, :show_invitation
    post "/:token_id/accept", ClientController, :accept_invitation
  end

  scope "/api/current-business", EasyWeb do
    pipe_through :api_authenticated

    get "/", BusinessController, :show
  end

  scope "/api/clients", EasyWeb do
    pipe_through :api_authenticated

    get "/", ClientController, :index
    post "/invite", ClientController, :invite
    get "/:id", ClientController, :show
    patch "/:id", ClientController, :update
    patch "/:id/status", ClientController, :update_status
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
  end
end
