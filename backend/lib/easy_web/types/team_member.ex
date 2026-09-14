defmodule EasyWeb.Types.TeamMember do
  use EasyWeb.Type

  alias Easy.Orgs.Coach

  @type t :: %{
          required(:id) => String.t(),
          required(:first_name) => String.t() | nil,
          required(:last_name) => String.t() | nil,
          required(:email) => String.t() | nil,
          required(:status) => :invited | :active | :inactive,
          required(:is_owner) => boolean(),
          required(:assigned_client_count) => non_neg_integer(),
          required(:invitation_expires_at) => DateTime.t() | nil,
          required(:invitation_expired) => boolean(),
          required(:invitation_sent_at) => DateTime.t() | nil
        }

  @type invite :: %{
          required(:email) => String.t(),
          optional(:first_name) => String.t() | nil,
          optional(:last_name) => String.t() | nil
        }

  @type list_query :: %{
          optional(:cursor) => String.t(),
          optional(:limit) => integer(),
          optional(:search) => String.t(),
          optional(:status) => :active | :invited | :inactive
        }
  @spec format(%{required(:coach) => Coach.t(), required(:is_owner) => boolean()}) :: t()
  def format(%{coach: %Coach{} = coach, is_owner: is_owner}) do
    %{
      id: coach.id,
      first_name: coach.first_name,
      last_name: coach.last_name,
      email: email(coach),
      status: coach.status,
      is_owner: is_owner,
      assigned_client_count: coach.assigned_client_count,
      invitation_expires_at: Coach.invitation_expires_at(coach),
      invitation_expired: coach.status == :invited and Coach.invitation_expired?(coach, DateTime.utc_now()),
      invitation_sent_at: coach.invitation_sent_at
    }
  end

  defp email(%Coach{user: %Easy.Identity.User{email: email}}), do: email
  defp email(%Coach{email: email}), do: email
end
