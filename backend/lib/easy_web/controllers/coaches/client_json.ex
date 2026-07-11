defmodule EasyWeb.Coaches.ClientJSON do
  alias Easy.Clients.Client

  @spec show(map()) :: map()
  def show(%{client: client}) do
    %{data: data(client)}
  end

  @spec index(map()) :: map()
  def index(%{clients: clients, count: count, summary: summary}) do
    %{data: Enum.map(clients, &data/1), count: count, summary: summary}
  end

  @spec attention(map()) :: map()
  def attention(%{clients: clients, count: count}) do
    %{data: Enum.map(clients, &data/1), count: count}
  end

  defp data(%Client{} = client) do
    %{
      id: client.id,
      email: client.email,
      first_name: display_first_name(client),
      last_name: display_last_name(client),
      phone: client.phone,
      notes: client.notes,
      goal_weight_value: client.goal_weight_value,
      goal_weight_unit: client.goal_weight_unit,
      status: client.status,
      stage: client.stage,
      inactive_reason: client.inactive_reason,
      subscription_started_on: client.subscription_started_on,
      subscription_ends_on: client.subscription_ends_on,
      intake_incomplete: client.intake_incomplete,
      needs_plan: client.needs_plan,
      expiring_soon: client.expiring_soon,
      assigned_coach_id: client.assigned_coach_id,
      invite_url: Client.build_invite_url(client),
      invitation_sent_at: pending_only(client, client.invitation_sent_at),
      invitation_expires_at: pending_only(client, Client.invitation_expires_at(client)),
      inserted_at: client.inserted_at,
      updated_at: client.updated_at
    }
  end

  # User's name wins once the Client is linked — the User record is the global
  # identity. Fall back to the coach-set Client name when the User has no name
  # set, or when the User association isn't preloaded (pending clients, or the
  # invite/resend paths that don't preload).
  defp display_first_name(%Client{user: %Easy.Identity.User{first_name: n}, first_name: fallback})
       when n in [nil, ""],
       do: fallback

  defp display_first_name(%Client{user: %Easy.Identity.User{first_name: n}}), do: n
  defp display_first_name(%Client{first_name: n}), do: n

  defp display_last_name(%Client{user: %Easy.Identity.User{last_name: n}, last_name: fallback})
       when n in [nil, ""],
       do: fallback

  defp display_last_name(%Client{user: %Easy.Identity.User{last_name: n}}), do: n
  defp display_last_name(%Client{last_name: n}), do: n

  defp pending_only(%Client{status: :pending}, value), do: value
  defp pending_only(%Client{}, _value), do: nil
end
