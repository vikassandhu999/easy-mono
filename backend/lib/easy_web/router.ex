defmodule EasyWeb.Router do
  use EasyWeb, :router

  # ============================================
  # PIPELINES
  # ============================================

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :authenticated do
    plug EasyWeb.Plugs.EnsureAuthenticated
    plug EasyWeb.Plugs.LoadCurrentUser
  end

  # ============================================
  # HEALTH CHECK
  # ============================================

  scope "/api", EasyWeb do
    pipe_through :api

    get "/health", HealthController, :index
  end

  # ============================================
  # OAUTH 2.0 ENDPOINTS
  # ============================================

  scope "/oauth", EasyWeb do
    pipe_through :api

    post "/authorize", OAuthController, :authorize
    post "/token", OAuthController, :token
    post "/revoke", OAuthController, :revoke
    get "/userinfo", OAuthController, :userinfo
  end

  # ============================================
  # PUBLIC AUTHENTICATION ENDPOINTS
  # ============================================

  scope "/api/auth", EasyWeb do
    pipe_through :api

    post "/register", AuthController, :register
  end

  # ============================================
  # PUBLIC INVITATION ENDPOINTS
  # ============================================

  scope "/api/invitations", EasyWeb do
    pipe_through :api

    get "/:token", ClientController, :show_invitation
    post "/:token/accept", ClientController, :accept_invitation
  end

  # ============================================
  # AUTHENTICATED ONBOARDING ENDPOINTS
  # ============================================

  scope "/api/onboarding", EasyWeb do
    pipe_through [:api, :authenticated]

    post "/business", OnboardingController, :create_business
  end

  # ============================================
  # AUTHENTICATED BUSINESS ENDPOINTS
  # ============================================

  scope "/api/businesses", EasyWeb do
    pipe_through [:api, :authenticated]

    get "/:id", BusinessController, :show
    patch "/:id", BusinessController, :update
    get "/:id/coaches", BusinessController, :list_coaches
    get "/:id/clients", BusinessController, :list_clients
    get "/:id/subscription", BusinessController, :show_subscription
  end

  # ============================================
  # AUTHENTICATED COACH ENDPOINTS
  # ============================================

  scope "/api/coaches", EasyWeb do
    pipe_through [:api, :authenticated]

    get "/:id", CoachController, :show
    patch "/:id", CoachController, :update
    get "/:id/clients", CoachController, :list_clients
    post "/:id/clients/:client_id/assign", CoachController, :assign_client
    delete "/:id/clients/:client_id/unassign", CoachController, :unassign_client
  end

  # ============================================
  # AUTHENTICATED CLIENT ENDPOINTS
  # ============================================

  scope "/api/clients", EasyWeb do
    pipe_through [:api, :authenticated]

    get "/", ClientController, :index
    post "/invite", ClientController, :invite
    get "/:id", ClientController, :show
    patch "/:id", ClientController, :update
    get "/:id/coaches", ClientController, :list_coaches
    patch "/:id/status", ClientController, :update_status
  end
end
