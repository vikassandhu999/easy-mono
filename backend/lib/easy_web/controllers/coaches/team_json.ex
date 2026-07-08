defmodule EasyWeb.Coaches.TeamJSON do
  alias Easy.Orgs.Coach

  @spec index(map()) :: map()
  def index(%{coaches: coaches, owner_id: owner_id}) do
    %{data: Enum.map(coaches, &data(&1, &1.user_id == owner_id))}
  end

  # Invite/resend/revoke/deactivate always act on a non-owner coach row — the owner
  # can neither invite themselves (`:already_on_team`) nor deactivate themselves
  # (`:cannot_deactivate_owner`) — so these single-row actions skip the business
  # lookup the list needs to compute `is_owner` per row.
  @spec show(map()) :: map()
  def show(%{coach: coach}) do
    %{data: data(coach, false)}
  end

  defp data(%Coach{} = coach, is_owner) do
    %{
      id: coach.id,
      first_name: coach.first_name,
      last_name: coach.last_name,
      email: coach.email,
      status: coach.status,
      is_owner: is_owner,
      invitation_sent_at: coach.invitation_sent_at
    }
  end
end
