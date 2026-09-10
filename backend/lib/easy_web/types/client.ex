defmodule EasyWeb.Types.Client do
  use EasyWeb.Type

  alias Easy.AppLinks
  alias Easy.Clients.Client, as: ClientSchema
  alias Easy.Identity.User

  @type t :: %{
          required(:id) => String.t(),
          required(:local_date) => Date.t(),
          required(:email) => String.t() | nil,
          required(:first_name) => String.t() | nil,
          required(:last_name) => String.t() | nil,
          required(:phone) => String.t() | nil,
          required(:notes) => String.t() | nil,
          required(:goal_weight_value) => Decimal.t() | nil,
          required(:goal_weight_unit) => :kg | :lbs | nil,
          required(:status) => :active | :pending | :inactive,
          required(:stage) => :onboarding | :coaching,
          required(:inactive_reason) => :manual | :subscription_expired | :awaiting_seat | nil,
          required(:subscription_started_on) => Date.t() | nil,
          required(:subscription_ends_on) => Date.t() | nil,
          required(:joined_at) => DateTime.t() | nil,
          required(:required_services) => [:training | :nutrition],
          required(:expiring_soon) => boolean(),
          required(:last_active_at) => DateTime.t() | nil,
          required(:training_plan_name) => String.t() | nil,
          required(:nutrition_plan_name) => String.t() | nil,
          required(:assigned_coach_id) => String.t() | nil,
          required(:invite_url) => String.t() | nil,
          required(:invitation_sent_at) => DateTime.t() | nil,
          required(:invitation_expires_at) => DateTime.t() | nil,
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type invite :: %{
          optional(:email) => String.t() | nil,
          optional(:first_name) => String.t() | nil,
          optional(:last_name) => String.t() | nil,
          optional(:phone) => String.t() | nil,
          optional(:notes) => String.t() | nil,
          optional(:required_services) => [:training | :nutrition]
        }

  @type update :: %{
          optional(:email) => String.t() | nil,
          optional(:first_name) => String.t() | nil,
          optional(:last_name) => String.t() | nil,
          optional(:phone) => String.t() | nil,
          optional(:notes) => String.t() | nil,
          optional(:goal_weight_value) => number() | nil,
          optional(:goal_weight_unit) => :kg | :lbs | nil,
          optional(:status) => :active | :inactive,
          optional(:stage) => :onboarding | :coaching | nil,
          optional(:subscription_started_on) => Date.t() | nil,
          optional(:subscription_ends_on) => Date.t() | nil,
          optional(:required_services) => [:training | :nutrition]
        }

  @type reassign :: %{required(:coach_id) => String.t()}

  @type list_query :: %{
          optional(:cursor) => String.t(),
          optional(:offset) => integer(),
          optional(:limit) => integer(),
          optional(:search) => String.t(),
          optional(:status) => :active | :pending | :inactive,
          optional(:stage) => :onboarding | :coaching,
          optional(:sort) => :newest | :last_active,
          optional(:include_plans) => boolean()
        }

  @spec format(ClientSchema.t()) :: t()
  def format(%ClientSchema{} = client) do
    %{
      id: client.id,
      local_date: ClientSchema.local_date(client, DateTime.utc_now()),
      email: client.email,
      first_name: display_first_name(client),
      last_name: display_last_name(client),
      phone: client.phone,
      notes: client.notes,
      goal_weight_value: goal_weight_value(client.goal_weight_value),
      goal_weight_unit: client.goal_weight_unit,
      status: client.status,
      stage: client.stage,
      inactive_reason: client.inactive_reason,
      subscription_started_on: client.subscription_started_on,
      subscription_ends_on: client.subscription_ends_on,
      joined_at: client.joined_at,
      required_services: client.required_services,
      expiring_soon: client.expiring_soon,
      last_active_at: client.last_active_at,
      training_plan_name: client.training_plan_name,
      nutrition_plan_name: client.nutrition_plan_name,
      assigned_coach_id: client.assigned_coach_id,
      invite_url: invite_url(client),
      invitation_sent_at: pending_only(client, client.invitation_sent_at),
      invitation_expires_at: pending_only(client, ClientSchema.invitation_expires_at(client)),
      inserted_at: client.inserted_at,
      updated_at: client.updated_at
    }
  end

  defp display_first_name(%ClientSchema{user: %User{first_name: name}, first_name: fallback})
       when name in [nil, ""],
       do: fallback

  defp display_first_name(%ClientSchema{user: %User{first_name: name}}), do: name
  defp display_first_name(%ClientSchema{first_name: name}), do: name

  defp display_last_name(%ClientSchema{user: %User{last_name: name}, last_name: fallback})
       when name in [nil, ""],
       do: fallback

  defp display_last_name(%ClientSchema{user: %User{last_name: name}}), do: name
  defp display_last_name(%ClientSchema{last_name: name}), do: name

  defp pending_only(%ClientSchema{status: :pending}, value), do: value
  defp pending_only(%ClientSchema{}, _value), do: nil

  defp invite_url(%ClientSchema{status: :pending, invitation_token: token}) when is_binary(token),
    do: AppLinks.client_invitation(token)

  defp invite_url(%ClientSchema{}), do: nil

  defp goal_weight_value(nil), do: nil

  defp goal_weight_value(%Decimal{} = value) do
    formatted = Decimal.to_string(value, :normal)
    if String.contains?(formatted, "."), do: value, else: Decimal.new(formatted <> ".0")
  end
end

defmodule EasyWeb.Types.ClientIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.Client.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil,
          required(:summary) => %{
            required(:active) => non_neg_integer(),
            required(:pending) => non_neg_integer(),
            required(:inactive) => non_neg_integer()
          }
        }
end
