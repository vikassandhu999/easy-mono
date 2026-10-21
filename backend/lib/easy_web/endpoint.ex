defmodule EasyWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :easy

  socket "/socket", EasyWeb.UserSocket,
    websocket: true,
    longpoll: false

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
    json_decoder: Phoenix.json_library(),
    body_reader: {EasyWeb.Plugs.CacheRawBody, :read_body, []}
  )

  plug(Plug.MethodOverride)
  plug(Plug.Head)

  # CORS — origins governed by CORS_ALLOWED_ORIGINS in prod, permissive fallback otherwise.
  # See EasyWeb.Cors. (Evaluated per request, so runtime config applies.)
  plug(CORSPlug,
    origin: &EasyWeb.Cors.origins/0,
    credentials: true,
    max_age: 86_400,
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
