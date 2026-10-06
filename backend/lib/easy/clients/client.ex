defmodule Easy.Clients.Client do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.{LocalCalendar, Orgs}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  @type state :: :invited | :active | :ending_soon | :joined | :ended
  @type state_counts :: %{required(state()) => non_neg_integer()}

  schema "clients" do
    field(:email, :string)
    field(:full_name, :string)
    field(:preferred_name, :string)
    field(:phone, :string)
    field(:notes, :string)
    field(:timezone, :string)
    field(:unit_system, Ecto.Enum, values: [:metric, :imperial], default: :metric)
    field(:focus, :string)
    field(:review_frequency_days, :integer, default: 7)
    field(:last_change_seq, :integer, default: 0)
    field(:last_active_at, :utc_datetime)
    field(:joined_at, :utc_datetime_usec)
    field(:invite_token, :string)
    field(:invited_at, :utc_datetime)
    field(:state, Ecto.Enum, values: [:invited, :active, :ending_soon, :joined, :ended], virtual: true)
    field(:current_term, :map, virtual: true)
    field(:training_plan_name, :string, virtual: true)
    field(:nutrition_plan_name, :string, virtual: true)
    belongs_to(:user, Easy.Identity.User)
    belongs_to(:business, Orgs.Business)
    belongs_to(:coach, Orgs.Coach)
    has_many(:terms, CoachingTerm, preload_order: [desc: :starts_on, desc: :id])
    timestamps(type: :utc_datetime)
  end

  @profile_fields [:full_name, :preferred_name, :email, :phone, :notes, :timezone, :unit_system]
  @spec insert_changeset(String.t(), String.t(), DateTime.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, coach_id, now, attrs) do
    %__MODULE__{}
    |> cast(attrs, @profile_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:coach_id, coach_id)
    |> put_change(:invite_token, token())
    |> put_change(:invited_at, now)
    |> validate_profile()
    |> validate_required([:business_id, :coach_id, :email])
    |> validate_constraints()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(client, attrs),
    do:
      client
      |> cast(attrs, @profile_fields ++ [:focus, :review_frequency_days])
      |> validate_review_settings()
      |> validate_profile()
      |> validate_constraints()

  @spec self_update_changeset(t(), map()) :: Ecto.Changeset.t()
  def self_update_changeset(client, attrs),
    do: client |> cast(attrs, [:full_name, :preferred_name, :phone, :unit_system]) |> validate_profile()

  @spec resend_invite_changeset(t(), DateTime.t()) :: Ecto.Changeset.t()
  def resend_invite_changeset(client, now), do: change(client, invite_token: token(), invited_at: now)

  @spec delete_invitation_changeset(t()) :: Ecto.Changeset.t()
  def delete_invitation_changeset(client) do
    client
    |> change()
    |> foreign_key_constraint(:base,
      name: :workout_sessions_client_id_fkey,
      message: "client has activity records and cannot be revoked"
    )
  end

  defp validate_review_settings(changeset) do
    changeset
    |> validate_required([:review_frequency_days])
    |> validate_inclusion(:review_frequency_days, [1, 3, 7, 14, 28])
    |> validate_length(:focus, max: 255)
    |> validate_format(:focus, ~r/^[^\r\n]*$/)
    |> check_constraint(:focus, name: :clients_focus_check)
    |> check_constraint(:review_frequency_days, name: :clients_review_frequency_check)
  end

  defp validate_profile(changeset) do
    changeset
    |> validate_required([:full_name, :unit_system])
    |> validate_length(:full_name, max: 255, count: :codepoints)
    |> validate_length(:preferred_name, max: 255, count: :codepoints)
    |> validate_length(:email, max: 255, count: :codepoints)
    |> validate_length(:phone, max: 255, count: :codepoints)
    |> validate_length(:notes, max: 2000)
    |> update_change(:email, &Orgs.Coach.normalize_email/1)
    |> validate_format(:email, ~r/^[^\s@]+@[^\s@]+$/)
    |> validate_change(:timezone, fn :timezone, zone ->
      if Tzdata.zone_exists?(zone), do: [], else: [timezone: "choose a valid time zone"]
    end)
  end

  defp validate_constraints(changeset) do
    changeset
    |> unique_constraint(:email, name: :clients_business_id_email_index)
    |> foreign_key_constraint(:coach_id)
    |> foreign_key_constraint(:business_id)
    |> check_constraint(:unit_system, name: :clients_unit_system_check)
  end

  defp token, do: :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)

  @spec full_name(t()) :: String.t()
  def full_name(client), do: client.preferred_name || client.full_name

  @spec applied_timezone(t()) :: String.t()
  def applied_timezone(client), do: LocalCalendar.applied_timezone(client.timezone, business_timezone(client))
  defp business_timezone(%__MODULE__{business: %Orgs.Business{timezone: timezone}}), do: timezone
  defp business_timezone(_), do: nil

  @spec local_date(t(), DateTime.t()) :: Date.t()
  def local_date(client, now), do: LocalCalendar.to_local_date(now, applied_timezone(client))

  @spec current_term(t(), Date.t()) :: CoachingTerm.t() | nil
  def current_term(client, today), do: Enum.find(client.terms, &CoachingTerm.covers?(&1, today))

  @spec state(t(), Date.t()) :: state()
  def state(%__MODULE__{user_id: nil}, _today), do: :invited

  def state(client, today) do
    case current_term(client, today) do
      %CoachingTerm{ends_on: nil} -> :active
      %CoachingTerm{ends_on: ends_on} -> if Date.diff(ends_on, today) <= 14, do: :ending_soon, else: :active
      nil -> if Enum.any?(client.terms, &(Date.compare(&1.starts_on, today) != :gt)), do: :ended, else: :joined
    end
  end

  @spec derive(t(), DateTime.t()) :: t()
  def derive(client, now) do
    today = local_date(client, now)
    %{client | state: state(client, today), current_term: current_term(client, today)}
  end

  @spec invitation_expires_at(t()) :: DateTime.t() | nil
  def invitation_expires_at(%__MODULE__{user_id: nil, invited_at: at}) when not is_nil(at),
    do: DateTime.add(at, 30, :day)

  def invitation_expires_at(_), do: nil
  @spec invitation_expired?(t(), DateTime.t()) :: boolean()
  def invitation_expired?(client, now),
    do: not is_nil(invitation_expires_at(client)) and DateTime.compare(now, invitation_expires_at(client)) == :gt

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, id), do: from(c in query, where: c.business_id == ^id)
  @spec for_user(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_user(query \\ __MODULE__, id), do: from(c in query, where: c.user_id == ^id)
  @spec for_invitation_token(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_invitation_token(query \\ __MODULE__, token), do: from(c in query, where: c.invite_token == ^token)
  @spec assigned_to(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def assigned_to(query \\ __MODULE__, id), do: from(c in query, where: c.coach_id == ^id)
  @spec for_assigned_coach(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def for_assigned_coach(query, nil), do: query
  def for_assigned_coach(query, id), do: assigned_to(query, id)
  @spec visible_to(Ecto.Queryable.t(), Easy.Ctx.t()) :: Ecto.Query.t()
  def visible_to(query \\ __MODULE__, ctx)
  def visible_to(query, %Easy.Ctx{owner?: true}), do: query
  def visible_to(query, %Easy.Ctx{coach_id: id}) when not is_nil(id), do: assigned_to(query, id)
  def visible_to(query, _ctx), do: from(c in query, where: false)

  @spec for_state(Ecto.Queryable.t(), state() | String.t() | nil) :: Ecto.Query.t()
  def for_state(query \\ __MODULE__, state)
  def for_state(query, state) when state in [nil, ""], do: query
  def for_state(query, state), do: where(query, ^state_condition(state))

  @spec select_state_counts(Ecto.Queryable.t()) :: Ecto.Query.t()
  def select_state_counts(query \\ __MODULE__) do
    counts =
      Map.new([:invited, :active, :ending_soon, :joined, :ended], fn state ->
        condition = state_condition(state)
        {state, dynamic([c], filter(count(), ^condition))}
      end)

    select(query, ^counts)
  end

  defp state_condition(state) when state in [:invited, "invited"], do: dynamic([c], is_nil(c.user_id))

  defp state_condition(state) when state in [:active, "active"] do
    current = current_term_condition()
    ending = ending_soon_condition()
    dynamic([c], not is_nil(c.user_id) and ^current and not (^ending))
  end

  defp state_condition(state) when state in [:ending_soon, "ending_soon"] do
    current = current_term_condition()
    ending = ending_soon_condition()
    dynamic([c], not is_nil(c.user_id) and ^current and ^ending)
  end

  defp state_condition(state) when state in [:joined, "joined"] do
    earlier = earlier_term_condition()
    dynamic([c], not is_nil(c.user_id) and not (^earlier))
  end

  defp state_condition(state) when state in [:ended, "ended"] do
    current = current_term_condition()
    earlier = earlier_term_condition()
    dynamic([c], not is_nil(c.user_id) and not (^current) and ^earlier)
  end

  @spec active(Ecto.Queryable.t()) :: Ecto.Query.t()
  def active(query \\ __MODULE__) do
    current = current_term_condition()
    query |> where([c], not is_nil(c.user_id)) |> where(^current)
  end

  defp current_term_condition do
    dynamic(
      [c],
      fragment(
        """
        EXISTS (
          SELECT 1 FROM coaching_terms t
          JOIN businesses b ON b.id = ?
          WHERE t.client_id = ?
            AND daterange(t.starts_on, t.ends_on, '[]') @>
              (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(NULLIF(?, ''), b.timezone, 'Asia/Kolkata'))::date
        )
        """,
        c.business_id,
        c.id,
        c.timezone
      )
    )
  end

  defp ending_soon_condition do
    dynamic(
      [c],
      fragment(
        """
        EXISTS (
          SELECT 1 FROM coaching_terms t
          JOIN businesses b ON b.id = ?
          WHERE t.client_id = ?
            AND (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(NULLIF(?, ''), b.timezone, 'Asia/Kolkata'))::date
              BETWEEN GREATEST(t.starts_on, t.ends_on - 14) AND t.ends_on
        )
        """,
        c.business_id,
        c.id,
        c.timezone
      )
    )
  end

  defp earlier_term_condition do
    dynamic(
      [c],
      fragment(
        """
        EXISTS (
          SELECT 1 FROM coaching_terms t
          JOIN businesses b ON b.id = ?
          WHERE t.client_id = ?
            AND t.starts_on <=
              (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(NULLIF(?, ''), b.timezone, 'Asia/Kolkata'))::date
        )
        """,
        c.business_id,
        c.id,
        c.timezone
      )
    )
  end

  @spec active_elsewhere(String.t(), String.t()) :: Ecto.Query.t()
  def active_elsewhere(user_id, business_id),
    do: from(c in active(), where: c.user_id == ^user_id and c.business_id != ^business_id)

  @spec active_for_email(String.t()) :: Ecto.Query.t()
  def active_for_email(email), do: from(c in active(), join: u in assoc(c, :user), where: u.email == ^email)

  @spec search(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def search(query \\ __MODULE__, term)
  def search(query, term) when term in [nil, ""], do: query

  def search(query, term) do
    pattern = Easy.Search.like_pattern(term)

    from(c in query,
      where:
        ilike(c.full_name, ^pattern) or ilike(c.preferred_name, ^pattern) or
          ilike(c.email, ^pattern) or ilike(c.phone, ^pattern)
    )
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__), do: from(c in query, order_by: [desc: c.inserted_at, desc: c.id])
  @spec by_last_active(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_last_active(query \\ __MODULE__),
    do: from(c in query, order_by: [desc_nulls_last: c.last_active_at, desc: c.inserted_at, desc: c.id])

  @spec include_preloads(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_preloads(query \\ __MODULE__, business_id) do
    coaches = Orgs.Coach.for_business(business_id)
    from(c in query, preload: [:business, :terms, coach: ^coaches])
  end

  @spec last_active_stamp(Ecto.Queryable.t(), String.t(), String.t(), DateTime.t()) :: Ecto.Query.t()
  def last_active_stamp(query \\ __MODULE__, business_id, client_id, occurred_at) do
    from(c in query,
      where: c.business_id == ^business_id and c.id == ^client_id,
      update: [
        set: [
          last_active_at:
            fragment(
              "GREATEST(COALESCE(?, ?), ?)",
              c.last_active_at,
              type(^occurred_at, :utc_datetime),
              type(^occurred_at, :utc_datetime)
            )
        ]
      ]
    )
  end
end
