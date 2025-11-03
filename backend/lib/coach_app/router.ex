defmodule CoachApp.Router do
  use CoachApp, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/v1", CoachApp do
    pipe_through :api

    # Authentication routes matching Go backend
    # Signup flow
    post "/auth/signup", AuthController, :signup
    post "/auth/verify", AuthController, :verify_signup
    # post "/auth/verify-resend", AuthController, :resend

    # # Login flow
    # post "/auth/send-passcode", AuthController, :send_passcode
    # post "/auth/token", AuthController, :token

    # # Password reset flow
    # post "/auth/password-reset", AuthController, :send_password_reset
    # post "/auth/password-confirm", AuthController, :confirm_password_reset

    # # Logout
    # post "/auth/logout", AuthController, :logout
  end
end
