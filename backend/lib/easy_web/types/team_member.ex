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
          required(:invitation_sent_at) => DateTime.t() | nil
        }

  @type invite :: %{
          required(:email) => String.t(),
          optional(:first_name) => String.t() | nil,
          optional(:last_name) => String.t() | nil
        }

  @type list_query :: %{}

  @spec format(%{required(:coach) => Coach.t(), required(:is_owner) => boolean()}) :: t()
  def format(%{coach: %Coach{} = coach, is_owner: is_owner}) do
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
