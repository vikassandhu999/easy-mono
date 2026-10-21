defmodule EasyWeb.Types.ClientProfile do
  use EasyWeb.Type
  alias Easy.Clients.Client
  alias EasyWeb.Types.CoachingTerm

  @type t :: %{
          required(:id) => String.t(),
          required(:focus) => String.t() | nil,
          required(:full_name) => String.t(),
          required(:preferred_name) => String.t() | nil,
          required(:email) => String.t() | nil,
          required(:phone) => String.t() | nil,
          required(:unit_system) => :metric | :imperial,
          required(:timezone) => String.t(),
          required(:local_date) => Date.t(),
          required(:state) => :active | :ending_soon | :joined | :invited | :ended,
          required(:current_term) => CoachingTerm.t() | nil,
          required(:terms) => [CoachingTerm.t()],
          required(:coach) =>
            %{
              required(:full_name) => String.t(),
              required(:preferred_name) => String.t() | nil,
              required(:phone) => String.t() | nil,
              required(:business_name) => String.t()
            }
            | nil
        }
  @type update :: %{
          optional(:full_name) => String.t(),
          optional(:preferred_name) => String.t() | nil,
          optional(:phone) => String.t() | nil,
          optional(:unit_system) => :metric | :imperial
        }
  @spec format(Easy.ClientAccount.account_profile()) :: t()
  def format(profile) do
    client = Client.derive(profile.client, DateTime.utc_now())

    %{
      id: client.id,
      full_name: client.full_name,
      focus: client.focus,
      preferred_name: client.preferred_name,
      email: client.email,
      phone: client.phone,
      unit_system: client.unit_system,
      timezone: profile.timezone,
      local_date: profile.local_date,
      state: client.state,
      current_term: if(client.current_term, do: CoachingTerm.take(client.current_term)),
      terms: Enum.map(client.terms, &CoachingTerm.take/1),
      coach: coach(profile.coach)
    }
  end

  defp coach(nil), do: nil
  defp coach(coach), do: %{full_name: coach.full_name, preferred_name: coach.preferred_name, phone: coach.phone, business_name: coach.business.name}
end
