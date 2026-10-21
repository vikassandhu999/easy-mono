defmodule EasyWeb.Types.CoachProfile do
  use EasyWeb.Type

  alias Easy.Orgs.{Business, Coach}

  @type t :: %{
          required(:id) => String.t(),
          required(:full_name) => String.t() | nil,
          required(:preferred_name) => String.t() | nil,
          required(:email) => String.t(),
          required(:phone) => String.t() | nil,
          required(:is_owner) => boolean(),
          required(:business) => %{
            required(:id) => String.t(),
            required(:name) => String.t(),
            required(:handle) => String.t()
          }
        }

  @type update :: %{
          optional(:full_name) => String.t() | nil,
          optional(:preferred_name) => String.t() | nil,
          optional(:phone) => String.t() | nil,
          optional(:business_name) => String.t() | nil
        }

  @spec format(Coach.t()) :: t()
  def format(%Coach{} = coach) do
    %{
      id: coach.id,
      full_name: coach.full_name,
      preferred_name: coach.preferred_name,
      email: coach.user.email,
      phone: coach.phone,
      is_owner: coach.business.owner_user_id == coach.user_id,
      business: business(coach.business)
    }
  end

  defp business(%Business{} = business) do
    %{
      id: business.id,
      name: business.name,
      handle: business.handle
    }
  end
end
