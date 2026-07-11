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

# Fixed OTP in dev — every login code is 123456, no email-reading needed.
config :easy, fixed_otp: "123456"

config :easy, Easy.Storage,
  endpoint: "https://t3.storage.dev",
  region: "auto",
  bucket: "easy-dev-placeholder",
  access_key_id: "dev-access-key",
  secret_access_key: "dev-secret-key"

# Razorpay dev defaults (safe dummies). Real test-mode keys go in
# config/dev.secret.exs (gitignored) — see that file's header for the shape.
# Env vars (RAZORPAY_*) still override both via runtime.exs.
config :easy, Easy.Razorpay,
  key_id: "rzp_test_dev",
  key_secret: "dev_secret",
  webhook_secret: "dev_webhook_secret",
  plan_id: "plan_dev",
  seat_price_inr: 499

config :easy, Easy.Razorpay,
  key_id: "rzp_test_TASOVXlFUzkEEH",
  key_secret: "F2JbFeYuamb3MqzxxVqoMn7D",
  plan_id: "plan_TASTEwKz6D6kGu",
  webhook_secret: "LuXHIpP3sqmYQBQACPOB94huCh/KyylCIl4dR5+kkHLuNQNJt1vrfK13NBW8sHMw"

if File.exists?(Path.expand("dev.secret.exs", __DIR__)) do
  import_config "dev.secret.exs"
end
