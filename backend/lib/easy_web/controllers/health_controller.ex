defmodule EasyWeb.HealthController do
  use EasyWeb, :controller
  use EasyWeb.TypedRoute

  alias EasyWeb.Types.Health

  typed(:index, ok: {200, Health.t()})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    ok(conn, %{
      status: "ok",
      service: "easy-backend",
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
      version: "1.0.0"
    })
  end
end
