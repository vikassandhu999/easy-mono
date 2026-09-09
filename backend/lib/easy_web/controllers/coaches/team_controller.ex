defmodule EasyWeb.Coaches.TeamController do
  use EasyWeb, :typed_controller

  alias Easy.Coaches
  alias Easy.CoachInvitations
  alias EasyWeb.Types.TeamMember

  typed(:index, query: TeamMember.list_query(), ok: {200, data([TeamMember.t()])})
  typed(:invite, body: TeamMember.invite(), ok: {200, data(TeamMember.t())})
  typed(:resend_invite, ok: {200, data(TeamMember.t())})
  typed(:revoke_invite, ok: {200, data(TeamMember.t())})
  typed(:deactivate, ok: {200, data(TeamMember.t())})
  typed(:reactivate, ok: {200, data(TeamMember.t())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, %{coaches: coaches, owner_id: owner_id}} <- Coaches.list_team(conn.assigns.ctx) do
      team = Enum.map(coaches, &team_member(&1, &1.user_id == owner_id))
      ok(conn, %{data: team})
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
