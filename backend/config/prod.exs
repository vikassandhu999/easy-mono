import Config

# Configures Swoosh API Client
config :swoosh, api_client: Swoosh.ApiClient.Req

# Disable Swoosh Local Memory Storage
config :swoosh, local: false

# Do not print debug messages in production
config :logger, level: :info

# Cookie configuration for production - enforce Secure flag for HTTPS
config :easy, EasyWeb.CookieHelper, secure: true

# Runtime production configuration, including reading
# of environment variables, is done on config/runtime.exs.
