defmodule EasyWeb.Types.Client do
  use EasyWeb.Type
  alias Easy.AppLinks
  alias Easy.Clients.Client, as: ClientSchema
  alias Easy.Orgs.Coach
  alias EasyWeb.Types.CoachingTerm

  @type t :: %{
          required(:id) => String.t(),
          required(:review_frequency_days) => pos_integer(),
          required(:focus) => String.t() | nil,
          required(:full_name) => String.t(),
          required(:preferred_name) => String.t() | nil,
          required(:email) => String.t() | nil,
          required(:phone) => String.t() | nil,
          required(:notes) => String.t() | nil,
          required(:timezone) => String.t() | nil,
          required(:unit_system) => :metric | :imperial,
          required(:local_date) => Date.t(),
          required(:state) => :active | :ending_soon | :joined | :invited | :ended,
          required(:current_term) => CoachingTerm.t() | nil,
          required(:terms) => [CoachingTerm.t()],
          required(:coach_id) => String.t(),
          required(:coach_name) => String.t(),
          required(:invite_url) => String.t() | nil,
          required(:invited_at) => DateTime.t() | nil,
          required(:invitation_expires_at) => DateTime.t() | nil,
          required(:last_active_at) => DateTime.t() | nil,
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }
  @type invite :: %{
          required(:full_name) => String.t(),
          required(:email) => String.t(),
          optional(:preferred_name) => String.t() | nil,
          optional(:phone) => String.t() | nil,
          optional(:notes) => String.t() | nil,
          optional(:coach_id) => Ecto.UUID.t()
        }
  @type update :: %{
          optional(:focus) => String.t() | nil,
          optional(:review_frequency_days) => pos_integer(),
          optional(:full_name) => String.t(),
          optional(:preferred_name) => String.t() | nil,
          optional(:email) => String.t(),
          optional(:phone) => String.t() | nil,
          optional(:notes) => String.t() | nil,
          optional(:coach_id) => Ecto.UUID.t(),
          optional(:timezone) => String.t() | nil,
          optional(:unit_system) => :metric | :imperial
        }
  @type list_query :: %{
          optional(:cursor) => String.t(),
          optional(:offset) => integer(),
          optional(:limit) => integer(),
          optional(:q) => String.t(),
          optional(:state) => :active | :ending_soon | :joined | :invited | :ended,
          optional(:coach_id) => Ecto.UUID.t(),
          optional(:sort) => :newest | :last_active,
          optional(:include_plans) => boolean()
        }
  @spec format(ClientSchema.t()) :: t()
  def format(client) do
    client = ClientSchema.derive(client, DateTime.utc_now())

    %{
      id: client.id,
      full_name: client.full_name,
      focus: client.focus,
      review_frequency_days: client.review_frequency_days,
      preferred_name: client.preferred_name,
      email: client.email,
      phone: client.phone,
      notes: client.notes,
      timezone: client.timezone,
      unit_system: client.unit_system,
      local_date: ClientSchema.local_date(client, DateTime.utc_now()),
      state: client.state,
      current_term: if(client.current_term, do: CoachingTerm.take(client.current_term)),
      terms: Enum.map(client.terms, &CoachingTerm.take/1),
      coach_id: client.coach_id,
      coach_name: Coach.full_name(client.coach),
      invite_url: invitation_url(client),
      invited_at: if(is_nil(client.user_id), do: client.invited_at),
      invitation_expires_at: ClientSchema.invitation_expires_at(client),
      last_active_at: client.last_active_at,
      inserted_at: client.inserted_at,
      updated_at: client.updated_at
    }
  end

  defp invitation_url(%{user_id: nil, invite_token: token}) when not is_nil(token),
    do: AppLinks.client_invitation(token)

  defp invitation_url(_client), do: nil
end

defmodule EasyWeb.Types.ClientIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.Client.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil,
          required(:summary) => %{
            required(:active) => non_neg_integer(),
            required(:ending_soon) => non_neg_integer(),
            required(:joined) => non_neg_integer(),
            required(:invited) => non_neg_integer(),
            required(:ended) => non_neg_integer()
          }
        }
end
