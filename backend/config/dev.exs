import Config

# Set environment to :dev
config :easy, :environment, :dev

# Configure your database
config :easy, Easy.Repo,
  username: "admin",
  password: "L2KjxOH9al",
  hostname: "localhost",
  database: "easy_dev_refactoring",
  stacktrace: true,
  show_sensitive_data_on_connection_error: true,
  pool_size: 10

# For development, we disable any cache and enable
# debugging and code reloading.
#
# The watchers configuration can be used to run external
# watchers to your application. For example, we can use it
# to bundle .js and .css sources.
config :easy, EasyWeb.Endpoint,
  # Binding to loopback ipv4 address prevents access from other machines.
  # Change to `ip: {0, 0, 0, 0}` to allow access from other machines.
  http: [ip: {0, 0, 0, 0}, port: 4000],
  check_origin: false,
  code_reloader: true,
  debug_errors: false,
  secret_key_base: "RAAfGUm9emTKfbukUTJcJnM+vcAKFWhNOdfT2ZQG9l7Cctc0NN5f1JBT9p1RoAvY",
  watchers: []

# Do not include metadata nor timestamps in development logs
config :logger, :console, format: "[$level] $message\n"

# Set a higher stacktrace during development. Avoid configuring such
# in production as building large stacktraces may be expensive.
config :phoenix, :stacktrace_depth, 20

# Initialize plugs at runtime for faster development compilation
config :phoenix, :plug_init_mode, :runtime

# Disable swoosh api client as it is only required for production adapters.
config :swoosh, :api_client, false

config :easy, Easy.Mailer,
  adapter: Resend.Swoosh.Adapter,
  api_key: "re_HKFHoitN_AM3vmGGVdwxCSLqTmxQWW8zG"

# Authentication and JWT configuration for development
config :easy, :jwt_secret, "dev-secret-key-minimum-32-characters-long-for-hs256"

# CORS in dev is permissive by default: EasyWeb.Cors.origins/0 falls back to "*" when
# :easy/:cors_origins is unset (only prod sets it from CORS_ALLOWED_ORIGINS).

# Cookie configuration for development - disable Secure flag for HTTP
config :easy, EasyWeb.CookieHelper, secure: false

# Frontend URLs for development
config :easy,
  frontend_url: "http://localhost:2020",
  client_frontend_url: "http://localhost:1314"
