defmodule EasyWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :easy

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? do
    plug(Phoenix.CodeReloader)
    plug(Phoenix.Ecto.CheckRepoStatus, otp_app: :easy)
  end

  plug(Plug.RequestId)
  plug(Plug.Telemetry, event_prefix: [:phoenix, :endpoint])

  plug(Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()
  )

  plug(Plug.MethodOverride)
  plug(Plug.Head)

  # CORS configuration for cross-origin requests
  plug(CORSPlug,
    origin: [
      # Development URLs
      "http://localhost:2020",
      "http://localhost:2021",
      "http://localhost:1314",
      "http://localhost:3000",
      "http://localhost:1313",
      "http://localhost:3001",
      "http://localhost:5173",
      "http://192.168.1.2:2020",
      "http://192.168.1.2:1313",
      "http://192.168.1.3:2020",
      "http://192.168.1.6:2020",
      "http://192.168.1.8:2020",
      "http://192.168.1.9:2020",
      "http://192.168.1.3:2021",
      "http://192.168.1.3:4173",
      "http://192.168.1.6:2021",
      "http://192.168.1.8:2021",
      "http://192.168.1.9:2021",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:5173",
      # Production URLs (update these for your domains)
      "https://api.coacheasy.app",
      "https://admin.coacheasy.app",
      "https://app.api.coacheasy.app",
      "https://coach.api.coacheasy.app",
      "https://client.api.coacheasy.app",
      "*"
    ],
    credentials: true,
    max_age: 86400,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    headers: [
      "Authorization",
      "Content-Type",
      "Accept",
      "Origin",
      "User-Agent",
      "DNT",
      "Cache-Control",
      "X-Mx-ReqToken",
      "Keep-Alive",
      "X-Requested-With",
      "If-Modified-Since",
      "X-CSRF-Token"
    ]
  )

  # Use the unified EasyWeb.Router
  plug(EasyWeb.Router)
end
