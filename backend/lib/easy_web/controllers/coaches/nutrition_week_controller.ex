defmodule EasyWeb.Coaches.NutritionWeekController do
  use EasyWeb, :typed_controller
  alias Easy.Nutrition

  alias EasyWeb.Types.Nutrition.{
    NutritionPreset,
    NutritionPresetIndex,
    NutritionSchedule,
    NutritionTargets,
    NutritionWeek
  }

  typed(:show, query: NutritionWeek.query(), ok: {200, data(NutritionWeek.t())})
  typed(:presets, query: NutritionPreset.list_query(), ok: {200, NutritionPresetIndex.t()})
  typed(:create_preset, body: NutritionPreset.create(), ok: {201, NutritionPreset.mutation()})
  typed(:update_preset, body: NutritionPreset.update(), ok: {200, NutritionPreset.mutation()})
  typed(:archive_preset, ok: {200, NutritionWeek.mutation()})
  typed(:create_schedule, body: NutritionSchedule.create(), ok: {201, NutritionSchedule.mutation()})
  typed(:update_schedule, body: NutritionSchedule.update(), ok: {200, NutritionSchedule.mutation()})
  typed(:remove_schedule, query: NutritionSchedule.remove_query(), ok: {200, NutritionWeek.mutation()})
  typed(:create_targets, body: NutritionTargets.create(), ok: {201, NutritionTargets.mutation()})
  typed(:update_targets, body: NutritionTargets.update(), ok: {200, NutritionTargets.mutation()})

  typed(:assign_targets,
    path: %{weekday: pos_integer()},
    body: NutritionTargets.assign(),
    ok: {200, NutritionWeek.mutation()}
  )

  typed(:undo, body: NutritionWeek.undo(), ok: {200, data(NutritionWeek.t())})
  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, week} <-
           Nutrition.read_week_for_client(conn.assigns.ctx, conn.path_params["client_id"], on: conn.query_params["on"]),
         do: ok(conn, %{data: week})
  end

  @spec presets(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def presets(conn, _params) do
    q = conn.query_params

    with {:ok, page} <-
           Nutrition.list_presets_for_client(conn.assigns.ctx, conn.path_params["client_id"],
             search: q["search"],
             type: q["type"],
             cursor: q["cursor"],
             limit: q["limit"]
           ),
         do: ok(conn, page)
  end

  @spec create_preset(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create_preset(conn, _params) do
    with {:ok, result} <-
           Nutrition.create_preset_for_client(conn.assigns.ctx, conn.path_params["client_id"], conn.body_params),
         do: ok(conn, result)
  end

  @spec update_preset(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update_preset(conn, _params) do
    with {:ok, result} <-
           Nutrition.update_preset_for_client(
             conn.assigns.ctx,
             conn.path_params["client_id"],
             conn.path_params["id"],
             conn.body_params
           ),
         do: ok(conn, result)
  end

  @spec archive_preset(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def archive_preset(conn, _params) do
    with {:ok, result} <-
           Nutrition.archive_preset_for_client(conn.assigns.ctx, conn.path_params["client_id"], conn.path_params["id"]),
         do: ok(conn, result)
  end

  @spec create_schedule(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create_schedule(conn, _params) do
    with {:ok, result} <-
           Nutrition.add_schedule_for_client(conn.assigns.ctx, conn.path_params["client_id"], conn.body_params),
         do: ok(conn, result)
  end

  @spec update_schedule(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update_schedule(conn, _params) do
    with {:ok, result} <-
           Nutrition.update_schedule_for_client(
             conn.assigns.ctx,
             conn.path_params["client_id"],
             conn.path_params["id"],
             conn.body_params
           ),
         do: ok(conn, result)
  end

  @spec remove_schedule(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def remove_schedule(conn, _params) do
    with {:ok, result} <-
           Nutrition.remove_schedule_for_client(
             conn.assigns.ctx,
             conn.path_params["client_id"],
             conn.path_params["id"],
             conn.query_params["weekday"]
           ),
         do: ok(conn, result)
  end

  @spec create_targets(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create_targets(conn, _params) do
    with {:ok, result} <-
           Nutrition.create_targets_for_client(conn.assigns.ctx, conn.path_params["client_id"], conn.body_params),
         do: ok(conn, result)
  end

  @spec update_targets(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update_targets(conn, _params) do
    with {:ok, result} <-
           Nutrition.update_targets_for_client(
             conn.assigns.ctx,
             conn.path_params["client_id"],
             conn.path_params["id"],
             conn.body_params
           ),
         do: ok(conn, result)
  end

  @spec assign_targets(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def assign_targets(conn, _params) do
    with {:ok, result} <-
           Nutrition.assign_targets_for_client(
             conn.assigns.ctx,
             conn.path_params["client_id"],
             conn.path_params["weekday"],
             conn.body_params
           ),
         do: ok(conn, result)
  end

  @spec undo(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def undo(conn, _params) do
    with {:ok, week} <-
           Nutrition.undo_for_client(conn.assigns.ctx, conn.path_params["client_id"], conn.body_params.token),
         do: ok(conn, %{data: week})
  end
end
