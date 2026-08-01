defmodule Easy.Clients.Client do
  use Ecto.Schema

  alias Easy.Identity.User
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  @statuses [:pending, :active, :inactive]
  @stages [:onboarding, :coaching]
  @inactive_reasons [:manual, :subscription_expired, :awaiting_seat]
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
    field :intake_incomplete, :boolean, virtual: true, default: false
    field :needs_plan, :boolean, virtual: true, default: false
    field :expiring_soon, :boolean, virtual: true, default: false
    # The last day the CLIENT did something — a completed session or a logged meal.
    # Not derived from `updated_at`, which moves when a coach edits the row.
    field :last_active_at, :date, virtual: true
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

  @invite_cast_fields [:email, :first_name, :last_name, :phone, :notes]
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
    :subscription_ends_on
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

  @spec invite_changeset(Orgs.Coach.t(), map()) :: Ecto.Changeset.t()
  def invite_changeset(coach, attrs) do
    %__MODULE__{}
    |> cast(attrs, @invite_cast_fields)
    |> put_change(:business_id, coach.business_id)
    |> validate_required([:business_id])
    |> validate_email_or_phone()
    |> put_change(:status, :pending)
    |> put_change(:invitation_token, generate_token())
    |> put_change(:invitation_sent_at, DateTime.utc_now(:second))
    |> unique_constraint(:email, name: :clients_business_id_email_index)
    |> put_assoc(:creator, coach)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(client, attrs) do
    client
    |> cast(attrs, @update_cast_fields)
    |> normalize_goal_weight(attrs)
    |> validate_goal_weight_paired()
    |> validate_number(:goal_weight_value, greater_than: 0, less_than: 1000)
    |> validate_status_transition(client.status)
    |> validate_subscription_dates()
    |> validate_stage_change()
    |> validate_reactivation_dates(client.status)
    |> put_inactive_reason()
    |> unique_constraint(:email, name: :clients_business_id_email_index)
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

  # Reactivating a client whose subscription already ended would be undone by the
  # next sweep — force the coach to extend or clear the dates in the same update.
  defp validate_reactivation_dates(changeset, current_status) do
    ends = get_field(changeset, :subscription_ends_on)

    reactivating? = get_change(changeset, :status) == :active and current_status == :inactive
    expired? = not is_nil(ends) and Date.compare(ends, Date.utc_today()) == :lt

    if reactivating? and expired? do
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

  @spec invitation_expired?(t()) :: boolean()
  def invitation_expired?(%__MODULE__{invitation_sent_at: nil}), do: false

  def invitation_expired?(%__MODULE__{invitation_sent_at: sent_at}) do
    expires_at = DateTime.add(sent_at, @invitation_validity_days, :day)
    DateTime.compare(DateTime.utc_now(), expires_at) == :gt
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

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(c in query, where: c.business_id == ^business_id)
  end

  @spec visible_to(Ecto.Queryable.t(), Easy.Ctx.t()) :: Ecto.Query.t()
  def visible_to(query \\ __MODULE__, ctx)
  def visible_to(query, %Easy.Ctx{owner?: true}), do: query

  def visible_to(query, %Easy.Ctx{coach_id: coach_id}) when not is_nil(coach_id) do
    from(c in query, where: c.assigned_coach_id == ^coach_id)
  end

  def visible_to(query, %Easy.Ctx{}), do: from(c in query, where: false)

  @spec accepted(Ecto.Queryable.t()) :: Ecto.Query.t()
  def accepted(query \\ __MODULE__) do
    from(c in query, where: c.status == :active)
  end

  @spec search(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def search(query \\ __MODULE__, term)
  def search(query, nil), do: query
  def search(query, ""), do: query

  def search(query, term) do
    from(c in query,
      where:
        ilike(c.first_name, ^Easy.Search.like_pattern(term)) or
          ilike(c.last_name, ^Easy.Search.like_pattern(term)) or
          ilike(c.email, ^Easy.Search.like_pattern(term)) or
          ilike(c.phone, ^Easy.Search.like_pattern(term))
    )
  end

  @spec for_status(Ecto.Queryable.t(), atom() | String.t() | nil) :: Ecto.Query.t()
  def for_status(query \\ __MODULE__, status)
  def for_status(query, nil), do: query
  def for_status(query, ""), do: query

  def for_status(query, status) when is_binary(status) do
    from(c in query, where: c.status == ^status)
  end

  def for_status(query, status) when is_atom(status) do
    from(c in query, where: c.status == ^status)
  end

  @spec for_stage(Ecto.Queryable.t(), atom() | String.t() | nil) :: Ecto.Query.t()
  def for_stage(query \\ __MODULE__, stage)
  def for_stage(query, nil), do: query
  def for_stage(query, ""), do: query
  def for_stage(query, stage), do: from(c in query, where: c.stage == ^stage)

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(c in query, order_by: [desc: c.inserted_at, desc: c.id])
  end

  # Joins the client's last activity and selects it into the virtual field. Named
  # `join_*` rather than `include_*` on purpose: `include_*` is this file's preload
  # prefix (AGENTS.md query-builder taxonomy) and this adds a computed COLUMN, not an
  # association. The binding is named so `by_last_active/1` can order by it — a
  # virtual field cannot appear in `order_by`.
  @spec join_last_active(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def join_last_active(query \\ __MODULE__, business_id) do
    from(c in query,
      left_join: a in subquery(last_activity(business_id)),
      as: :last_active,
      on: a.client_id == c.id,
      select: %{c | last_active_at: a.at}
    )
  end

  @spec by_last_active(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_last_active(query \\ __MODULE__) do
    # Never active sorts last, not first — `desc` alone puts NULL on top in Postgres.
    from([c, last_active: a] in query, order_by: [desc_nulls_last: a.at, desc: c.inserted_at, desc: c.id])
  end

  # One row per client: the latest of "completed a session" and "logged a meal",
  # which is what the design's `Last active` column and the CD stat cell both mean.
  # Both halves are business-scoped; a UNION keeps it to a single grouped pass.
  # Grouping the whole business is expensive, so the context only uses the
  # ungated form when it must rank every client (sort: :last_active); plain
  # lists decorate the paginated page via `last_activity_for_clients/2`.
  @spec last_activity_for_clients(String.t(), [String.t()]) :: Ecto.Query.t()
  def last_activity_for_clients(business_id, client_ids) do
    from(a in last_activity(business_id), where: a.client_id in ^client_ids)
  end

  defp last_activity(business_id) do
    sessions =
      from(s in Easy.Training.TrainingSession,
        where: s.business_id == ^business_id and s.state == :completed and not is_nil(s.date),
        select: %{client_id: s.client_id, at: s.date}
      )

    meals =
      from(m in Easy.Nutrition.MealLog,
        where: m.business_id == ^business_id and m.logged_calories > 0.0,
        select: %{client_id: m.client_id, at: m.date}
      )

    from(a in subquery(union_all(sessions, ^meals)),
      group_by: a.client_id,
      select: %{client_id: a.client_id, at: max(a.at)}
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

  @spec build_invite_url(t()) :: String.t() | nil
  def build_invite_url(%__MODULE__{status: :pending, invitation_token: token})
      when is_binary(token) do
    base_url = Application.get_env(:easy, :client_frontend_url, "http://localhost:1314")
    "#{base_url}/invite/#{token}"
  end

  def build_invite_url(%__MODULE__{}), do: nil

  defp generate_token do
    :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)
  end
end
