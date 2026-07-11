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

  @spec insert_changeset(map()) :: Ecto.Changeset.t()
  def insert_changeset(attrs) do
    %__MODULE__{}
    |> cast(attrs, [:first_name, :last_name])
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(coach, attrs) do
    coach
    |> cast(attrs, [:first_name, :last_name, :phone])
  end

  @spec invite_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def invite_changeset(business_id, invited_by_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:email, :first_name, :last_name])
    |> update_change(:email, &downcase/1)
    |> validate_required([:email])
    |> validate_format(
      :email,
      ~r/^[\w.!#$%&'*+=?^`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    )
    |> put_change(:business_id, business_id)
    |> put_change(:invited_by_id, invited_by_id)
    |> put_change(:status, :invited)
    |> put_change(:invitation_token, generate_token())
    |> put_change(:invitation_sent_at, DateTime.utc_now(:second))
    |> unique_constraint(:email, name: :coaches_business_id_lower_email_index)
    |> unique_constraint(:user_id)
  end

  @spec accept_changeset(t(), String.t()) :: Ecto.Changeset.t()
  def accept_changeset(coach, user_id) do
    coach
    |> change()
    |> put_change(:user_id, user_id)
    |> put_change(:status, :active)
    |> put_change(:invitation_token, nil)
    |> unique_constraint(:user_id)
  end

  @spec resend_invite_changeset(t()) :: Ecto.Changeset.t()
  def resend_invite_changeset(coach) do
    coach
    |> change()
    |> put_change(:invitation_token, generate_token())
    |> put_change(:invitation_sent_at, DateTime.utc_now(:second))
  end

  defp downcase(nil), do: nil
  defp downcase(email), do: String.downcase(email)

  defp generate_token do
    :crypto.strong_rand_bytes(24) |> Base.url_encode64(padding: false)
  end

  # Queries

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(c in query, where: c.business_id == ^business_id)
  end

  @spec active(Ecto.Queryable.t()) :: Ecto.Query.t()
  def active(query \\ __MODULE__) do
    from(c in query, where: c.status == :active)
  end

  @spec for_user(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_user(query \\ __MODULE__, user_id) do
    from(c in query, where: c.user_id == ^user_id)
  end

  @spec include_preloads(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_preloads(query \\ __MODULE__, _business_id) do
    from(c in query, preload: [:user, :business])
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(c in query, order_by: [desc: c.inserted_at, desc: c.id])
  end

  @spec invitation_expired?(t()) :: boolean()
  def invitation_expired?(%__MODULE__{invitation_sent_at: nil}), do: false

  def invitation_expired?(%__MODULE__{invitation_sent_at: sent_at}) do
    expires_at = DateTime.add(sent_at, @invitation_validity_days, :day)
    DateTime.compare(DateTime.utc_now(), expires_at) == :gt
  end

  @spec full_name(t()) :: String.t()
  def full_name(%__MODULE__{first_name: first, last_name: last}) do
    [first, last]
    |> Enum.reject(&is_nil/1)
    |> Enum.join(" ")
    |> String.trim()
  end
end
