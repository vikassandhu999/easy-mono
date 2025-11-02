defmodule Easy.Whoami do
  @moduledoc """
  The Whoami context for user authentication and session management.
  """

  import Ecto.Query, warn: false
  alias Easy.Repo

  alias Easy.Whoami.{User, Session, OneTimeToken}

  # User functions

  @doc """
  Returns the list of users.
  """
  def list_users do
    Repo.all(User)
  end

  @doc """
  Gets a single user by ID.
  Raises `Ecto.NoResultsError` if the User does not exist.
  """
  def get_user!(id), do: Repo.get!(User, id)

  @doc """
  Gets a user by email.
  """
  def get_user_by_email(email) when is_binary(email) do
    Repo.get_by(User, email: String.downcase(email))
  end

  @doc """
  Gets a user by phone number.
  """
  def get_user_by_phone(phone) when is_binary(phone) do
    Repo.get_by(User, phone: phone)
  end

  @doc """
  Registers a new user.
  """
  def register_user(attrs \\ %{}) do
    %User{}
    |> User.registration_changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Creates a user.
  """
  def create_user(attrs \\ %{}) do
    %User{}
    |> User.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a user.
  """
  def update_user(%User{} = user, attrs) do
    user
    |> User.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Confirms a user's email.
  """
  def confirm_user_email(%User{} = user) do
    user
    |> User.changeset(%{email_confirmed_at: DateTime.utc_now()})
    |> Repo.update()
  end

  @doc """
  Confirms a user's phone.
  """
  def confirm_user_phone(%User{} = user) do
    user
    |> User.changeset(%{phone_confirmed_at: DateTime.utc_now()})
    |> Repo.update()
  end

  @doc """
  Soft deletes a user by setting deleted_at.
  """
  def delete_user(%User{} = user) do
    user
    |> User.changeset(%{deleted_at: DateTime.utc_now()})
    |> Repo.update()
  end

  @doc """
  Bans a user until a specific time.
  """
  def ban_user(%User{} = user, until) do
    user
    |> User.changeset(%{banned_until: until})
    |> Repo.update()
  end

  @doc """
  Authenticates a user with email and password.
  Returns {:ok, user} or {:error, :invalid_credentials}.
  """
  def authenticate_by_email_password(email, password)
      when is_binary(email) and is_binary(password) do
    user = get_user_by_email(email)

    cond do
      user && User.valid_password?(user, password) ->
        {:ok, user}

      user ->
        {:error, :invalid_credentials}

      true ->
        # Run password hash to prevent timing attacks
        Bcrypt.no_user_verify()
        {:error, :invalid_credentials}
    end
  end

  # Session functions

  @doc """
  Gets a session by refresh token.
  """
  def get_session_by_token(refresh_token) do
    Repo.get_by(Session, refresh_token: refresh_token)
  end

  @doc """
  Creates a session for a user.
  """
  def create_session(attrs \\ %{}) do
    session_attrs = Session.new_session(attrs)

    %Session{}
    |> Session.changeset(session_attrs)
    |> Repo.insert()
  end

  @doc """
  Updates the refreshed_at timestamp on a session.
  """
  def refresh_session(%Session{} = session) do
    session
    |> Session.changeset(%{refreshed_at: DateTime.utc_now()})
    |> Repo.update()
  end

  @doc """
  Revokes a session.
  """
  def revoke_session(%Session{} = session) do
    session
    |> Session.changeset(%{revoked_at: DateTime.utc_now()})
    |> Repo.update()
  end

  @doc """
  Gets user and session by refresh token.
  """
  def get_user_and_session(refresh_token) do
    case get_session_by_token(refresh_token) do
      nil ->
        {:error, :session_not_found}

      session ->
        user = Repo.get(User, session.user_id)
        {:ok, user, session}
    end
  end

  @doc """
  Deletes all sessions for a user.
  """
  def delete_user_sessions(user_id) do
    from(s in Session, where: s.user_id == ^user_id)
    |> Repo.delete_all()
  end

  # OneTimeToken functions

  @doc """
  Creates a one-time token for a user.
  """
  def create_token(attrs, is_phone_token \\ false) do
    token_attrs = OneTimeToken.new_token(attrs, is_phone_token)

    %OneTimeToken{}
    |> OneTimeToken.changeset(token_attrs)
    |> Repo.insert()
  end

  @doc """
  Creates an email-based token and deletes existing tokens of the same type.
  """
  def create_email_token(user_id, token_type, email) do
    # Delete existing tokens of this type for this user
    clear_user_tokens(user_id, token_type)

    create_token(%{
      user_id: user_id,
      token_type: token_type,
      relates_to_email: email
    })
  end

  @doc """
  Creates a phone OTP token and deletes existing tokens of the same type.
  """
  def create_phone_token(user_id, token_type, phone) do
    # Delete existing tokens of this type for this user
    clear_user_tokens(user_id, token_type)

    create_token(
      %{
        user_id: user_id,
        token_type: token_type,
        relates_to_phone: phone
      },
      true
    )
  end

  @doc """
  Gets a token by ID and type.
  """
  def get_token(token_id, token_type) do
    from(t in OneTimeToken,
      where: t.id == ^token_id and t.token_type == ^token_type
    )
    |> Repo.one()
  end

  @doc """
  Gets user and token by token ID and type.
  """
  def get_user_and_token(token_id, token_type) do
    case get_token(token_id, token_type) do
      nil ->
        {:error, :token_not_found}

      token ->
        user = Repo.get(User, token.user_id)
        {:ok, user, token}
    end
  end

  @doc """
  Deletes a token.
  """
  def delete_token(%OneTimeToken{} = token) do
    Repo.delete(token)
  end

  @doc """
  Clears all tokens of a specific type for a user.
  """
  def clear_user_tokens(user_id, token_type) do
    from(t in OneTimeToken,
      where: t.user_id == ^user_id and t.token_type == ^token_type
    )
    |> Repo.delete_all()
  end

  @doc """
  Verifies a token secret matches.
  """
  def verify_token_secret(%OneTimeToken{secret: secret}, provided_secret) do
    secret == provided_secret
  end
end
