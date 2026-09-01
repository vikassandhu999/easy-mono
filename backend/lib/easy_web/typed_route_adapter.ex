defmodule EasyWeb.TypedRouteAdapter do
  @behaviour EasyWeb.TypedRoute.Adapter

  alias Easy.Error
  alias EasyWeb.Plugs.Idempotency
  alias Plug.Conn

  @auth_pipelines MapSet.new([:require_user, :require_coach, :require_client])

  @impl EasyWeb.TypedRoute.Adapter
  def enrich_routes(routes, plugs, env) do
    Map.new(routes, fn {action, route} ->
      headers = if Enum.any?(plugs, &plug_applies?(&1, Idempotency, action, env)), do: [:idempotency], else: []
      {action, Map.put(route, :headers, headers)}
    end)
  end

  @impl EasyWeb.TypedRoute.Adapter
  def headers(route, typed) do
    authorization =
      if Enum.any?(route.pipe_through || [], &MapSet.member?(@auth_pipelines, &1)) do
        [%{name: "Authorization", required?: false}]
      else
        []
      end

    idempotency =
      if :idempotency in Map.get(typed, :headers, []) do
        [%{name: "Idempotency-Key", required?: true}]
      else
        []
      end

    authorization ++ idempotency
  end

  @impl EasyWeb.TypedRoute.Adapter
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

  defp plug_applies?({plug, _opts, guard}, expected, action, env) do
    plug = Macro.expand(plug, env)

    if plug == expected do
      {applies?, _binding} = Code.eval_quoted(guard, [action: action], env)
      applies? == true
    else
      false
    end
  end
end
