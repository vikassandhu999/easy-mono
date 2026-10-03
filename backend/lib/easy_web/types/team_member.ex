defmodule EasyWeb.Types.TeamMember do
  use EasyWeb.Type

  alias Easy.AppLinks
  alias Easy.Orgs.Coach

  @type t :: %{
          required(:id) => String.t(),
          required(:full_name) => String.t() | nil,
          required(:preferred_name) => String.t() | nil,
          required(:email) => String.t() | nil,
          required(:state) => :invited | :active | :removed,
          required(:is_owner) => boolean(),
          required(:assigned_client_count) => non_neg_integer(),
          required(:invitation_expires_at) => DateTime.t() | nil,
          required(:invitation_expired) => boolean(),
          required(:phone) => String.t() | nil,
          required(:removed_on) => Date.t() | nil,
          required(:invite_url) => String.t() | nil,
          required(:invited_at) => DateTime.t() | nil
        }

  @type invite :: %{
          required(:email) => String.t(),
          required(:full_name) => String.t(),
          optional(:preferred_name) => String.t() | nil,
          optional(:phone) => String.t() | nil
        }

  @type list_query :: %{
          optional(:cursor) => String.t(),
          optional(:limit) => integer(),
          optional(:q) => String.t(),
          optional(:state) => :active | :invited | :removed
        }
  @spec format(%{required(:coach) => Coach.t(), required(:is_owner) => boolean()}) :: t()
  def format(%{coach: %Coach{} = coach, is_owner: is_owner}) do
    %{
      id: coach.id,
      full_name: coach.full_name,
      preferred_name: coach.preferred_name,
      email: email(coach),
      state: Coach.state(coach),
      is_owner: is_owner,
      assigned_client_count: coach.assigned_client_count,
      invitation_expires_at: Coach.invitation_expires_at(coach),
      invitation_expired: Coach.state(coach) == :invited and Coach.invitation_expired?(coach, DateTime.utc_now()),
      invited_at: coach.invited_at,
      phone: coach.phone,
      removed_on: coach.removed_on,
      invite_url: if(coach.invite_token, do: AppLinks.coach_invitation(coach.invite_token))
    }
  end

  defp email(%Coach{user: %Easy.Identity.User{email: email}}), do: email
  defp email(%Coach{email: email}), do: email
end
