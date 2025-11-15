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
    get "/test/error", ErrorTestController, :trigger_error
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

  scope "/api/onboarding", EasyWeb do
    pipe_through :api_authenticated

    post "/business", OnboardingController, :create_business
  end

  scope "/api/businesses", EasyWeb do
    pipe_through :api_authenticated

    get "/:id", BusinessController, :show
    patch "/:id", BusinessController, :update
    get "/:id/coaches", BusinessController, :list_coaches
    get "/:id/clients", BusinessController, :list_clients
    get "/:id/subscription", BusinessController, :show_subscription
  end

  scope "/api/coaches", EasyWeb do
    pipe_through :api_authenticated

    get "/:id", CoachController, :show
    patch "/:id", CoachController, :update
    get "/:id/clients", CoachController, :list_clients
    post "/:id/clients/:client_id/assign", CoachController, :assign_client
    delete "/:id/clients/:client_id/unassign", CoachController, :unassign_client
  end

  scope "/api/clients", EasyWeb do
    pipe_through :api_authenticated

    get "/", ClientController, :index
    post "/invite", ClientController, :invite
    get "/:id", ClientController, :show
    patch "/:id", ClientController, :update
    get "/:id/coaches", ClientController, :list_coaches
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
end
