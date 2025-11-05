defmodule Easy.Identity do
  @moduledoc """
  Identity context handles user authentication and session management.

  This is the public API for:
  - OTP-based authentication (request/verify)
  - User account management
  - Session management
  """

  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Identity.{User, OneTimeToken, Session}
  alias Easy.Tenant
  alias Easy.Auth.{OTP, JWT, TokenGenerator}

  # ============================================
  # OTP AUTHENTICATION
  # ============================================

  @doc """
  Request an OTP for authentication.
  Creates token, generates OTP, sends via email/SMS.

  Returns {:ok, token} or {:error, reason}
  """
  def request_otp(email: email) when is_binary(email) do
    with {:ok, :not_rate_limited} <- check_rate_limit(email: email),
         {:ok, token} <- create_auth_token(email: email),
         :ok <- send_otp_code(token) do
      {:ok, token}
    end
  end

  def request_otp(phone: phone) when is_binary(phone) do
    with {:ok, :not_rate_limited} <- check_rate_limit(phone: phone),
         {:ok, token} <- create_auth_token(phone: phone),
         :ok <- send_otp_code(token) do
      {:ok, token}
    end
  end

  @doc """
  Verify OTP and authenticate user.
  Creates/finds user, creates session, marks token as used.

  Returns {:ok, %{user: user, session: session}} or {:error, reason}
  """
  def verify_otp_and_authenticate(token_id, otp_code, device_info \\ %{}) do
    with {:ok, token} <- fetch_valid_token(token_id),
         :ok <- verify_otp_code(token, otp_code),
         {:ok, user, user_status} <- find_or_create_user(token),
         {:ok, user} <- confirm_user_contact(user, token),
         {:ok, session} <- create_user_session(user, device_info),
         {:ok, _token} <- mark_token_used(token) do
      {:ok, %{user: user, session: session, user_status: user_status}}
    end
  end

  # ============================================
  # USER MANAGEMENT
  # ============================================

  @doc """
  Gets a user by ID.
  """
  def get_user(id), do: Repo.get(User, id)

  @doc """
  Finds or creates a user by email or phone.
  Returns {:ok, user, :created | :existing}
  """
  def find_or_create_user(token) do
    email = token.relates_to_email
    phone = token.relates_to_phone

    case User.get_by_email_or_phone(email, phone) do
      nil ->
        attrs = build_user_attrs(email, phone)
        create_user(attrs)

      user ->
        {:ok, user, :existing}
    end
  end

  # ROLE VERIFICATION

  @doc """
  Gets role-specific information for a user.
  Returns coach or client record based on requested role.
  """
  def get_user_role_info(user, "coach") do
    case Repo.get_by(Tenant.Coach, user_id: user.id) do
      nil -> {:error, :role_not_found}
      coach -> {:ok, serialize_coach_for_response(coach)}
    end
  end

  def get_user_role_info(user, "client") do
    case Repo.get_by(Tenant.Client, user_id: user.id) do
      nil ->
        {:error, :role_not_found}

      client ->
        client_with_coach = Repo.preload(client, :coach)
        {:ok, serialize_client_for_response(client_with_coach)}
    end
  end

  # SESSION MANAGEMENT

  @doc """
  Creates a new session for a user.
  """
  def create_user_session(user, device_info \\ %{}) do
    attrs = %{
      user_id: user.id,
      refresh_token: TokenGenerator.generate_refresh_token(),
      refreshed_at: DateTime.utc_now() |> DateTime.truncate(:second),
      expires_at: TokenGenerator.expires_at_days(30),
      device_name: device_info["device_name"],
      device_type: device_info["device_type"] || "unknown",
      user_agent: device_info["user_agent"],
      ip: device_info["ip"]
    }

    %Session{}
    |> Session.create_changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Gets a session by refresh token.
  """
  def get_session_by_refresh_token(refresh_token) do
    Session.get_active_session_by_refresh_token(refresh_token)
  end

  @doc """
  Revokes a session (logout).
  """
  def revoke_session(session) do
    Session.revoke(session)
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  defp check_rate_limit(email: email) do
    case OneTimeToken.find_recent_auth_token(email, nil) do
      nil -> {:ok, :not_rate_limited}
      _token -> {:error, :rate_limited}
    end
  end

  defp check_rate_limit(phone: phone) do
    case OneTimeToken.find_recent_auth_token(nil, phone) do
      nil -> {:ok, :not_rate_limited}
      _token -> {:error, :rate_limited}
    end
  end

  defp create_auth_token(email: email) do
    attrs = %{
      token_type: :authentication,
      relates_to_email: email,
      secret: TokenGenerator.generate_secret(),
      expires_at: TokenGenerator.expires_at(15)
    }

    %OneTimeToken{}
    |> OneTimeToken.changeset(attrs)
    |> Repo.insert()
  end

  defp create_auth_token(phone: phone) do
    attrs = %{
      token_type: :authentication,
      relates_to_phone: phone,
      secret: TokenGenerator.generate_secret(),
      expires_at: TokenGenerator.expires_at(15)
    }

    %OneTimeToken{}
    |> OneTimeToken.changeset(attrs)
    |> Repo.insert()
  end

  defp send_otp_code(token) do
    otp_code = OTP.generate(token.secret)

    IO.puts(otp_code)
  end

  defp fetch_valid_token(token_id) do
    case OneTimeToken.get_valid_token(token_id, :authentication) do
      nil -> {:error, :token_not_found}
      token -> {:ok, token}
    end
  end

  defp verify_otp_code(token, otp_code) do
    cond do
      token.used ->
        {:error, :token_already_used}

      not OneTimeToken.not_expired?(token) ->
        {:error, :token_expired}

      not OTP.verify(token.secret, otp_code) ->
        # Increment attempt count
        token
        |> OneTimeToken.increment_attempt()
        |> Repo.update()

        {:error, :invalid_otp}

      true ->
        :ok
    end
  end

  defp confirm_user_contact(user, token) do
    cond do
      token.relates_to_email && is_nil(user.email_confirmed_at) ->
        User.confirm_email(user)

      token.relates_to_phone && is_nil(user.phone_confirmed_at) ->
        User.confirm_phone(user)

      true ->
        {:ok, user}
    end
  end

  defp mark_token_used(token) do
    token
    |> OneTimeToken.mark_as_used()
    |> Repo.update()
  end

  defp create_user(attrs) do
    result =
      %User{}
      |> User.registration_changeset(attrs)
      |> Repo.insert()

    case result do
      {:ok, user} -> {:ok, user, :created}
      error -> error
    end
  end

  defp build_user_attrs(email, phone) do
    %{}
    |> maybe_put(:email, email)
    |> maybe_put(:phone, phone)
  end

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)

  defp serialize_coach_for_response(coach) do
    %{
      id: coach.id,
      name: coach.name,
      business_id: coach.business_id
    }
  end

  defp serialize_client_for_response(client) do
    %{
      id: client.id,
      name: client.name,
      coach_id: client.coach_id,
      coach_name: client.coach && client.coach.name
    }
  end

  @doc """
  Refreshes access token using a refresh token.
  Returns {:ok, new_access_token, new_refresh_token} or {:error, reason}
  """
  def refresh_access_token(refresh_token) do
    case get_session_by_refresh_token(refresh_token) do
      nil ->
        {:error, :session_not_found}

      session ->
        if Session.active?(session) do
          # Generate new tokens
          user = Repo.get(User, session.user_id)
          new_refresh_token = TokenGenerator.generate_refresh_token()
          new_expires_at = TokenGenerator.expires_at_days(30)

          # Update session
          case Session.refresh(session, new_refresh_token, new_expires_at) do
            {:ok, updated_session} ->
              {:ok, access_token} = JWT.create_access_token(user, updated_session)
              {:ok, access_token, new_refresh_token}

            {:error, _changeset} ->
              {:error, :refresh_failed}
          end
        else
          {:error, :session_expired}
        end
    end
  end
end
