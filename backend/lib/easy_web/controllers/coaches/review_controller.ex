defmodule EasyWeb.Coaches.ReviewController do
  use EasyWeb, :typed_controller
  alias Easy.Reviews
  alias Easy.Reviews.{Roster, Settings}
  alias EasyWeb.Types.{Review, ReviewIndex, ReviewRoster, ReviewRosterRow, ReviewScreen, ReviewSettings}
  typed(:roster, query: ReviewRosterRow.query(), ok: {200, ReviewRoster.t()})
  typed(:screen, path: %{client_id: Ecto.UUID.t()}, query: ReviewScreen.query(), ok: {200, data(ReviewScreen.t())})
  typed(:index, path: %{client_id: Ecto.UUID.t()}, query: Review.list_query(), ok: {200, ReviewIndex.t()})
  typed(:create, path: %{client_id: Ecto.UUID.t()}, body: Review.create(), ok: {201, data(Review.t())})
  typed(:update, path: %{client_id: Ecto.UUID.t(), id: Ecto.UUID.t()}, body: Review.update(), ok: {200, data(Review.t())})
  typed(:settings, ok: {200, data(ReviewSettings.t())})
  typed(:update_settings, body: ReviewSettings.update(), ok: {200, data(ReviewSettings.t())})

  @spec roster(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def roster(conn, _), do: with({:ok, result} <- Roster.list(conn.assigns.ctx, opts(conn)), do: ok(conn, result))
  @spec screen(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def screen(conn, _),
    do:
      with(
        {:ok, result} <- Reviews.screen_for_client(conn.assigns.ctx, conn.path_params["client_id"], opts(conn)),
        do: ok(conn, %{data: result})
      )

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _),
    do:
      with(
        {:ok, result} <- Reviews.history_for_client(conn.assigns.ctx, conn.path_params["client_id"], opts(conn)),
        do: ok(conn, result)
      )

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _),
    do:
      with(
        {:ok, result} <- Reviews.create_for_client(conn.assigns.ctx, conn.path_params["client_id"], conn.body_params),
        do: ok(conn, %{data: result})
      )

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _),
    do:
      with(
        {:ok, result} <-
          Reviews.update_for_client(
            conn.assigns.ctx,
            conn.path_params["client_id"],
            conn.path_params["id"],
            conn.body_params
          ),
        do: ok(conn, %{data: result})
      )

  @spec settings(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def settings(conn, _), do: with({:ok, result} <- Settings.get(conn.assigns.ctx), do: ok(conn, %{data: result}))
  @spec update_settings(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update_settings(conn, _),
    do: with({:ok, result} <- Settings.update(conn.assigns.ctx, conn.body_params), do: ok(conn, %{data: result}))

  @keys [
    :cursor,
    :limit,
    :q,
    :sort,
    :direction,
    :due,
    :assessment,
    :unread,
    :waiting,
    :last_reviewed,
    :from,
    :to,
    :state
  ]
  defp opts(conn),
    do:
      Enum.flat_map(@keys, fn key ->
        case Map.fetch(conn.query_params, to_string(key)) do
          {:ok, value} -> [{key, value}]
          :error -> []
        end
      end)
end
