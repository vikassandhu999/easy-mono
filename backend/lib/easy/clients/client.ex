defmodule Easy.Clients.Client do
  use Ecto.Schema

  alias Easy.Identity.User
  alias Easy.LocalCalendar
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @expiring_soon_days 14

  @type t :: %__MODULE__{}
  @type service :: :training | :nutrition
  @type status :: :pending | :active | :inactive
  @type stage :: :onboarding | :coaching
  @type status_counts :: %{active: non_neg_integer(), pending: non_neg_integer(), inactive: non_neg_integer()}

  @statuses [:pending, :active, :inactive]
  @stages [:onboarding, :coaching]
  @inactive_reasons [:manual, :subscription_expired, :awaiting_seat]
  @required_services [:training, :nutrition]
  @required_service_order %{training: 0, nutrition: 1}
  @invitation_validity_days 30

  schema "clients" do
    field :email, :string
    field :first_name, :string
    field :last_name, :string
    field :phone, :string
    field :notes, :string
    field :goal_weight_value, :decimal
    field :goal_weight_unit, Ecto.Enum, values: [:kg, :lbs]

    field :status, Ecto.Enum, values: @statuses
    field :stage, Ecto.Enum, values: @stages, default: :onboarding
    field :inactive_reason, Ecto.Enum, values: @inactive_reasons
    field :subscription_started_on, :date
    field :subscription_ends_on, :date
    field :joined_at, :utc_datetime_usec
    field :required_services, {:array, Ecto.Enum}, values: @required_services, default: []
    field :expiring_soon, :boolean, virtual: true, default: false
    field :last_active_at, :utc_datetime
    field :timezone, :string, default: LocalCalendar.default_timezone()
    # The names of the plans in force for this client TODAY, for the clients-list
    # row chips. Only populated when the caller asks (`include_plans: true`) —
    # they cost two extra queries per page, and no other caller wants them.
    field :training_plan_name, :string, virtual: true
    field :nutrition_plan_name, :string, virtual: true

    # Invitation
    field :invitation_token, :string
    field :invitation_sent_at, :utc_datetime

    belongs_to :user, Easy.Identity.User
    belongs_to :business, Orgs.Business
    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :assigned_coach, Orgs.Coach, foreign_key: :assigned_coach_id

    timestamps(type: :utc_datetime)
  end

  @invite_cast_fields [:email, :first_name, :last_name, :phone, :notes, :required_services]
  @update_cast_fields [
    :first_name,
    :last_name,
    :phone,
    :email,
    :notes,
    :goal_weight_value,
    :goal_weight_unit,
    :status,
    :stage,
    :subscription_started_on,
    :subscription_ends_on,
    :required_services
  ]
  @self_update_cast_fields [:first_name, :last_name, :phone]

  # Allowed manual status transitions (coach-driven).
  # pending -> active is reserved for accept_invite/3 (the accept flow) only.
  # Nothing may return to pending once a Client has been linked to a User.
  # System-driven exceptions use update_all and bypass this changeset:
  # Billing's awaiting-client activation and ClientSubscriptionSweeper.sweep.
  @allowed_status_transitions %{
    active: [:inactive],
    inactive: [:active]
  }

  # Changesets

  @spec invite_changeset(String.t(), String.t(), DateTime.t(), map()) :: Ecto.Changeset.t()
  def invite_changeset(business_id, coach_id, sent_at, attrs) do
    %__MODULE__{}
    |> cast(attrs, @invite_cast_fields)
    |> validate_profile_lengths()
    |> normalize_required_services()
    |> validate_required_services_unique()
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, coach_id)
    |> put_change(:assigned_coach_id, coach_id)
    |> validate_required([:business_id, :creator_id, :assigned_coach_id])
    |> validate_email_or_phone()
    |> put_change(:status, :pending)
    |> put_change(:invitation_token, generate_token())
    |> put_change(:invitation_sent_at, sent_at)
    |> LocalCalendar.stamp_timezone()
    |> unique_constraint(:email, name: :clients_business_id_email_index)
    |> check_constraint(:required_services, name: :clients_required_services_check)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:creator_id)
    |> foreign_key_constraint(:assigned_coach_id)
  end

  @spec resend_invite_changeset(t(), DateTime.t()) :: Ecto.Changeset.t()
  def resend_invite_changeset(client, sent_at) do
    change(client, invitation_sent_at: sent_at)
  end

  @spec delete_invitation_changeset(t()) :: Ecto.Changeset.t()
  def delete_invitation_changeset(client) do
    client
    |> change()
    |> foreign_key_constraint(:base,
      name: :workout_sessions_client_id_fkey,
      message: "client has activity records and cannot be revoked"
    )
  end

  @spec reassign_changeset(t(), String.t()) :: Ecto.Changeset.t()
  def reassign_changeset(client, coach_id) do
    client
    |> change()
    |> put_change(:assigned_coach_id, coach_id)
    |> validate_required([:assigned_coach_id])
    |> foreign_key_constraint(:assigned_coach_id)
  end

  @spec update_changeset(t(), Date.t(), map()) :: Ecto.Changeset.t()
  def update_changeset(client, today, attrs) do
    client
    |> cast(attrs, @update_cast_fields)
    |> validate_profile_lengths()
    |> normalize_required_services()
    |> validate_required_services_unique()
    |> validate_required_services_edit(attrs)
    |> normalize_goal_weight(attrs)
    |> validate_goal_weight_paired()
    |> validate_number(:goal_weight_value, greater_than: 0, less_than: 1000)
    |> validate_status_transition(client.status)
    |> validate_subscription_dates()
    |> validate_stage_change()
    |> validate_reactivation_dates(today)
    |> put_inactive_reason()
    |> unique_constraint(:email, name: :clients_business_id_email_index)
    |> check_constraint(:required_services, name: :clients_required_services_check)
  end

  defp normalize_required_services(changeset) do
    case fetch_change(changeset, :required_services) do
      {:ok, services} ->
        put_change(changeset, :required_services, Enum.sort_by(services, &@required_service_order[&1]))

      :error ->
        changeset
    end
  end

  defp validate_required_services_unique(changeset) do
    validate_change(changeset, :required_services, fn :required_services, services ->
      if length(services) == MapSet.size(MapSet.new(services)) do
        []
      else
        [required_services: "must not contain duplicates"]
      end
    end)
  end

  defp validate_required_services_edit(changeset, attrs) do
    if supplied?(attrs, :required_services) and get_field(changeset, :required_services) == [] do
      add_error(changeset, :required_services, "must contain at least one service")
    else
      changeset
    end
  end

  defp supplied?(attrs, field) do
    Map.has_key?(attrs, field) or Map.has_key?(attrs, Atom.to_string(field))
  end

  # If either goal field was explicitly sent as blank, clear both —
  # "leave empty to remove the goal" from the coach-side edit dialog.
  defp normalize_goal_weight(changeset, attrs) do
    value_sent? =
      Map.has_key?(attrs, "goal_weight_value") or Map.has_key?(attrs, :goal_weight_value)

    unit_sent? = Map.has_key?(attrs, "goal_weight_unit") or Map.has_key?(attrs, :goal_weight_unit)

    value = get_field(changeset, :goal_weight_value)
    unit = get_field(changeset, :goal_weight_unit)

    cond do
      value_sent? and is_nil(value) ->
        changeset |> put_change(:goal_weight_value, nil) |> put_change(:goal_weight_unit, nil)

      unit_sent? and is_nil(unit) ->
        changeset |> put_change(:goal_weight_value, nil) |> put_change(:goal_weight_unit, nil)

      true ->
        changeset
    end
  end

  defp validate_goal_weight_paired(changeset) do
    value = get_field(changeset, :goal_weight_value)
    unit = get_field(changeset, :goal_weight_unit)

    cond do
      is_nil(value) and is_nil(unit) ->
        changeset

      is_nil(value) ->
        add_error(changeset, :goal_weight_value, "is required when goal_weight_unit is set")

      is_nil(unit) ->
        add_error(changeset, :goal_weight_unit, "is required when goal_weight_value is set")

      true ->
        changeset
    end
  end

  defp validate_status_transition(changeset, current) do
    case get_change(changeset, :status) do
      nil ->
        changeset

      ^current ->
        changeset

      :pending ->
        add_error(changeset, :status, "cannot return to pending")

      _ when current == :pending ->
        add_error(
          changeset,
          :status,
          "pending clients can only become active by accepting the invitation"
        )

      new_status ->
        if new_status in Map.get(@allowed_status_transitions, current, []) do
          changeset
        else
          add_error(changeset, :status, "invalid status transition")
        end
    end
  end

  defp validate_subscription_dates(changeset) do
    started = get_field(changeset, :subscription_started_on)
    ends = get_field(changeset, :subscription_ends_on)

    if started && ends && Date.compare(ends, started) == :lt do
      add_error(changeset, :subscription_ends_on, "must be on or after the start date")
    else
      changeset
    end
  end

  defp validate_stage_change(changeset) do
    case get_change(changeset, :stage) do
      nil ->
        changeset

      _stage ->
        if get_field(changeset, :status) == :active do
          changeset
        else
          add_error(changeset, :stage, "can only change for active clients")
        end
    end
  end

  @spec reactivation?(Ecto.Changeset.t()) :: boolean()
  def reactivation?(%Ecto.Changeset{data: %__MODULE__{status: :inactive}} = changeset),
    do: get_change(changeset, :status) == :active

  def reactivation?(%Ecto.Changeset{}), do: false

  # Reactivating a client whose subscription already ended would be undone by the
  # next sweep — force the coach to extend or clear the dates in the same update.
  defp validate_reactivation_dates(changeset, today) do
    ends = get_field(changeset, :subscription_ends_on)

    expired? = not is_nil(ends) and Date.compare(ends, today) == :lt

    if reactivation?(changeset) and expired? do
      add_error(changeset, :status, "subscription has ended; extend or clear the dates first")
    else
      changeset
    end
  end

  defp put_inactive_reason(changeset) do
    case get_change(changeset, :status) do
      :inactive -> put_change(changeset, :inactive_reason, :manual)
      :active -> put_change(changeset, :inactive_reason, nil)
      _ -> changeset
    end
  end

  @spec self_update_changeset(t(), map()) :: Ecto.Changeset.t()
  def self_update_changeset(client, attrs) do
    client
    |> cast(attrs, @self_update_cast_fields)
    |> validate_profile_lengths()
  end

  defp validate_profile_lengths(changeset) do
    Enum.reduce([:email, :first_name, :last_name, :phone, :notes], changeset, fn field, changeset ->
      validate_length(changeset, field, max: 255, count: :codepoints)
    end)
  end

  defp validate_email_or_phone(changeset) do
    email = get_field(changeset, :email)
    phone = get_field(changeset, :phone)

    if blank?(email) and blank?(phone) do
      add_error(changeset, :base, "at least one of email or phone is required")
    else
      changeset
    end
  end

  defp blank?(nil), do: true
  defp blank?(""), do: true
  defp blank?(_), do: false

  # Queries

  @spec full_name(t()) :: String.t()
  def full_name(%__MODULE__{first_name: first, last_name: last}) do
    [first, last] |> Enum.filter(&is_binary/1) |> Enum.join(" ")
  end

  @spec expiring_soon(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def expiring_soon(query \\ __MODULE__, today) do
    horizon = Date.add(today, @expiring_soon_days)

    from(client in for_status(query, :active),
      where:
        not is_nil(client.subscription_ends_on) and
          client.subscription_ends_on >= ^today and client.subscription_ends_on <= ^horizon
    )
  end

  @spec expired_subscriptions(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def expired_subscriptions(query \\ __MODULE__, today) do
    query
    |> for_status(:active)
    |> where([client], client.subscription_ends_on < ^today)
  end

  @spec applied_timezone(t()) :: String.t()
  def applied_timezone(%__MODULE__{} = client) do
    LocalCalendar.applied_timezone(client.timezone, business_timezone(client))
  end

  @spec local_date(t(), DateTime.t()) :: Date.t()
  def local_date(%__MODULE__{} = client, %DateTime{} = now) do
    LocalCalendar.to_local_date(now, applied_timezone(client))
  end

  defp business_timezone(%__MODULE__{business: %Orgs.Business{timezone: timezone}}), do: timezone
  defp business_timezone(_client), do: nil

  @spec put_expiring_flag(t(), Date.t()) :: t()
  def put_expiring_flag(%__MODULE__{} = client, today) do
    horizon = Date.add(today, @expiring_soon_days)

    expiring_soon =
      client.status == :active and not is_nil(client.subscription_ends_on) and
        Date.compare(client.subscription_ends_on, today) != :lt and
        Date.compare(client.subscription_ends_on, horizon) != :gt

    %{client | expiring_soon: expiring_soon}
  end

  @spec invitation_expired?(t(), DateTime.t()) :: boolean()
  def invitation_expired?(%__MODULE__{invitation_sent_at: nil}, _now), do: false

  def invitation_expired?(%__MODULE__{} = client, now) do
    DateTime.compare(now, invitation_expires_at(client)) == :gt
  end

  @spec invitation_expires_at(t()) :: DateTime.t() | nil
  def invitation_expires_at(%__MODULE__{invitation_sent_at: nil}), do: nil

  def invitation_expires_at(%__MODULE__{invitation_sent_at: sent_at}) do
    DateTime.add(sent_at, @invitation_validity_days, :day)
  end

  @spec for_user(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_user(query \\ __MODULE__, user_id) do
    from(c in query, where: c.user_id == ^user_id)
  end

  @spec for_invitation_token(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_invitation_token(query \\ __MODULE__, token) do
    from(client in query, where: client.invitation_token == ^token)
  end

  @spec active_elsewhere(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def active_elsewhere(query \\ __MODULE__, user_id, business_id) do
    query
    |> for_user(user_id)
    |> for_status(:active)
    |> where([client], client.business_id != ^business_id)
  end

  @spec pending_invitation(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def pending_invitation(query \\ __MODULE__, business_id, client_id) do
    query
    |> for_business(business_id)
    |> for_status(:pending)
    |> where([client], client.id == ^client_id)
    |> select([client], client)
  end

  @spec select_status_counts(Ecto.Queryable.t()) :: Ecto.Query.t()
  def select_status_counts(query \\ __MODULE__) do
    from(c in query,
      select: %{
        active: filter(count(c.id), c.status == :active),
        pending: filter(count(c.id), c.status == :pending),
        inactive: filter(count(c.id), c.status == :inactive)
      }
    )
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(c in query, where: c.business_id == ^business_id)
  end

  @spec assigned_to(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def assigned_to(query \\ __MODULE__, coach_id) do
    from(client in query, where: client.assigned_coach_id == ^coach_id)
  end

  @spec visible_to(Ecto.Queryable.t(), Easy.Ctx.t()) :: Ecto.Query.t()
  def visible_to(query \\ __MODULE__, ctx)
  def visible_to(query, %Easy.Ctx{owner?: true}), do: query

  def visible_to(query, %Easy.Ctx{coach_id: coach_id}) when not is_nil(coach_id) do
    assigned_to(query, coach_id)
  end

  def visible_to(query, %Easy.Ctx{}), do: from(c in query, where: false)

  @spec active(Ecto.Queryable.t()) :: Ecto.Query.t()
  def active(query \\ __MODULE__) do
    from(c in query, where: c.status == :active)
  end

  @spec search(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def search(query \\ __MODULE__, term)
  def search(query, nil), do: query
  def search(query, ""), do: query

  def search(query, term) do
    pattern = Easy.Search.like_pattern(term)

    from(c in query,
      where:
        ilike(fragment("concat_ws(' ', ?, ?)", c.first_name, c.last_name), ^pattern) or
          ilike(c.email, ^pattern) or
          ilike(c.phone, ^pattern)
    )
  end

  @spec occupying_seat(Ecto.Queryable.t()) :: Ecto.Query.t()
  def occupying_seat(query \\ __MODULE__) do
    from(client in query, where: client.status in [:active, :pending])
  end

  @spec awaiting_seat(Ecto.Queryable.t()) :: Ecto.Query.t()
  def awaiting_seat(query \\ __MODULE__) do
    from(client in query, where: client.status == :inactive and client.inactive_reason == :awaiting_seat)
  end

  @spec for_status(Ecto.Queryable.t(), status() | String.t() | nil) :: Ecto.Query.t()
  def for_status(query \\ __MODULE__, status)
  def for_status(query, nil), do: query
  def for_status(query, ""), do: query

  def for_status(query, status) when is_binary(status) or is_atom(status) do
    from(c in query, where: c.status == ^status)
  end

  @spec for_stage(Ecto.Queryable.t(), stage() | String.t() | nil) :: Ecto.Query.t()
  def for_stage(query \\ __MODULE__, stage)
  def for_stage(query, nil), do: query
  def for_stage(query, ""), do: query
  def for_stage(query, stage), do: from(c in query, where: c.stage == ^stage)

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(c in query, order_by: [desc: c.inserted_at, desc: c.id])
  end

  @spec oldest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def oldest(query \\ __MODULE__) do
    from(c in query, order_by: [asc: c.inserted_at, asc: c.id])
  end

  @spec last_active_stamp(Ecto.Queryable.t(), String.t(), String.t(), DateTime.t()) :: Ecto.Query.t()
  def last_active_stamp(query \\ __MODULE__, business_id, client_id, occurred_at) do
    from(client in query,
      where: client.business_id == ^business_id and client.id == ^client_id,
      update: [
        set: [
          last_active_at:
            fragment(
              "GREATEST(COALESCE(?, ?), ?)",
              client.last_active_at,
              type(^occurred_at, :utc_datetime),
              type(^occurred_at, :utc_datetime)
            )
        ]
      ]
    )
  end

  @spec by_last_active(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_last_active(query \\ __MODULE__) do
    from(c in query,
      order_by: [desc_nulls_last: c.last_active_at, desc: c.inserted_at, desc: c.id]
    )
  end

  @spec include_preloads(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_preloads(query \\ __MODULE__, _business_id) do
    from(c in query, preload: [:user, :business, :creator])
  end

  # Deliberately global (no business_id): the product rule is one active coaching
  # relationship per email across ALL businesses, asserted by the invite controller
  # test "rejects invite when email is already an active client of another business".
  @spec active_for_email(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def active_for_email(query \\ __MODULE__, email) do
    from(c in query,
      join: u in User,
      on: u.id == c.user_id,
      where: u.email == ^email and c.status == ^:active
    )
  end

  defp generate_token do
    :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)
  end
end
