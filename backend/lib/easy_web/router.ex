defmodule EasyWeb.Router do
  use EasyWeb, :router

  # ============================================
  # PIPELINES
  # ============================================

  pipeline :api do
    plug :accepts, ["json"]
  end

  # pipeline :authenticate do
  #   plug EasyWeb.Plugs.Authenticate
  # end

  # pipeline :require_coach do
  #   plug EasyWeb.Plugs.RequireCoach
  # end

  # pipeline :require_client do
  #   plug EasyWeb.Plugs.RequireClient
  # end

  # Health check
  scope "/api", EasyWeb do
    pipe_through :api

    get "/health", HealthController, :index
  end

  # ============================================
  # PUBLIC ROUTES (No Authentication)
  # ============================================

  scope "/api/v1/auth", EasyWeb.Auth do
    pipe_through :api

    post "/request-otp", OTPController, :request
    post "/verify-otp", OTPController, :verify
    post "/refresh", SessionController, :refresh
    post "/logout", SessionController, :logout
  end

  # scope "/api/v1/invitations", EasyWeb.Invitations do
  #   pipe_through :api

  #   get "/:token", InvitationController, :show
  #   post "/:token/accept", InvitationController, :accept
  # end

  # # ============================================
  # # AUTHENTICATED USER ROUTES (Onboarding)
  # # ============================================

  # scope "/api/v1/onboarding", EasyWeb.Onboarding do
  #   pipe_through [:api, :authenticate]

  #   get "/status", OnboardingController, :status
  #   post "/business", OnboardingController, :create_business
  #   post "/complete", OnboardingController, :complete
  # end

  # # ============================================
  # # COACH ROUTES (Authenticated + Coach Role)
  # # ============================================

  # scope "/api/v1/coach", EasyWeb.Coach do
  #   pipe_through [:api, :authenticate, :require_coach]

  #   # Dashboard
  #   get "/dashboard", DashboardController, :index

  #   # Profile
  #   get "/profile", ProfileController, :show
  #   put "/profile", ProfileController, :update
  #   patch "/profile", ProfileController, :update

  #   # Business management
  #   get "/business", BusinessController, :show
  #   put "/business", BusinessController, :update
  #   patch "/business", BusinessController, :update

  #   # Client management
  #   get "/clients", ClientController, :index
  #   post "/clients", ClientController, :create
  #   get "/clients/:id", ClientController, :show
  #   put "/clients/:id", ClientController, :update
  #   patch "/clients/:id", ClientController, :update
  #   delete "/clients/:id", ClientController, :delete

  #   # Client invitations
  #   post "/clients/invite", ClientController, :invite
  #   post "/clients/:id/resend-invitation", ClientController, :resend_invitation

  #   # Client subscriptions (nested under client)
  #   get "/clients/:client_id/subscriptions", ClientSubscriptionController, :index
  #   post "/clients/:client_id/subscriptions", ClientSubscriptionController, :create

  #   # Subscriptions (direct access)
  #   get "/subscriptions", ClientSubscriptionController, :list_all
  #   get "/subscriptions/:id", ClientSubscriptionController, :show
  #   put "/subscriptions/:id", ClientSubscriptionController, :update
  #   patch "/subscriptions/:id", ClientSubscriptionController, :update
  #   delete "/subscriptions/:id", ClientSubscriptionController, :delete

  #   # Subscription actions
  #   post "/subscriptions/:id/record-payment", ClientSubscriptionController, :record_payment
  #   post "/subscriptions/:id/cancel", ClientSubscriptionController, :cancel
  # end

  # # ============================================
  # # CLIENT ROUTES (Authenticated + Client Role)
  # # ============================================

  # scope "/api/v1/client", EasyWeb.Client do
  #   pipe_through [:api, :authenticate, :require_client]

  #   # Dashboard
  #   get "/dashboard", DashboardController, :index

  #   # Profile
  #   get "/profile", ProfileController, :show
  #   put "/profile", ProfileController, :update
  #   patch "/profile", ProfileController, :update

  #   # Coach info
  #   get "/coach", CoachController, :show

  #   # Subscriptions (read-only)
  #   get "/subscriptions", SubscriptionController, :index
  #   get "/subscriptions/:id", SubscriptionController, :show
  # end
end
