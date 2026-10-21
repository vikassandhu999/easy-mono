defmodule Easy.Identity.OneTimeToken do
  use Ecto.Schema

  alias Easy.Identity.User

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @type token_type() :: :email_confirmation | :authentication | :invitation_acceptance

  @validity_seconds 600

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @token_types [
    :email_confirmation,
    :authentication,
    :invitation_acceptance
  ]

  schema "one_time_tokens" do
    field :token_hash, :string
    field :token_type, Ecto.Enum, values: @token_types
    field :relates_to, :string

    belongs_to :user, User

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(binary() | nil, map()) :: Ecto.Changeset.t()
  def insert_changeset(user_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:token_type, :token_hash, :relates_to])
    |> put_change(:user_id, user_id)
    |> validate_required([:token_type, :token_hash, :relates_to])
    |> unique_constraint(:token_hash)
    |> foreign_key_constraint(:user_id)
  end

  @spec matching_hash(Ecto.Queryable.t(), String.t(), token_type()) :: Ecto.Query.t()
  def matching_hash(query \\ __MODULE__, token_hash, token_type) do
    from(token in query, where: token.token_hash == ^token_hash and token.token_type == ^token_type)
  end

  @spec issued_to_user(Ecto.Queryable.t(), String.t(), token_type()) :: Ecto.Query.t()
  def issued_to_user(query \\ __MODULE__, user_id, token_type) do
    from(token in query, where: token.user_id == ^user_id and token.token_type == ^token_type)
  end

  @spec issued_for(Ecto.Queryable.t(), String.t(), token_type()) :: Ecto.Query.t()
  def issued_for(query \\ __MODULE__, relates_to, token_type) do
    from(token in query, where: token.relates_to == ^relates_to and token.token_type == ^token_type)
  end

  @spec include_user(Ecto.Queryable.t()) :: Ecto.Query.t()
  def include_user(query \\ __MODULE__), do: preload(query, :user)

  @spec expired?(t(), DateTime.t()) :: boolean()
  def expired?(%__MODULE__{inserted_at: inserted_at}, now) do
    DateTime.diff(now, inserted_at, :second) >= @validity_seconds
  end
end
