# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :easy,
  ecto_repos: [Easy.Repo],
  generators: [timestamp_type: :utc_datetime]

# Authentication and Session Configuration
config :easy, :auth,
  # OTP token settings (Requirements 2.4, 2.5)
  otp_expiry_minutes: 10,
  otp_max_attempts: 3,
  invitation_expiry_days: 7,

  # Rate limiting settings (Requirements 9.2, 9.3, 14.3)
  rate_limit_window_minutes: 15,
  rate_limit_max_requests: 3,

  # Session settings (Requirement 8.5)
  session_expiry_days: 7,
  access_token_expiry_days: 7,
  refresh_token_expiry_days: 30,

  # Cleanup settings (Requirement 14.4)
  cleanup_expired_tokens_older_than_days: 7,
  cleanup_old_sessions_older_than_days: 90

# JWT Token Configuration
# JWT secret is configured in runtime.exs for all environments
config :easy, :jwt,
  # Token expiration times
  access_token_ttl_days: 7,
  refresh_token_ttl_days: 30,
  # Algorithm used for signing (HS256 - HMAC with SHA-256)
  algorithm: "HS256"

# Configures the endpoint
config :easy, EasyWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: EasyWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: Easy.PubSub,
  live_view: [signing_salt: "7DsK08zq"]

# Configures the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.
config :easy, Easy.Mailer, adapter: Swoosh.Adapters.Local

# Email delivery configuration
config :easy, :email,
  # From email address for all outgoing emails
  from_email: {"Easy Coaching", "noreply@easycoaching.com"},
  # Base URL for invitation links (overridden in runtime.exs)
  app_url: "http://localhost:4000"

# Configures Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
