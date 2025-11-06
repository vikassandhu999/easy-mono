defmodule EasyWeb.FallbackController do
  use EasyWeb, :controller

  require Logger

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_status(:unprocessable_entity)
    |> put_view(json: EasyWeb.ErrorJSON)
    |> render(:changeset_error, changeset: changeset)
  end

  def call(conn, {:error, %Easy.ApiError{} = error}) do
    conn
    |> put_status(error.status)
    |> json(%{
      code: error.code,
      error: error.message,
      details: error.details
    })
  end

  def call(conn, {:error, :not_found}) do
    conn
    |> put_status(:not_found)
    |> json(%{
      code: "not_found",
      error: "Resource not found",
      details: nil
    })
  end

  def call(conn, {:error, :unauthorized}) do
    conn
    |> put_status(:unauthorized)
    |> json(%{
      code: "unauthorized",
      error: "Unauthorized access",
      details: nil
    })
  end

  def call(conn, {:error, :forbidden}) do
    conn
    |> put_status(:forbidden)
    |> json(%{
      code: "forbidden",
      error: "Access forbidden",
      details: nil
    })
  end

  def call(conn, {:error, :bad_request}) do
    conn
    |> put_status(:bad_request)
    |> json(%{
      code: "bad_request",
      error: "Bad request",
      details: nil
    })
  end

  def call(conn, {:error, :unprocessable_entity}) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{
      code: "unprocessable_entity",
      error: "Unprocessable entity",
      details: nil
    })
  end

  def call(conn, {:error, :token_not_found}) do
    conn
    |> put_status(:not_found)
    |> json(%{
      code: "token_not_found",
      error: "Token not found",
      details: nil
    })
  end

  def call(conn, {:error, :token_expired}) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{
      code: "token_expired",
      error: "Token has expired. Please request a new OTP.",
      details: nil
    })
  end

  def call(conn, {:error, :token_already_used}) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{
      code: "token_already_used",
      error: "Token has already been used. Please request a new OTP.",
      details: nil
    })
  end

  def call(conn, {:error, :invalid_otp}) do
    conn
    |> put_status(:unauthorized)
    |> json(%{
      code: "invalid_otp",
      error: "Invalid OTP code. Please try again.",
      details: nil
    })
  end

  def call(conn, {:error, :rate_limited}) do
    conn
    |> put_status(:too_many_requests)
    |> json(%{
      code: "rate_limited",
      error: "Too many requests. Please try again later.",
      details: nil
    })
  end

  def call(conn, {:error, :role_not_found}) do
    conn
    |> put_status(:forbidden)
    |> json(%{
      code: "role_not_found",
      error: "User does not have the required role",
      details: nil
    })
  end

  def call(conn, {:error, :session_not_found}) do
    conn
    |> put_status(:not_found)
    |> json(%{
      code: "session_not_found",
      error: "Session not found",
      details: nil
    })
  end

  def call(conn, {:error, :session_expired}) do
    conn
    |> put_status(:unauthorized)
    |> json(%{
      code: "session_expired",
      error: "Session has expired",
      details: nil
    })
  end

  def call(conn, {:error, :refresh_failed}) do
    conn
    |> put_status(:internal_server_error)
    |> json(%{
      code: "refresh_failed",
      error: "Failed to refresh session",
      details: nil
    })
  end

  # Handle errors with string messages
  def call(conn, {:error, message}) when is_binary(message) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{
      code: "error",
      error: message,
      details: nil
    })
  end

  # Catch-all for unexpected error formats
  def call(conn, {:error, reason}) do
    Logger.error("Unhandled error in FallbackController: #{inspect(reason)}")

    conn
    |> put_status(:internal_server_error)
    |> json(%{
      code: "internal_server_error",
      error: "An unexpected error occurred",
      details: nil
    })
  end

  # Handle nil responses (shouldn't happen but just in case)
  def call(conn, nil) do
    Logger.error("Controller action returned nil")

    conn
    |> put_status(:internal_server_error)
    |> json(%{
      code: "internal_server_error",
      error: "An unexpected error occurred",
      details: nil
    })
  end

  # Catch-all for any other unexpected responses
  def call(conn, other) do
    Logger.error("Unexpected response in FallbackController: #{inspect(other)}")

    conn
    |> put_status(:internal_server_error)
    |> json(%{
      code: "internal_server_error",
      error: "An unexpected error occurred",
      details: nil
    })
  end
end
