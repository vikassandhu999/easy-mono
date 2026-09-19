defmodule EasyWeb.Types.ClientProfile do
  use EasyWeb.Type

  alias Easy.Clients.Client
  alias Easy.Orgs.{Business, Coach}

  @type t :: %{
          required(:id) => String.t(),
          required(:first_name) => String.t() | nil,
          required(:last_name) => String.t() | nil,
          required(:email) => String.t() | nil,
          required(:phone) => String.t() | nil,
          required(:goal_weight_value) => Decimal.t() | nil,
          required(:goal_weight_unit) => String.t() | nil,
          required(:default_weight_unit) => :kg | :lbs,
          required(:timezone) => String.t(),
          required(:local_date) => Date.t(),
          required(:subscription_started_on) => Date.t() | nil,
          required(:subscription_ends_on) => Date.t() | nil,
          required(:status) => String.t(),
          required(:coach) =>
            %{
              required(:first_name) => String.t() | nil,
              required(:last_name) => String.t() | nil,
              required(:phone) => String.t() | nil,
              required(:business_name) => String.t()
            }
            | nil
        }

  @type update :: %{
          optional(:first_name) => String.t() | nil,
          optional(:last_name) => String.t() | nil,
          optional(:phone) => String.t() | nil,
          optional(:goal_weight_value) => number() | nil,
          optional(:goal_weight_unit) => String.t() | nil
        }

  @spec format(Easy.ClientAccount.account_profile()) :: t()
  def format(%{client: %Client{} = client, coach: coach, default_weight_unit: default_weight_unit} = profile) do
    %{
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone,
      goal_weight_value: client.goal_weight_value,
      goal_weight_unit: format_unit(client.goal_weight_unit),
      default_weight_unit: default_weight_unit,
      timezone: profile.timezone,
      local_date: profile.local_date,
      subscription_started_on: client.subscription_started_on,
      subscription_ends_on: client.subscription_ends_on,
      status: Atom.to_string(client.status),
      coach: coach(coach)
    }
  end

  defp coach(nil), do: nil

  defp coach(%Coach{business: %Business{} = business} = coach) do
    %{
      first_name: coach.first_name,
      last_name: coach.last_name,
      phone: coach.phone,
      business_name: business.name
    }
  end

  defp format_unit(nil), do: nil
  defp format_unit(unit), do: Atom.to_string(unit)
end
