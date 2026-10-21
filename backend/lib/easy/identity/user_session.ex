defmodule Easy.Identity.UserSession do
  use Ecto.Schema

  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @type role :: :owner | :coach | :client | :guest

  @type scope ::
          %{role: :coach, business_id: binary(), coach_id: binary(), is_owner: boolean()}
          | %{role: :client, business_id: binary()}
          | %{role: :guest, business_id: nil}

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

  @spec insert_changeset(binary(), scope(), map()) :: Ecto.Changeset.t()
  def insert_changeset(user_id, scope, attrs) do
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
    |> put_scope(scope)
    |> validate_required([:refresh_token, :expires_at, :user_id, :role])
    |> unique_constraint(:refresh_token)
  end

  @spec update_changeset(t(), scope(), DateTime.t(), map()) :: Ecto.Changeset.t()
  def update_changeset(%__MODULE__{} = session, scope, refreshed_at, attrs) do
    session
    |> cast(attrs, [:ip, :user_agent])
    |> put_scope(scope)
    |> put_change(:refreshed_at, refreshed_at)
  end

  defp put_scope(changeset, %{business_id: business_id, role: role} = scope) do
    changeset
    |> put_change(:business_id, business_id)
    |> put_change(:role, role)
    |> put_change(:coach_id, scope[:coach_id])
    |> put_change(:is_owner, scope[:is_owner] || false)
  end

  @spec expired?(t(), DateTime.t()) :: boolean()
  def expired?(%__MODULE__{expires_at: expires_at}, now) do
    DateTime.compare(now, expires_at) == :gt
  end

  @spec revoked?(t()) :: boolean()
  def revoked?(%__MODULE__{revoked_at: nil}), do: false
  def revoked?(%__MODULE__{revoked_at: _}), do: true
end
