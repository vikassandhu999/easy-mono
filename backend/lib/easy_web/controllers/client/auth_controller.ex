defmodule EasyWeb.Client.AuthController do
  @moduledoc """
  Authentication controller for client-specific endpoints.

  This controller handles authentication flows for the client app,
  ensuring users have valid client records before granting access.
  """
  use EasyWeb, :controller
  alias Easy.Repo
  require Logger

  alias Easy.Accounts
  alias Easy.Clients

  def send_login_code(conn, %{"email" => email}) do
    with {:ok, user} <- Accounts.fetch_user_by_email(email),
         {:ok, _client} <- validate_client_exists(user),
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
    end
  end

  def send_login_code(_conn, _params) do
    {:error, Error.unprocessable("email is required")}
  end

  def verify_login_code(conn, %{"token_id" => token_id, "code" => code}) do
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

  def verify_login_code(_conn, _params) do
    {:error, Error.unprocessable("Token_id and code is required")}
  end

  def refresh_token(conn, %{"refresh_token" => refresh_token}) do
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

  def refresh_token(_conn, _params) do
    {:error, Error.unprocessable("refresh_token is required")}
  end

  def me(conn, _params) do
    with claims <- conn.assigns.token_claims,
         user_id <- claims["sub"],
         %Accounts.User{} = user <- Repo.get(Accounts.User, user_id),
         %Clients.Client{} = client <- Accounts.get_client_by_user(user) do
      full_profile = %{
        user: %{
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          email_verified: user.email_verified
        },
        client: %{
          id: client.id,
          email: client.email,
          full_name: client.full_name,
          phone: client.phone,
          notes: client.notes,
          image_url: client.image_url,
          status: client.status,
          join_source: client.join_source,
          height_cm: client.height_cm,
          weight_kg: client.weight_kg,
          date_of_birth: client.date_of_birth,
          sex: client.sex,
          gender_identity: client.gender_identity,
          activity_level: client.activity_level,
          goal: client.goal,
          dietary_notes: client.dietary_notes,
          injury_notes: client.injury_notes,
          medication_notes: client.medication_notes,
          measurement_system: client.measurement_system,
          business_id: client.business_id,
          inserted_at: client.inserted_at,
          updated_at: client.updated_at
        }
      }

      json(conn, full_profile)
    else
      nil -> conn |> put_status(:not_found) |> json(%{error: "Client profile not found"})
      _ -> conn |> put_status(:unauthorized) |> json(%{error: "Unauthorized"})
    end
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
           "No account found for this email. Please ask your coach to send an invitation.",
           %{},
           :forbidden
         )}
    end
  end
end
