defmodule Easy.Identity.UserSession do
  use Ecto.Schema

  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @type role :: :owner | :coach | :client | :guest

  @roles [:owner, :coach, :client, :guest]

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "user_sessions" do
    field :ip, :string
    field :user_agent, :string
    field :expires_at, :utc_datetime
    field :revoked_at, :utc_datetime
    field :refresh_token, :string
    field :refreshed_at, :utc_datetime

    field :business_id, :binary_id
    field :coach_id, :binary_id
    field :is_owner, :boolean, default: false
    field :role, Ecto.Enum, values: @roles

    belongs_to :user, Easy.Identity.User

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(binary() | nil, binary(), role(), binary() | nil, boolean(), map()) ::
          Ecto.Changeset.t()
  def insert_changeset(business_id, user_id, role, coach_id, owner?, attrs) do
    %__MODULE__{}
    |> cast(attrs, [
      :ip,
      :user_agent,
      :expires_at,
      :revoked_at,
      :refresh_token,
      :refreshed_at
    ])
    |> put_change(:user_id, user_id)
    |> put_change(:business_id, business_id)
    |> put_change(:role, role)
    |> put_change(:coach_id, coach_id)
    |> put_change(:is_owner, owner?)
    |> validate_required([:refresh_token, :expires_at, :user_id, :role])
    |> unique_constraint(:refresh_token)
  end

  @spec update_changeset(t(), binary() | nil, role(), binary() | nil, boolean(), map()) ::
          Ecto.Changeset.t()
  def update_changeset(%__MODULE__{} = session, business_id, role, coach_id, owner?, attrs) do
    session
    |> cast(attrs, [:ip, :user_agent, :refreshed_at])
    |> put_change(:business_id, business_id)
    |> put_change(:role, role)
    |> put_change(:coach_id, coach_id)
    |> put_change(:is_owner, owner?)
    |> put_change(:refreshed_at, DateTime.utc_now(:second))
  end

  @spec expired?(t()) :: boolean()
  def expired?(%__MODULE__{expires_at: expires_at}) do
    DateTime.compare(DateTime.utc_now(), expires_at) == :gt
  end

  @spec revoked?(t()) :: boolean()
  def revoked?(%__MODULE__{revoked_at: nil}), do: false
  def revoked?(%__MODULE__{revoked_at: _}), do: true

  @spec bump_refreshed_at(t()) :: Ecto.Changeset.t()
  def bump_refreshed_at(%__MODULE__{} = session) do
    session
    |> change(%{refreshed_at: DateTime.utc_now(:second)})
  end

  @spec roles() :: [role()]
  def roles do
    @roles
  end
end
