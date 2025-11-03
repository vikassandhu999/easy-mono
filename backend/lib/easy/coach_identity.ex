defmodule Easy.CoachIdentity do
  @moduledoc """
  Context module for coach authentication and identity management.

  Handles signup, verification, and token management for coach users.
  """

  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Identity.{User, OneTimeToken, Session}
  alias NimbleTOTP

  @otp_validity_window_seconds 600
  @token_expiry_minutes 15
  @access_token_expiry_minutes 60

  @spec initiate_signup(String.t()) ::
          {:ok, %OneTimeToken{}} | {:error, :user_already_exists | Ecto.Changeset.t()}
  def initiate_signup(email) when is_binary(email) do
    if user_exists?(email) do
      {:error, :user_already_exists}
    else
      create_user_and_ott(email)
    end
  end

  def verify_signup(passcode, token_id) when is_binary(passcode) and is_binary(token_id) do
    token_type = OneTimeToken.token_types().signup_verification

    with {user, token} <- get_user_and_token(token_type, token_id),
         true <- verify_otp(token.secret, passcode),
         {:ok, session} <- create_session(user),
         {:ok, access_token} <- create_access_token(user, session) do
      {:ok,
       %{
         access_token: access_token,
         refresh_token: session.refresh_token,
         token_type: "Bearer",
         expires_in: @access_token_expiry_minutes * 60,
         user: user_data(user)
       }}
    else
      {:error, %Ecto.Changeset{}} = error -> error
      _ -> {:error, :invalid_token}
    end
  end

  defp create_session(user) do
    attrs = %{
      user_id: user.id,
      refresh_token: generate_refresh_token(),
      refreshed_at: DateTime.utc_now()
    }

    %Session{}
    |> Ecto.Changeset.cast(attrs, [:user_id, :refresh_token, :refreshed_at, :user_agent, :ip])
    |> Ecto.Changeset.validate_required([:user_id, :refresh_token])
    |> Repo.insert()
  end

  defp generate_refresh_token do
    :crypto.strong_rand_bytes(32)
    |> Base.url_encode64(padding: false)
  end

  # --- Private Functions ---

  defp user_exists?(email) do
    User
    |> where([u], u.email == ^email)
    |> Repo.exists?()
  end

  defp get_user_and_token(token_type, token_id) do
    with {:ok, uuid} <- Ecto.UUID.cast(token_id),
         %OneTimeToken{} = token <- get_valid_token(uuid, token_type),
         %User{} = user <- Repo.get_by(User, email: token.relates_to_email) do
      {user, token}
    else
      _ -> {:error, :invalid_token}
    end
  end

  defp get_valid_token(token_id, token_type) do
    OneTimeToken
    |> where([t], t.id == ^token_id)
    |> where([t], t.token_type == ^token_type)
    |> Repo.one()
  end

  defp verify_otp(secret, passcode) do
    current_time = System.os_time(:second)
    previous_time = current_time - @otp_validity_window_seconds

    NimbleTOTP.valid?(secret, passcode, time: current_time) or
      NimbleTOTP.valid?(secret, passcode, time: previous_time)
  end

  defp create_user_and_ott(email) do
    with {:ok, user} <- create_user(email),
         {:ok, token} <- create_verification_token(user, email) do
      send_otp(token)
      {:ok, token}
    end
  end

  defp create_user(email) do
    %User{}
    |> User.changeset(%{email: email})
    |> Repo.insert()
  end

  defp create_verification_token(user, email) do
    attrs = %{
      token_type: OneTimeToken.token_types().signup_verification,
      secret: generate_token_secret(),
      expires_at: token_expires_at(),
      relates_to_email: email,
      user_id: user.id
    }

    %OneTimeToken{}
    |> OneTimeToken.changeset(attrs)
    |> Repo.insert()
  end

  defp generate_token_secret do
    :crypto.strong_rand_bytes(32)
    |> Base.url_encode64(padding: false)
  end

  defp token_expires_at do
    DateTime.utc_now()
    |> DateTime.add(@token_expiry_minutes * 60, :second)
  end

  defp send_otp(token) do
    otp = NimbleTOTP.verification_code(token.secret)
    IO.puts("OTP Code: #{otp}")
    :ok
  end

  defp create_access_token(user, session) do
    signer = Joken.Signer.create("HS256", get_jwt_secret())

    claims = %{
      "sub" => user.id,
      "email" => user.email,
      "session_id" => session.id,
      "iat" => DateTime.utc_now() |> DateTime.to_unix(),
      "exp" =>
        DateTime.utc_now()
        |> DateTime.add(@access_token_expiry_minutes * 60, :second)
        |> DateTime.to_unix(),
      "iss" => "easy_backend",
      "aud" => "coach_app"
    }

    case Joken.encode_and_sign(claims, signer) do
      {:ok, token, _claims} -> {:ok, token}
      {:error, reason} -> {:error, reason}
    end
  end

  defp get_jwt_secret do
    Application.get_env(:easy, :jwt_secret) ||
      raise """
      JWT secret not configured!
      Add to config/runtime.exs:
      config :easy, jwt_secret: System.get_env("JWT_SECRET") || "your-secret-key-min-32-chars"
      """
  end

  defp mark_token_as_used(token) do
    # Mark the OTT as used by setting expires_at to now
    # This prevents reuse of the same verification code
    token
    |> Ecto.Changeset.change(%{expires_at: DateTime.utc_now()})
    |> Repo.update()
  end

  defp user_data(user) do
    %{
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      phone: user.phone,
      phone_confirmed_at: user.phone_confirmed_at
    }
  end
end
