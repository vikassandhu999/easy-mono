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
  # OAUTH 2.0 ENDPOINTS (DEPRECATED)
  # ============================================
  # DEPRECATED: These OAuth 2.0 endpoints are maintained for backward compatibility only.
  # New integrations should use the simplified authentication endpoints under /api/auth:
  #   - POST /api/auth/send-otp - Generate and send OTP
  #   - POST /api/auth/verify-otp - Verify OTP and create session
  #   - POST /api/auth/refresh - Refresh access token
  #   - POST /api/auth/logout - Revoke session
  #
  # The OAuth endpoints will be removed in a future version.
  # Please migrate to the new authentication flow.

  scope "/oauth", EasyWeb do
    pipe_through :api

    # DEPRECATED: Use POST /api/auth/send-otp instead
    post "/authorize", OAuthController, :authorize

    # DEPRECATED: Use POST /api/auth/verify-otp instead
    post "/token", OAuthController, :token

    # DEPRECATED: Use POST /api/auth/logout instead
    post "/revoke", OAuthController, :revoke

    # DEPRECATED: User info is now included in verify-otp response
    get "/userinfo", OAuthController, :userinfo
  end

  # ============================================
  # PUBLIC AUTHENTICATION ENDPOINTS
  # ============================================

  scope "/api/auth", EasyWeb do
    pipe_through :api

    post "/register", AuthController, :register
    post "/send-otp", AuthController, :send_otp
    post "/verify-otp", AuthController, :verify_otp
    post "/refresh", AuthController, :refresh
  end

  # ============================================
  # AUTHENTICATED AUTH ENDPOINTS
  # ============================================

  scope "/api/auth", EasyWeb do
    pipe_through [:api, :authenticated]

    post "/logout", AuthController, :logout
  end

  # ============================================
  # PUBLIC INVITATION ENDPOINTS
  # ============================================

  scope "/api/invitations", EasyWeb do
    pipe_through :api

    get "/:token_id", ClientController, :show_invitation
    post "/:token_id/accept", ClientController, :accept_invitation
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
