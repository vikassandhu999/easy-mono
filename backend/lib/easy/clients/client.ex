defmodule Easy.Clients.Client do
  use Ecto.Schema

  alias Easy.Identity.User
  alias Easy.Orgs
  alias Easy.Orgs.Coaches

  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  @statuses [:active, :pending, :inactive, :archived]
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

    # Invitation
    field :invitation_token, :string
    field :invitation_sent_at, :utc_datetime

    belongs_to :user, Easy.Identity.User
    belongs_to :business, Orgs.Business
    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id

    timestamps()
  end

  @invite_cast_fields [:email, :first_name, :last_name, :phone, :notes]
  @update_cast_fields [
    :first_name,
    :last_name,
    :phone,
    :email,
    :notes,
    :goal_weight_value,
    :goal_weight_unit
  ]
  @self_update_cast_fields [:first_name, :last_name, :phone]
  @inquiry_cast_fields [:email, :first_name, :last_name, :phone]

  # Allowed manual status transitions (coach-driven).
  # pending -> active is reserved for accept_invite/3 (the accept flow) only.
  # Nothing may return to pending once a Client has been linked to a User.
  @allowed_status_transitions %{
    active: [:inactive, :archived],
    inactive: [:active, :archived],
    archived: [:active, :inactive]
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
    |> validate_status_transition(client.status, attrs)
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

  defp validate_status_transition(changeset, _current, attrs)
       when not is_map_key(attrs, "status") and not is_map_key(attrs, :status),
       do: changeset

  defp validate_status_transition(changeset, current, attrs) do
    new_status_raw = attrs["status"] || attrs[:status]

    case parse_status(new_status_raw) do
      {:ok, ^current} ->
        changeset

      {:ok, :pending} ->
        add_error(changeset, :status, "cannot return to pending")

      {:ok, _} when current == :pending ->
        add_error(
          changeset,
          :status,
          "pending clients can only become active by accepting the invitation"
        )

      {:ok, status} ->
        if status in Map.get(@allowed_status_transitions, current, []) do
          put_change(changeset, :status, status)
        else
          add_error(changeset, :status, "invalid status transition")
        end

      :error ->
        add_error(changeset, :status, "is invalid")
    end
  end

  defp parse_status(status) when status in @statuses, do: {:ok, status}

  defp parse_status(status) when is_binary(status) do
    case Enum.find(@statuses, fn s -> Atom.to_string(s) == status end) do
      nil -> :error
      s -> {:ok, s}
    end
  end

  defp parse_status(_), do: :error

  @spec self_update_changeset(t(), map()) :: Ecto.Changeset.t()
  def self_update_changeset(client, attrs) do
    client
    |> cast(attrs, @self_update_cast_fields)
  end

  @spec inquiry_changeset(String.t(), map()) :: Ecto.Changeset.t()
  def inquiry_changeset(business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @inquiry_cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:status, :pending)
    |> validate_required([:first_name, :email, :phone, :business_id])
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email")
    |> unique_constraint(:email, name: :clients_business_id_email_index)
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

  @spec get_for_user(String.t(), String.t()) :: {:ok, t()} | {:error, :not_found}
  def get_for_user(business_id, user_id) do
    case __MODULE__ |> for_business(business_id) |> for_user(user_id) |> Repo.one() do
      nil -> {:error, :not_found}
      client -> {:ok, client}
    end
  end

  @spec resolve_invitation_token(String.t()) ::
          {:ok, t()} | {:error, :used | :expired | :invalid}
  def resolve_invitation_token(token) when is_binary(token) and token != "" do
    case __MODULE__ |> where([c], c.invitation_token == ^token) |> Repo.one() do
      nil -> {:error, :invalid}
      %__MODULE__{status: :pending} = client -> check_expiry(client)
      %__MODULE__{} -> {:error, :used}
    end
  end

  def resolve_invitation_token(_), do: {:error, :invalid}

  defp check_expiry(%__MODULE__{} = client) do
    if invitation_expired?(client) do
      {:error, :expired}
    else
      {:ok, client}
    end
  end

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
        ilike(c.first_name, ^"%#{term}%") or
          ilike(c.last_name, ^"%#{term}%") or
          ilike(c.email, ^"%#{term}%") or
          ilike(c.phone, ^"%#{term}%")
    )
  end

  @spec with_status(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def with_status(query \\ __MODULE__, status)
  def with_status(query, nil), do: query
  def with_status(query, ""), do: query

  def with_status(query, status) when is_binary(status) do
    from(c in query, where: c.status == ^status)
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(c in query, order_by: [desc: c.inserted_at, desc: c.id])
  end

  @spec with_preloads(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_preloads(query \\ __MODULE__) do
    from(c in query, preload: [:user, :business, :creator])
  end

  @spec active_for_email(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def active_for_email(query \\ __MODULE__, email) do
    from(c in query,
      join: u in User,
      on: u.id == c.user_id,
      where: u.email == ^email and c.status == ^:active
    )
  end

  # Actions

  @spec invite(map(), map()) :: {:ok, t()} | {:error, any()}
  def invite(claims, invite_attrs) when is_map(claims) do
    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         :ok <- validate_not_self_invite(coach, invite_attrs),
         :ok <- validate_email_has_no_active_client(invite_attrs),
         {:ok, client} <- create_invitation(coach, invite_attrs),
         :ok <- maybe_send_invitation_email(client, coach) do
      {:ok, client}
    end
  end

  defp validate_not_self_invite(%Orgs.Coach{user: %User{email: coach_email}}, %{"email" => email})
       when is_binary(coach_email) and is_binary(email) and email != "" and coach_email == email do
    {:error, Easy.Error.unprocessable(%{email: ["you can't invite yourself as a client"]})}
  end

  defp validate_not_self_invite(_coach, _attrs), do: :ok

  defp validate_email_has_no_active_client(%{"email" => email})
       when is_binary(email) and email != "" do
    if Repo.exists?(active_for_email(email)) do
      {:error,
       Easy.Error.unprocessable(%{
         email: ["is already an active client of another business"]
       })}
    else
      :ok
    end
  end

  defp validate_email_has_no_active_client(_attrs), do: :ok

  @spec create_inquiry(String.t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create_inquiry(business_id, attrs) do
    business_id
    |> inquiry_changeset(attrs)
    |> Repo.insert()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(client, attrs) do
    client
    |> update_changeset(attrs)
    |> Repo.update()
  end

  @spec accept_invite(t(), String.t(), String.t()) ::
          {:ok, t()} | {:error, :race_lost | :already_active_elsewhere}
  def accept_invite(%__MODULE__{id: client_id, business_id: business_id}, user_id, accepted_email) do
    # "One active Client per User" MVP invariant enforced again at accept time
    # (the same check runs at invite creation, but two invites can be created
    # for the same email while the User doesn't yet exist — so we re-check here).
    if user_has_active_client_elsewhere?(user_id, business_id) do
      {:error, :already_active_elsewhere}
    else
      do_atomic_accept(client_id, user_id, accepted_email)
    end
  end

  defp user_has_active_client_elsewhere?(user_id, business_id) do
    from(c in __MODULE__,
      where:
        c.user_id == ^user_id and c.status == ^:active and
          c.business_id != ^business_id
    )
    |> Repo.exists?()
  end

  defp do_atomic_accept(client_id, user_id, accepted_email) do
    now = DateTime.utc_now(:second)

    query =
      from(c in __MODULE__,
        where: c.id == ^client_id and c.status == ^:pending,
        select: c
      )

    case Repo.update_all(query,
           set: [
             user_id: user_id,
             status: :active,
             email: accepted_email,
             updated_at: now
           ]
         ) do
      {1, [updated]} -> {:ok, updated}
      {0, _} -> {:error, :race_lost}
    end
  end

  @spec revoke_invitation(t()) :: {:ok, t()} | {:error, Easy.Error.t() | Ecto.Changeset.t()}
  def revoke_invitation(%__MODULE__{status: :pending} = client) do
    Repo.transaction(fn ->
      # Personal plans (assigned to this pending client) are deleted with the client.
      # Templates (client_id IS NULL) are unaffected. The `:nilify_all` FK would
      # otherwise convert personal plans into templates, polluting the coach's templates list.
      from(tp in Easy.Training.TrainingPlan, where: tp.client_id == ^client.id)
      |> Repo.delete_all()

      from(np in Easy.Nutrition.Plan, where: np.client_id == ^client.id)
      |> Repo.delete_all()

      # Nilify references from leads so the hard-delete doesn't trip the :on_delete :nothing FK.
      from(l in Easy.Storefront.Lead, where: l.client_id == ^client.id)
      |> Repo.update_all(set: [client_id: nil])

      # Use a changeset with foreign_key_constraint entries so any unexpected FK
      # violation (e.g. workout_sessions with on_delete: :nothing) surfaces as a
      # clean 422 instead of raising Ecto.ConstraintError.
      delete_cs =
        client
        |> change()
        |> foreign_key_constraint(:base,
          name: :workout_sessions_client_id_fkey,
          message: "client has activity records and cannot be revoked"
        )

      case Repo.delete(delete_cs) do
        {:ok, deleted} -> deleted
        {:error, changeset} -> Repo.rollback(changeset)
      end
    end)
  end

  def revoke_invitation(%__MODULE__{}) do
    {:error,
     Easy.Error.unprocessable(%{
       status: ["only pending invitations can be revoked; archive the client instead"]
     })}
  end

  @spec get_profile(String.t(), String.t()) ::
          {:ok, %{client: t(), coach: Orgs.Coach.t()}} | {:error, :not_found}
  def get_profile(business_id, user_id) do
    with {:ok, client} <- get_for_user(business_id, user_id) do
      coach =
        Orgs.Coach
        |> Orgs.Coach.for_business(business_id)
        |> Orgs.Coach.with_preloads()
        |> Repo.one()

      {:ok, %{client: client, coach: coach}}
    end
  end

  @spec self_update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def self_update(client, attrs) do
    client
    |> self_update_changeset(attrs)
    |> Repo.update()
  end

  @spec summary(Ecto.Queryable.t()) :: map()
  def summary(query) do
    counts =
      from(c in query,
        select: %{
          active: count(fragment("CASE WHEN ? = 'active' THEN 1 END", c.status)),
          pending: count(fragment("CASE WHEN ? = 'pending' THEN 1 END", c.status)),
          inactive: count(fragment("CASE WHEN ? = 'inactive' THEN 1 END", c.status)),
          archived: count(fragment("CASE WHEN ? = 'archived' THEN 1 END", c.status))
        }
      )
      |> Repo.one()

    counts || %{active: 0, pending: 0, inactive: 0, archived: 0}
  end

  @spec resend_invitation(t(), Orgs.Coach.t()) :: {:ok, t()} | {:error, Easy.Error.t()}
  def resend_invitation(%__MODULE__{status: :pending, email: email} = client, coach)
      when is_binary(email) and email != "" do
    case client |> change(%{invitation_sent_at: DateTime.utc_now(:second)}) |> Repo.update() do
      {:ok, updated} ->
        maybe_send_invitation_email(updated, coach)
        {:ok, updated}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  def resend_invitation(%__MODULE__{status: :pending, email: nil}, _coach) do
    {:error, Easy.Error.unprocessable(%{email: ["client has no email address"]})}
  end

  def resend_invitation(%__MODULE__{status: :pending, email: ""}, _coach) do
    {:error, Easy.Error.unprocessable(%{email: ["client has no email address"]})}
  end

  def resend_invitation(%__MODULE__{}, _coach) do
    {:error, Easy.Error.unprocessable(%{status: ["client is not in pending status"]})}
  end

  @spec build_invite_url(t()) :: String.t() | nil
  def build_invite_url(%__MODULE__{status: :pending, invitation_token: token})
      when is_binary(token) do
    base_url = Application.get_env(:easy, :client_frontend_url, "http://localhost:1313")
    "#{base_url}/invite/#{token}"
  end

  def build_invite_url(%__MODULE__{}), do: nil

  defp create_invitation(coach, invite_attrs) do
    coach
    |> invite_changeset(invite_attrs)
    |> Repo.insert()
  end

  defp maybe_send_invitation_email(%__MODULE__{email: nil}, _coach), do: :ok
  defp maybe_send_invitation_email(%__MODULE__{email: ""}, _coach), do: :ok

  defp maybe_send_invitation_email(client, coach) do
    business = Repo.preload(coach, :business).business
    coach_name = Easy.Orgs.Coach.full_name(coach)

    email =
      Easy.Emails.client_invitation_email(
        client.email,
        client.invitation_token,
        if(coach_name == "", do: "Coach", else: coach_name),
        business.name
      )

    Easy.MailerDelivery.deliver_async(email,
      metadata: %{email: client.email}
    )
  end

  defp generate_token do
    :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)
  end
end
