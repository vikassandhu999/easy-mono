defmodule CoachApp.Router do
  use CoachApp, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", CoachApp do
    pipe_through :api

    # Authentication routes
    # Signup flow
    post "/auth/signup", AuthController, :signup
    post "/auth/verify", AuthController, :verify
    post "/auth/resend", AuthController, :resend

    # Login flow
    post "/auth/login/send", AuthController, :send_login_passcode
    post "/auth/token", AuthController, :generate_token

    # Password reset flow
    post "/auth/password/reset/send", AuthController, :send_password_reset
    post "/auth/password/reset/confirm", AuthController, :confirm_password_reset

    # Logout
    post "/auth/logout", AuthController, :logout
  end
end
