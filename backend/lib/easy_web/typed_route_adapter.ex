defmodule EasyWeb.TypedRouteAdapter do
  @behaviour EasyWeb.TypedRoute.Adapter

  alias Easy.Error
  alias EasyWeb.TypedRoute.Adapter
  alias Plug.Conn

  @auth_pipelines MapSet.new([:require_user, :require_coach, :require_client])

  @impl EasyWeb.TypedRoute.Adapter
  @spec enrich_routes(Adapter.routes(), list(), Macro.Env.t()) :: Adapter.routes()
  def enrich_routes(routes, _plugs, _env), do: routes

  @impl EasyWeb.TypedRoute.Adapter
  @spec headers(map(), Adapter.route()) :: [Adapter.header_requirement()]
  def headers(route, _typed) do
    if Enum.any?(route.pipe_through || [], &MapSet.member?(@auth_pipelines, &1)) do
      [%{name: "Authorization", required?: false}]
    else
      []
    end
  end

  @impl EasyWeb.TypedRoute.Adapter
  @spec reject(Conn.t(), map()) :: Conn.t()
  def reject(conn, fields) do
    error = Error.unprocessable(%{fields: fields})

    body = %{
      error_code: to_string(error.code),
      error_message: error.message,
      error_detail: error.detail
    }

    conn
    |> Conn.put_resp_content_type("application/json")
    |> Conn.send_resp(422, Jason.encode!(body))
    |> Conn.halt()
  end
end
