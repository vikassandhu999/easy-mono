defmodule EasyWeb.Types.CoachProfile do
  use EasyWeb.Type

  alias Easy.Orgs.{Business, Coach}

  @type t :: %{
          required(:id) => String.t(),
          required(:first_name) => String.t() | nil,
          required(:last_name) => String.t() | nil,
          required(:email) => String.t(),
          required(:phone) => String.t() | nil,
          required(:is_owner) => boolean(),
          required(:business) => %{
            required(:id) => String.t(),
            required(:name) => String.t(),
            required(:slug) => String.t(),
            required(:whatsapp_number) => String.t() | nil
          }
        }

  @type update :: %{
          optional(:first_name) => String.t() | nil,
          optional(:last_name) => String.t() | nil,
          optional(:phone) => String.t() | nil,
          optional(:business_name) => String.t() | nil,
          optional(:whatsapp_number) => String.t() | nil
        }

  @spec format(Coach.t()) :: t()
  def format(%Coach{} = coach) do
    %{
      id: coach.id,
      first_name: coach.first_name,
      last_name: coach.last_name,
      email: coach.user.email,
      phone: coach.phone,
      is_owner: coach.business.owner_id == coach.user_id,
      business: business(coach.business)
    }
  end

  defp business(%Business{} = business) do
    %{
      id: business.id,
      name: business.name,
      slug: business.handle,
      whatsapp_number: business.whatsapp_number
    }
  end
end
