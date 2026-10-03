defmodule EasyWeb.Types.Business do
  use EasyWeb.Type
  alias Easy.Billing.BusinessBilling

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:handle) => String.t(),
          required(:timezone) => String.t(),
          required(:seats) => %{required(:limit) => non_neg_integer(), required(:used) => non_neg_integer()},
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }
  @type create :: %{
          required(:name) => String.t(),
          required(:handle) => String.t(),
          required(:full_name) => String.t(),
          optional(:preferred_name) => String.t(),
          optional(:timezone) => String.t()
        }
  @type update :: %{optional(:name) => String.t(), optional(:handle) => String.t(), optional(:timezone) => String.t()}
  @type timezone_options :: %{required(:timezones) => [String.t()]}
  @type availability_query :: %{required(:handle) => String.t()}
  @type availability :: %{required(:available) => boolean()}
  @spec format(Easy.Orgs.Business.t()) :: t()
  def format(business),
    do: %{
      id: business.id,
      name: business.name,
      handle: business.handle,
      timezone: business.timezone,
      seats: %{limit: BusinessBilling.seat_limit(business.billing), used: business.seats_used},
      inserted_at: business.inserted_at,
      updated_at: business.updated_at
    }
end
