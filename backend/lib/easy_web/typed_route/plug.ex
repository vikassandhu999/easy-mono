defmodule EasyWeb.TypedRoute.Plug do
  @behaviour Plug

  alias EasyWeb.TypedRoute.Cast
  alias Plug.Conn

  @spec init(keyword()) :: module()
  def init(opts), do: Keyword.fetch!(opts, :adapter)

  @spec call(Conn.t(), term()) :: Conn.t()
  def call(conn, adapter) do
    conn = Conn.fetch_query_params(conn)
    controller = conn.private[:phoenix_controller]
    action = conn.private[:phoenix_action]

    with true <- is_atom(controller),
         {:module, _} <- Code.ensure_loaded(controller),
         true <- function_exported?(controller, :__typed_route__, 1),
         %{} = route <- controller.__typed_route__(action) do
      cast(conn, route, adapter)
    else
      _ -> conn
    end
  end

  defp cast(conn, route, adapter) do
    with {:ok, body} <- Cast.body(conn.body_params, route.body),
         {:ok, query} <- Cast.query(conn.query_params, route.query),
         {:ok, path} <- Cast.path(conn.path_params, route.path) do
      conn
      |> Map.put(:body_params, body)
      |> Map.put(:query_params, query)
      |> Map.put(:path_params, path)
    else
      {:error, fields} ->
        adapter.reject(conn, fields)
    end
  end
end
