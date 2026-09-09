defmodule EasyWeb.HealthController do
  use EasyWeb, :typed_controller

  alias EasyWeb.Types.Health

  typed(:index, ok: {200, Health.t()})
  typed(:ready, ok: {204, nil})

  @spec ready(Plug.Conn.t(), map()) :: Plug.Conn.t() | {:error, :database_unavailable}
  def ready(conn, _params) do
    with {:ok, :ready} <- Easy.Health.check_readiness() do
      ok(conn)
    end
  end

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
