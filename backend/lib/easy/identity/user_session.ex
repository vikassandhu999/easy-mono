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
    field :role, Ecto.Enum, values: @roles

    belongs_to :user, Easy.Identity.User

    timestamps()
  end

  @spec new_session(map()) :: Ecto.Changeset.t()
  def new_session(attrs) do
    %__MODULE__{}
    |> cast(attrs, [
      :ip,
      :user_agent,
      :expires_at,
      :revoked_at,
      :refresh_token,
      :refreshed_at,
      :user_id,
      :business_id,
      :role
    ])
    |> validate_required([:refresh_token, :expires_at, :user_id, :role])
    |> unique_constraint(:refresh_token)
  end

  def refresh_changeset(%__MODULE__{} = session, attrs) do
    session
    |> cast(attrs, [:ip, :user_agent, :refreshed_at, :business_id, :role])
    |> put_change(:refreshed_at, DateTime.utc_now(:second))
  end

  def is_expired?(%__MODULE__{expires_at: expires_at}) do
    DateTime.compare(DateTime.utc_now(), expires_at) == :gt
  end

  def is_revoked?(%__MODULE__{revoked_at: nil}), do: false
  def is_revoked?(%__MODULE__{revoked_at: _}), do: true

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
