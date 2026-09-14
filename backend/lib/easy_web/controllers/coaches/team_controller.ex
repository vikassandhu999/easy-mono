defmodule EasyWeb.Coaches.TeamController do
  use EasyWeb, :typed_controller

  alias Easy.Coaches
  alias Easy.CoachInvitations
  alias EasyWeb.Types.TeamMember
  alias EasyWeb.Types.TeamMemberIndex

  typed(:index, query: TeamMember.list_query(), ok: {200, TeamMemberIndex.t()})
  typed(:show, path: %{id: Ecto.UUID.t()}, ok: {200, data(TeamMember.t())})
  typed(:invite, body: TeamMember.invite(), ok: {200, data(TeamMember.t())})
  typed(:resend_invite, path: %{id: Ecto.UUID.t()}, ok: {200, data(TeamMember.t())})
  typed(:revoke_invite, path: %{id: Ecto.UUID.t()}, ok: {200, data(TeamMember.t())})
  typed(:deactivate, path: %{id: Ecto.UUID.t()}, ok: {200, data(TeamMember.t())})
  typed(:reactivate, path: %{id: Ecto.UUID.t()}, ok: {200, data(TeamMember.t())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    opts = [
      cursor: conn.query_params["cursor"],
      limit: conn.query_params["limit"],
      search: conn.query_params["search"],
      status: conn.query_params["status"]
    ]

    with {:ok, page} <- Coaches.list_team(conn.assigns.ctx, opts) do
      team = Enum.map(page.coaches, &team_member(&1, &1.user_id == page.owner_id))
      ok(conn, %{data: team, count: page.count, next_cursor: page.next_cursor})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, coach} <- Coaches.get_team_member(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: team_member(coach, coach.user_id == conn.assigns.ctx.user_id)})
    end
  end

  @spec invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def invite(conn, _params) do
    with {:ok, coach} <- CoachInvitations.invite_trainer(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: team_member(coach, false)})
    end
  end

  @spec resend_invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def resend_invite(conn, _params) do
    coach_id = conn.path_params["id"]

    with {:ok, coach} <- CoachInvitations.resend_invite(conn.assigns.ctx, coach_id) do
      ok(conn, %{data: team_member(coach, false)})
    end
  end

  @spec revoke_invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def revoke_invite(conn, _params) do
    coach_id = conn.path_params["id"]

    with {:ok, coach} <- CoachInvitations.revoke_invite(conn.assigns.ctx, coach_id) do
      ok(conn, %{data: team_member(coach, false)})
    end
  end

  @spec deactivate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def deactivate(conn, _params) do
    coach_id = conn.path_params["id"]

    with {:ok, coach} <- Coaches.deactivate_trainer(conn.assigns.ctx, coach_id) do
      ok(conn, %{data: team_member(coach, false)})
    end
  end

  @spec reactivate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def reactivate(conn, _params) do
    coach_id = conn.path_params["id"]

    with {:ok, coach} <- Coaches.reactivate_trainer(conn.assigns.ctx, coach_id) do
      ok(conn, %{data: team_member(coach, false)})
    end
  end

  defp team_member(coach, is_owner), do: %{coach: coach, is_owner: is_owner}
end
