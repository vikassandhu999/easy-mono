defmodule CoachApp.AuthController do
  @moduledoc """
  Authentication controller for coach signup and verification.
  """
  use CoachApp, :controller

  alias Easy.CoachIdentity
  alias Easy.ApiError

  action_fallback CoachApp.FallbackController

  @doc """
  Initiates the signup process by sending a verification code to the provided email.

  ## Parameters
    - email: The email address to register

  ## Returns
    - 200: Returns token_id for verification
    - 409: User already exists
    - 400: Invalid or missing email
  """
  def signup(conn, %{"email" => email}) when is_binary(email) and email != "" do
    with {:ok, token} <- CoachIdentity.initiate_signup(email) do
      conn
      |> put_status(:ok)
      |> json(%{
        data: %{
          token_id: token.id,
          email: email
        }
      })
    else
      {:error, :user_already_exists} ->
        {:error, ApiError.conflict("User already exists")}

      {:error, reason} ->
        {:error, ApiError.bad_request("Signup failed: #{inspect(reason)}")}
    end
  end

  def signup(_conn, _params) do
    {:error, ApiError.bad_request("Email is required", %{field: "email"})}
  end

  @doc """
  Verifies the signup passcode sent to the user's email.

  ## Parameters
    - passcode: The verification code received via email
    - token_id: The token ID returned from the signup endpoint

  ## Returns
    - 200: Verification successful
    - 400: Invalid token or passcode
  """
  def verify_signup(conn, %{"passcode" => passcode, "token_id" => token_id})
      when is_binary(passcode) and passcode != "" and is_binary(token_id) and token_id != "" do
    case CoachIdentity.verify_signup(passcode, token_id) do
      {:ok, token} ->
        conn
        |> put_status(:ok)
        |> put_resp_cookie("_easy_refresh_token", token.refresh_token,
          http_only: true,
          secure: true
        )
        |> json(%{
          data: token
        })

      {:error, :invalid_token} ->
        {:error, ApiError.bad_request("Invalid or expired token")}
    end
  end

  def verify_signup(_conn, params) do
    missing_fields =
      ["passcode", "token_id"]
      |> Enum.reject(&(Map.has_key?(params, &1) and params[&1] != ""))

    {:error,
     ApiError.bad_request(
       "Missing or empty required fields",
       %{missing_fields: missing_fields}
     )}
  end
end
