if Mix.env() != :dev, do: raise("Billing browser API requires MIX_ENV=dev")
Application.put_env(:easy, Easy.Razorpay,
  key_id: "rzp_test_browser",
  key_secret: "browser-only-secret",
  plan_id: "plan_browser",
  seat_price_inr: 250,
  webhook_secret: "browser-only-webhook",
  req_options: [base_url: "http://127.0.0.1:44002/v1", retry: false]
)
Code.require_file("../conversations/dev-api.exs", __DIR__)
