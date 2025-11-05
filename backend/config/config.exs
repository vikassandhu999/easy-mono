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
  # OTP token settings
  otp_expiry_minutes: 15,
  otp_max_attempts: 5,

  # Session settings
  session_expiry_days: 30,
  access_token_expiry_minutes: 15,

  # Cleanup settings
  cleanup_expired_tokens_older_than_days: 7,
  cleanup_old_sessions_older_than_days: 90

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

# Configures Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
