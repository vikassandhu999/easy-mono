defmodule EasyWeb.AuthController do
  use EasyWeb, :controller

  alias Easy.Accounts

  action_fallback EasyWeb.FallbackController

  @moduledoc """
  Authentication controller for user registration and authentication flows.

  Handles:
  - Coach registration (POST /api/auth/register)
  """

  @doc """
  POST /api/auth/register

  Registers a new coach user and initiates email verification.

  This is the first step in the coach signup flow. The user provides their
  email and full name, and receives an OTP code via email for verification.

  ## Parameters
  - email: User's email address (required)
  - full_name: User's full name (required)

  ## Response

  Success (201):
  ```json
  {
    "user_id": "123",
    "status": "verification_pending"
  }
  ```

  ## Error Responses

  Validation error (422):
  ```json
  {
    "error": {
      "message": "Validation failed",
      "code": "validation_error",
      "details": {
        "email": ["has already been taken"],
        "full_name": ["can't be blank"]
      }
    }
  }
  ```

  Rate limit exceeded (429):
  ```json
  {
    "error": {
      "message": "Rate limit exceeded. Please try again in 300 seconds",
      "code": "rate_limited",
      "details": {
        "retry_after": 300
      }
    }
  }
  ```
  """
  def register(conn, params) do
    email = params["email"]
    full_name = params["full_name"]

    case Accounts.register_user(email, full_name) do
      {:ok, %{user: user, token_uuid: _token_uuid}} ->
        conn
        |> put_status(:created)
        |> json(%{
          user_id: to_string(user.id),
          status: "verification_pending"
        })

      {:error, :rate_limited, retry_after} ->
        conn
        |> put_status(:too_many_requests)
        |> put_resp_header("retry-after", to_string(retry_after))
        |> json(%{
          error: %{
            message: "Rate limit exceeded. Please try again in #{retry_after} seconds",
            code: "rate_limited",
            details: %{
              retry_after: retry_after
            }
          }
        })

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          error: %{
            message: "Validation failed",
            code: "validation_error",
            details: translate_changeset_errors(changeset)
          }
        })

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          error: %{
            message: "Registration failed",
            code: "registration_error",
            details: %{reason: to_string(reason)}
          }
        })
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Translates changeset errors to a map of field => [errors]
  defp translate_changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
