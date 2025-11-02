defmodule Easy.Whoami.Session do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "usr_sessions" do
    field :user_id, :binary_id
    field :not_after, :utc_datetime_usec
    field :refresh_token, :string
    field :refreshed_at, :utc_datetime_usec
    field :revoked_at, :utc_datetime_usec
    field :user_agent, :string
    field :ip, :string
    field :tag, :string

    belongs_to :user, Easy.Whoami.User, define_field: false

    timestamps(type: :utc_datetime_usec)
  end

  @grant_levels %{
    password: 1,
    oauth: 2,
    passcode: 3
  }

  def grant_levels, do: @grant_levels

  @doc false
  def changeset(session, attrs) do
    session
    |> cast(attrs, [
      :user_id,
      :not_after,
      :refresh_token,
      :refreshed_at,
      :revoked_at,
      :user_agent,
      :ip,
      :tag
    ])
    |> validate_required([:user_id, :refresh_token])
    |> unique_constraint(:refresh_token)
    |> foreign_key_constraint(:user_id)
  end

  @doc """
  Creates a new session with a generated refresh token.
  """
  def new_session(attrs) do
    refresh_token = generate_token()
    now = DateTime.utc_now()

    attrs
    |> Map.put(:refresh_token, refresh_token)
    |> Map.put(:refreshed_at, now)
  end

  @doc """
  Generates a secure random token.
  """
  def generate_token do
    :crypto.strong_rand_bytes(32)
    |> Base.url_encode64(padding: false)
  end

  @doc """
  Returns true if the session is revoked.
  """
  def revoked?(%__MODULE__{revoked_at: nil}), do: false
  def revoked?(%__MODULE__{revoked_at: _}), do: true

  @doc """
  Returns true if the session is expired based on not_after.
  """
  def expired?(%__MODULE__{not_after: nil}), do: false

  def expired?(%__MODULE__{not_after: not_after}) do
    DateTime.compare(DateTime.utc_now(), not_after) == :gt
  end
end
