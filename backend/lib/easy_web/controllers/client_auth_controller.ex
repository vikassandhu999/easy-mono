defmodule EasyWeb.ClientAuthController do
  @moduledoc """
  Authentication controller for client-specific endpoints.

  This controller handles authentication flows for the client app,
  ensuring users have valid client records before granting access.
  """
  use EasyWeb, :controller

  require Logger

  alias Easy.Accounts
  alias Easy.Clients
  alias Easy.Organizations

  @doc """
  POST /api/auth/client/send-login-code

  Sends a login code to the client's email.
  Validates that the user has an active client record before sending the code.
  """
  def send_login_code(conn, %{"email" => email}) do
    with {:ok, user} <- Accounts.fetch_user_by_email(email),
         {:ok, _client} <- validate_client_exists(user),
         {:ok, result} <- Accounts.create_login_otp(user, "client_login") do
      Logger.info("User, #{user.email}")

      conn
      |> put_status(:ok)
      |> json(%{
        user: %{
          id: result.user.id,
          email: result.user.email,
          first_name: result.user.first_name,
          last_name: result.user.last_name
        },
        token: %{
          token_id: result.token.id
        }
      })
      |> halt()
    end
  end

  def send_login_code(_conn, _params) do
    {:error, Error.unprocessable("email is required")}
  end

  @doc """
  POST /api/auth/client/token

  Verifies the login code and returns access tokens.
  Validates that the user has an active client record before issuing tokens.
  """
  def token(conn, %{"token_id" => token_id, "code" => code}) do
    with {:ok, result} <- Accounts.client_login(token_id, code) do
      conn
      |> put_status(:ok)
      |> json(%{
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        user: %{
          id: result.user.id,
          email: result.user.email,
          first_name: result.user.first_name,
          last_name: result.user.last_name
        },
        client: %{
          id: result.client.id,
          business_id: result.client.business_id,
          status: result.client.status
        }
      })
      |> halt()
    end
  end

  def token(conn, %{"refresh_token" => refresh_token}) do
    with {:ok, result} <- Accounts.refresh_client_token(refresh_token) do
      conn
      |> put_status(:ok)
      |> json(%{
        access_token: result.access_token,
        refresh_token: result.refresh_token
      })
      |> halt()
    end
  end

  def token(_conn, _params) do
    {:error, Error.unprocessable("token_id and code, or refresh_token is required")}
  end

  # Private functions

  @doc """
  POST /api/auth/client/send-invitation-code

  Sends a verification code for invitation acceptance flow.
  This does NOT validate if user has a client record, because
  the client record will be linked after OTP verification via client_signup.
  """
  def send_invitation_code(conn, %{"email" => email, "invitation_token" => invitation_token}) do
    # Validate invitation exists and matches the email
    with {:ok, client} <- Clients.get_invitation(invitation_token),
         true <- client.email == email || {:error, :email_mismatch},
         {:ok, user} <- get_or_create_user_for_invitation(email),
         {:ok, result} <- Accounts.create_login_otp(user, "email_verification") do
      conn
      |> put_status(:ok)
      |> json(%{
        user: %{
          id: result.user.id,
          email: result.user.email,
          first_name: result.user.first_name,
          last_name: result.user.last_name
        },
        token: %{
          token_id: result.token.id
        }
      })
      |> halt()
    else
      {:error, :email_mismatch} ->
        {:error, Error.unprocessable("Email does not match the invitation")}

      {:error, :invalid_token} ->
        {:error, Error.not_found("Invitation not found or invalid")}

      {:error, :token_expired} ->
        {:error, Error.new(:invitation_expired, "This invitation has expired", %{}, :gone)}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def send_invitation_code(_conn, _params) do
    {:error, Error.unprocessable("email and invitation_token are required")}
  end

  @doc """
  POST /api/auth/client/send-public-join-code

  Sends a verification code for public join flow.
  This does NOT validate if user has a client record, because
  the client record will be created after OTP verification.
  """
  def send_public_join_code(conn, %{"email" => email, "public_join_code" => public_join_code}) do
    # Validate public join code exists and is enabled
    with {:ok, _settings} <- Organizations.get_settings_by_join_code(public_join_code),
         {:ok, user} <- get_or_create_user_for_invitation(email),
         {:ok, result} <- Accounts.create_login_otp(user, "client_login") do
      conn
      |> put_status(:ok)
      |> json(%{
        user: %{
          id: result.user.id,
          email: result.user.email,
          first_name: result.user.first_name,
          last_name: result.user.last_name
        },
        token: %{
          token_id: result.token.id
        }
      })
      |> halt()
    else
      {:error, :join_disabled} ->
        {:error,
         Error.new(
           :public_join_disabled,
           "Public join is not enabled for this business",
           %{},
           :forbidden
         )}

      {:error, :invalid_code} ->
        {:error, Error.not_found("Invalid public join code")}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def send_public_join_code(_conn, _params) do
    {:error, Error.unprocessable("email and public_join_code are required")}
  end

  @doc """
  POST /api/auth/client/register

  Completes client registration after OTP verification.
  Links the user to the pending client record from an invitation.
  """
  def register(conn, %{
        "token_id" => token_id,
        "code" => code,
        "invitation_token" => invitation_token
      }) do
    with {:ok, user} <- Accounts.verify_email(token_id, code, "email_verification"),
         {:ok, result} <- Clients.complete_client_signup(invitation_token, user.id) do
      conn
      |> put_status(:ok)
      |> json(%{
        user: format_user_with_client(result.user, result.client),
        session: %{
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token
        }
      })
      |> halt()
    else
      {:error, :invalid_token} ->
        {:error, Error.not_found("Invitation not found or invalid")}

      {:error, :token_expired} ->
        {:error, Error.new(:invitation_expired, "This invitation has expired", %{}, :gone)}

      {:error, :user_not_found} ->
        {:error, Error.not_found("User not found")}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def register(_conn, _params) do
    {:error, Error.unprocessable("token_id, code, and invitation_token are required")}
  end

  # Private functions

  defp validate_client_exists(user) do
    case Clients.get_active_client_by_user_id(user.id) do
      %Clients.Client{} = client ->
        {:ok, client}

      nil ->
        {:error,
         Error.new(
           :no_client_account,
           "No client account found for this email. Please accept an invitation first.",
           %{},
           :forbidden
         )}
    end
  end

  # Get existing user or create a new one for invitation flow
  defp get_or_create_user_for_invitation(email) do
    case Accounts.fetch_user_by_email(email) do
      {:ok, user} ->
        {:ok, user}

      {:error, _} ->
        # User doesn't exist, create one
        Accounts.create_user(%{email: email})
    end
  end

  defp format_user_with_client(user, client) do
    %{
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      email_verified: user.email_verified,
      roles: ["client"],
      client_profile: %{
        id: client.id,
        business_id: client.business_id,
        business_name: client.business.name,
        status: client.status,
        full_name: client.full_name,
        phone: client.phone,
        assigned_coaches: format_coaches(client.coaches)
      }
    }
  end

  defp format_coaches(coaches) do
    Enum.map(coaches, fn coach ->
      %{
        id: coach.id,
        user: %{
          full_name: Easy.Accounts.User.full_name(coach.user)
        }
      }
    end)
  end
end
