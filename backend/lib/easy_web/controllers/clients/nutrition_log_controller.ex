defmodule EasyWeb.Clients.NutritionLogController do
  use EasyWeb, :typed_controller
  alias Easy.NutritionLogs
  alias EasyWeb.Types.{LogRestore, NutritionLog}
  alias EasyWeb.Types.Nutrition.{Food, FoodIndex}

  typed(:foods, query: Food.list_query(), ok: {200, FoodIndex.t()})
  typed(:show, path: %{id: Ecto.UUID.t()}, ok: {200, data(NutritionLog.t())})
  typed(:create, body: NutritionLog.create(), ok: {201, data(NutritionLog.t())})
  typed(:update, path: %{id: Ecto.UUID.t()}, body: NutritionLog.update(), ok: {200, NutritionLog.mutation()})
  typed(:delete, path: %{id: Ecto.UUID.t()}, ok: {200, LogRestore.t()})
  typed(:restore, body: LogRestore.t(), ok: {200, data(NutritionLog.t())})

  @spec foods(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def foods(conn, _params) do
    opts =
      Enum.flat_map([:search, :kind, :cursor, :limit], fn key ->
        case Map.fetch(conn.query_params, to_string(key)) do
          {:ok, value} -> [{key, value}]
          :error -> []
        end
      end)

    with {:ok, page} <- NutritionLogs.list_client_foods(conn.assigns.ctx, opts) do
      ok(conn, page)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, row} <- NutritionLogs.get_client_nutrition_log(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: row})
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, row} <- NutritionLogs.create_client_nutrition_log(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: row})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, result} <- NutritionLogs.update_client_nutrition_log(conn.assigns.ctx, conn.path_params["id"], conn.body_params) do
      ok(conn, result)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    with {:ok, result} <- NutritionLogs.delete_client_nutrition_log(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, result)
    end
  end

  @spec restore(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def restore(conn, _params) do
    with {:ok, row} <- NutritionLogs.restore_client_nutrition_log(conn.assigns.ctx, conn.body_params.undo_token) do
      ok(conn, %{data: row})
    end
  end
end
