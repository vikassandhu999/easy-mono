import Config

# Configure your database
#
# The MIX_TEST_PARTITION environment variable can be used
# to provide built-in test partitioning in CI environment.
# Run `mix help test` for more information.
config :easy, Easy.Repo,
  username: "admin",
  password: "L2KjxOH9al",
  hostname: "localhost",
  database: "easy_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: System.schedulers_online() * 2

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :easy, EasyWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "RAAfGUm9emTKfbukUTJcJnM+vcAKFWhNOdfT2ZQG9l7Cctc0NN5f1JBT9p1RoAvY",
  server: false

# In test we don't send emails
config :easy, Easy.Mailer, adapter: Swoosh.Adapters.Test

# Disable swoosh api client as it is only required for production adapters
config :swoosh, :api_client, false

# Print only warnings and errors during test
config :logger, level: :warning

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime

# Cookie configuration for tests - disable Secure flag for HTTP
config :easy, EasyWeb.CookieHelper, secure: false

config :easy, Easy.Razorpay,
  key_id: "rzp_test_key",
  key_secret: "test_secret",
  webhook_secret: "test_webhook_secret",
  plan_id: "plan_test",
  seat_price_inr: 499,
  req_options: [plug: {Req.Test, Easy.Razorpay}]
