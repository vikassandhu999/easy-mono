defmodule Easy.Orgs.Coach do
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Easy.Orgs.Business

  @type t() :: %__MODULE__{}

  @invitation_validity_days 30

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "coaches" do
    field :first_name, :string
    field :last_name, :string
    field :phone, :string
    field :assigned_client_count, :integer, virtual: true, default: 0
    field :email, :string
    field :status, Ecto.Enum, values: [:invited, :active, :inactive], default: :active
    field :invitation_token, :string
    field :invitation_sent_at, :utc_datetime
    field :invited_by_id, :binary_id

    belongs_to :user, Easy.Identity.User
    belongs_to :business, Business

    timestamps(type: :utc_datetime)
  end

  # Changesets

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, user_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:first_name, :last_name])
    |> put_change(:business_id, business_id)
    |> put_change(:user_id, user_id)
    |> validate_required([:business_id, :user_id])
    |> validate_profile()
    |> unique_constraint(:user_id)
    |> unique_constraint(:user_id, name: :coaches_user_id_business_id_index)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:business_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(coach, attrs) do
    coach
    |> cast(attrs, [:first_name, :last_name, :phone])
    |> validate_profile()
  end

  @spec status_changeset(t(), :active | :inactive) :: Ecto.Changeset.t()
  def status_changeset(coach, status) when status in [:active, :inactive] do
    change(coach, status: status)
  end

  @spec invite_changeset(String.t(), String.t(), DateTime.t(), map()) :: Ecto.Changeset.t()
  def invite_changeset(business_id, invited_by_id, sent_at, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:email, :first_name, :last_name])
    |> validate_profile()
    |> update_change(:email, &normalize_email/1)
    |> validate_required([:email])
    |> validate_length(:email, max: 255, count: :codepoints)
    |> validate_format(
      :email,
      ~r/^[\w.!#$%&'*+=?^`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    )
    |> put_change(:business_id, business_id)
    |> put_change(:invited_by_id, invited_by_id)
    |> put_change(:status, :invited)
    |> put_change(:invitation_token, generate_token())
    |> put_change(:invitation_sent_at, sent_at)
    |> unique_constraint(:email, name: :coaches_business_id_lower_email_index)
    |> unique_constraint(:user_id)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:invited_by_id)
  end

  @spec resend_invite_changeset(t(), DateTime.t()) :: Ecto.Changeset.t()
  def resend_invite_changeset(coach, sent_at) do
    coach
    |> change()
    |> put_change(:invitation_token, generate_token())
    |> put_change(:invitation_sent_at, sent_at)
  end

  @spec normalize_email(String.t() | nil) :: String.t() | nil
  def normalize_email(nil), do: nil

  def normalize_email(email) do
    case String.trim(email) do
      "" -> nil
      trimmed -> String.downcase(trimmed)
    end
  end

  defp validate_profile(changeset) do
    changeset
    |> validate_length(:first_name, max: 255, count: :codepoints)
    |> validate_length(:last_name, max: 255, count: :codepoints)
    |> validate_length(:phone, max: 255, count: :codepoints)
  end

  defp generate_token do
    :crypto.strong_rand_bytes(24) |> Base.url_encode64(padding: false)
  end

  # Queries

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(c in query, where: c.business_id == ^business_id)
  end

  @spec for_status(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def for_status(query, nil), do: query
  def for_status(query, status), do: from(coach in query, where: coach.status == ^status)

  @spec search(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def search(query, search) when search in [nil, ""], do: query

  def search(query, search) do
    pattern = "%" <> (search |> String.trim() |> String.replace("\\", "\\\\") |> String.replace("%", "\\%") |> String.replace("_", "\\_")) <> "%"

    from(coach in query,
      left_join: user in assoc(coach, :user),
      where: ilike(fragment("concat_ws(' ', ?, ?, coalesce(?, ?))", coach.first_name, coach.last_name, user.email, coach.email), ^pattern)
    )
  end

  @spec include_client_counts(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_client_counts(query, business_id) do
    coach_ids = from(coach in query, select: coach.id)

    counts =
      from(client in Easy.Clients.Client,
        where: client.business_id == ^business_id,
        where: client.assigned_coach_id in subquery(coach_ids),
        group_by: client.assigned_coach_id,
        select: %{coach_id: client.assigned_coach_id, count: count(client.id)}
      )

    from(coach in query, left_join: count in subquery(counts), on: count.coach_id == coach.id, select_merge: %{assigned_client_count: coalesce(count.count, 0)}, preload: [:user])
  end

  @spec for_id(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_id(query, id), do: from(coach in query, where: coach.id == ^id)

  @spec active(Ecto.Queryable.t()) :: Ecto.Query.t()
  def active(query \\ __MODULE__) do
    from(c in query, where: c.status == :active)
  end

  @spec inactive(Ecto.Queryable.t()) :: Ecto.Query.t()
  def inactive(query \\ __MODULE__), do: from(c in query, where: c.status == :inactive)

  @spec invited(Ecto.Queryable.t()) :: Ecto.Query.t()
  def invited(query \\ __MODULE__), do: from(c in query, where: c.status == :invited)

  @spec for_user(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_user(query \\ __MODULE__, user_id) do
    from(c in query, where: c.user_id == ^user_id)
  end

  @spec for_invitation_token(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_invitation_token(query \\ __MODULE__, token) do
    from(c in query, where: c.invitation_token == ^token)
  end

  @spec for_email(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_email(query \\ __MODULE__, email) do
    from(c in query, where: fragment("lower(?)", c.email) == ^email)
  end

  @spec pending_invitation(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def pending_invitation(query \\ __MODULE__, coach_id) do
    query
    |> invited()
    |> where([c], c.id == ^coach_id)
    |> select([c], c)
  end

  @spec include_preloads(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_preloads(query \\ __MODULE__, _business_id) do
    from(c in query, preload: [:user, :business])
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(c in query, order_by: [desc: c.inserted_at, desc: c.id])
  end

  @spec invitation_expired?(t(), DateTime.t()) :: boolean()
  def invitation_expired?(%__MODULE__{invitation_sent_at: nil}, _now), do: false

  def invitation_expired?(%__MODULE__{invitation_sent_at: sent_at}, now) do
    DateTime.compare(now, expires_at(sent_at)) == :gt
  end

  @spec invitation_expires_at(t()) :: DateTime.t() | nil
  def invitation_expires_at(%__MODULE__{status: :invited, invitation_sent_at: sent_at}) when not is_nil(sent_at), do: expires_at(sent_at)
  def invitation_expires_at(%__MODULE__{}), do: nil

  defp expires_at(sent_at), do: DateTime.add(sent_at, @invitation_validity_days, :day)

  @spec full_name(t()) :: String.t()
  def full_name(%__MODULE__{first_name: first, last_name: last}) do
    [first, last]
    |> Enum.reject(&is_nil/1)
    |> Enum.join(" ")
    |> String.trim()
  end
end
