defmodule CoachApp.FallbackController do
  @moduledoc """
  Translates controller action results into valid `Plug.Conn` responses.

  See `Phoenix.Controller.action_fallback/1` for more details.
  """
  use CoachApp, :controller

  def call(conn, {:error, :not_found}) do
    conn
    |> put_status(:not_found)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, %{message: "Resource not found"})
  end

  def call(conn, {:error, :unauthorized}) do
    conn
    |> put_status(:unauthorized)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, %{message: "Unauthorized"})
  end

  def call(conn, {:error, :email_or_phone_required}) do
    conn
    |> put_status(:bad_request)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, %{
      message: "Either email or phone number is required",
      code: "email_or_phone_required"
    })
  end

  def call(conn, {:error, :user_already_exists}) do
    conn
    |> put_status(:conflict)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, %{
      message: "User already exists",
      code: "user_already_exists"
    })
  end

  def call(conn, {:error, :invalid_passcode}) do
    conn
    |> put_status(:bad_request)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, %{
      message: "Invalid passcode",
      code: "invalid_passcode"
    })
  end

  def call(conn, {:error, :token_not_found}) do
    conn
    |> put_status(:not_found)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, %{
      message: "Token not found or expired",
      code: "token_not_found"
    })
  end

  def call(conn, {:error, :session_not_found}) do
    conn
    |> put_status(:not_found)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, %{
      message: "Session not found",
      code: "session_not_found"
    })
  end

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_status(:unprocessable_entity)
    |> put_view(json: CoachApp.ChangesetJSON)
    |> render(:error, changeset: changeset)
  end

  def call(conn, {:error, reason}) when is_atom(reason) do
    conn
    |> put_status(:bad_request)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, %{message: to_string(reason)})
  end

  def call(conn, {:error, reason}) when is_binary(reason) do
    conn
    |> put_status(:bad_request)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, %{message: reason})
  end
end
