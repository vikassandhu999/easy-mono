defmodule EasyWeb.TypedRoute.Plug do
  @behaviour Plug

  alias Easy.Error
  alias EasyWeb.TypedRoute.Cast
  alias Plug.Conn

  @spec init(term()) :: term()
  def init(opts), do: opts

  @spec call(Conn.t(), term()) :: Conn.t()
  def call(conn, _opts) do
    conn = Conn.fetch_query_params(conn)
    controller = conn.private[:phoenix_controller]
    action = conn.private[:phoenix_action]

    if controller && action && function_exported?(controller, :__typed_route__, 1) do
      case controller.__typed_route__(action) do
        nil -> conn
        route -> cast(conn, route)
      end
    else
      conn
    end
  end

  defp cast(conn, route) do
    with {:ok, body} <- Cast.body(conn.body_params, route.body),
         {:ok, query} <- Cast.query(conn.query_params, route.query),
         {:ok, path} <- Cast.path(conn.path_params, route.path) do
      conn
      |> Map.put(:body_params, body)
      |> Map.put(:query_params, query)
      |> Map.put(:path_params, path)
    else
      {:error, fields} ->
        reject(conn, fields)
    end
  end

  defp reject(conn, fields) do
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
