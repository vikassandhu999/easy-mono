import Config

# Configures Swoosh API Client
config :swoosh, api_client: Swoosh.ApiClient.Req

# Disable Swoosh Local Memory Storage
config :swoosh, local: false

# Do not print debug messages in production
config :logger, level: :info

# CORS configuration for production - restrict to specific domains
config :cors_plug,
  origin: [
    "https://yourdomain.com",
    "https://app.yourdomain.com",
    "https://coach.yourdomain.com",
    "https://client.yourdomain.com"
  ],
  credentials: true

# Authentication configuration for production
config :easy, Easy.Accounts.Token,
  secret_key: System.get_env("JWT_SECRET_KEY") || "change-me-in-production"

# Cookie configuration for production - enforce Secure flag for HTTPS
config :easy, EasyWeb.CookieHelper, secure: true

# Runtime production configuration, including reading
# of environment variables, is done on config/runtime.exs.
