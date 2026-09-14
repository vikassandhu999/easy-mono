Application.put_env(:easy, Easy.Storage,
  endpoint: "http://127.0.0.1:44001",
  region: "local",
  bucket: "chat-browser",
  access_key_id: "browser-test",
  secret_access_key: "browser-test"
)

Code.require_file("../auth/dev-api.exs", __DIR__)
