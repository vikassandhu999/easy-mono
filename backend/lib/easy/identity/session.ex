defmodule Easy.Identity.Session do
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Easy.Identity.User
  alias Easy.Repo

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "user_sessions" do
    field :refresh_token, :string
    field :expires_at, :utc_datetime
    field :refreshed_at, :utc_datetime
    field :revoked_at, :utc_datetime
    field :last_activity_at, :utc_datetime

    # Device information
    field :device_name, :string
    field :device_type, :string
    field :user_agent, :string
    field :ip, :string

    belongs_to :user, User

    timestamps(type: :utc_datetime)
  end

  @doc """
  Changeset for creating a new session.
  """
  def changeset(session, attrs) do
    session
    |> cast(attrs, [
      :user_id,
      :refresh_token,
      :expires_at,
      :refreshed_at,
      :revoked_at,
      :last_activity_at,
      :device_name,
      :device_type,
      :user_agent,
      :ip
    ])
    |> validate_required([:user_id, :refresh_token, :expires_at])
    |> validate_length(:refresh_token, min: 32)
    |> validate_inclusion(:device_type, ["mobile", "web", "desktop", "tablet", "unknown"],
      message: "must be one of: mobile, web, desktop, tablet, unknown"
    )
    |> unique_constraint(:refresh_token)
    |> foreign_key_constraint(:user_id)
  end

  @doc """
  Changeset for creating a new session.
  Sets default expiration of 30 days if not provided.
  """
  def create_changeset(session, attrs) do
    attrs_with_defaults =
      Map.put_new(attrs, :expires_at, DateTime.add(DateTime.utc_now(), 30, :day))

    session
    |> cast(attrs_with_defaults, [
      :user_id,
      :refresh_token,
      :expires_at,
      :refreshed_at,
      :device_name,
      :device_type,
      :user_agent,
      :ip
    ])
    |> validate_required([:user_id, :refresh_token, :expires_at])
    |> validate_length(:refresh_token, min: 32)
    |> unique_constraint(:refresh_token)
    |> foreign_key_constraint(:user_id)
  end

  @doc """
  Changeset for refreshing a session.
  """
  def refresh_changeset(session, attrs) do
    session
    |> cast(attrs, [:refresh_token, :refreshed_at, :expires_at, :last_activity_at])
    |> validate_required([:refresh_token, :refreshed_at, :expires_at])
    |> validate_length(:refresh_token, min: 32)
    |> unique_constraint(:refresh_token)
  end

  @doc """
  Marks a session as revoked.
  Returns {:ok, session} or {:error, changeset}.
  """
  def revoke(%__MODULE__{} = session) do
    session
    |> change(%{revoked_at: DateTime.utc_now() |> DateTime.truncate(:second)})
    |> Repo.update()
  end

  @doc """
  Refreshes a session with a new refresh token and expiry.
  Returns {:ok, session} or {:error, changeset}.
  """
  def refresh(%__MODULE__{} = session, new_refresh_token, new_expires_at) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    session
    |> refresh_changeset(%{
      refresh_token: new_refresh_token,
      refreshed_at: now,
      expires_at: new_expires_at,
      last_activity_at: now
    })
    |> Repo.update()
  end

  @doc """
  Updates the last_activity_at timestamp for a session.
  Returns {:ok, session} or {:error, changeset}.
  """
  def touch_activity(%__MODULE__{} = session) do
    session
    |> change(%{last_activity_at: DateTime.utc_now() |> DateTime.truncate(:second)})
    |> Repo.update()
  end

  @doc """
  Checks if a session is currently active (not expired and not revoked).
  """
  def active?(%__MODULE__{} = session) do
    now = DateTime.utc_now()

    is_nil(session.revoked_at) &&
      DateTime.compare(session.expires_at, now) == :gt
  end

  @doc """
  Query to find an active session by ID.
  Returns the session if active, nil otherwise.
  """
  def get_active_session(session_id) do
    now = DateTime.utc_now()

    from(s in __MODULE__,
      where: s.id == ^session_id,
      where: is_nil(s.revoked_at),
      where: s.expires_at > ^now
    )
    |> Repo.one()
  end

  @doc """
  Query to find an active session by refresh token.
  Returns the session if active, nil otherwise.
  """
  def get_active_session_by_refresh_token(refresh_token) do
    now = DateTime.utc_now()

    from(s in __MODULE__,
      where: s.refresh_token == ^refresh_token,
      where: is_nil(s.revoked_at),
      where: s.expires_at > ^now
    )
    |> Repo.one()
  end

  @doc """
  Query to get all active sessions for a user.
  """
  def get_active_sessions_for_user(user_id) do
    now = DateTime.utc_now()

    from(s in __MODULE__,
      where: s.user_id == ^user_id,
      where: is_nil(s.revoked_at),
      where: s.expires_at > ^now,
      order_by: [desc: s.last_activity_at]
    )
    |> Repo.all()
  end

  @doc """
  Query to get all sessions (including inactive) for a user.
  Useful for "active devices" management UI.
  """
  def get_all_sessions_for_user(user_id) do
    from(s in __MODULE__,
      where: s.user_id == ^user_id,
      order_by: [desc: s.last_activity_at]
    )
    |> Repo.all()
  end

  @doc """
  Revokes all active sessions for a user (logout from all devices).
  Returns {count, nil} where count is the number of sessions revoked.
  """
  def revoke_all_for_user(user_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    from(s in __MODULE__,
      where: s.user_id == ^user_id,
      where: is_nil(s.revoked_at),
      where: s.expires_at > ^now
    )
    |> Repo.update_all(set: [revoked_at: now])
  end

  @doc """
  Deletes old sessions (revoked or expired) older than the given date.
  Useful for cleanup jobs.
  Returns {count, nil} where count is the number of deleted sessions.
  """
  def delete_old_sessions(older_than \\ nil) do
    cutoff_date = older_than || DateTime.add(DateTime.utc_now(), -90, :day)
    now = DateTime.utc_now()

    from(s in __MODULE__,
      where:
        (not is_nil(s.revoked_at) and s.revoked_at < ^cutoff_date) or
          (s.expires_at < ^now and s.expires_at < ^cutoff_date)
    )
    |> Repo.delete_all()
  end

  @doc """
  Returns a query for sessions that are expired or revoked.
  Useful for cleanup or analytics.
  """
  def inactive_sessions_query do
    now = DateTime.utc_now()

    from(s in __MODULE__,
      where: not is_nil(s.revoked_at) or s.expires_at <= ^now
    )
  end
end
