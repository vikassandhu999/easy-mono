defmodule CoachApp.FallbackController do
  @moduledoc """
  Translates controller action results into valid `Plug.Conn` responses.
  """
  use CoachApp, :controller

  alias Easy.ApiError

  # Handle Ecto.NoResultsError
  def call(conn, {:error, %Ecto.NoResultsError{}}) do
    error = ApiError.not_found()

    conn
    |> put_status(error.status)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, error: error)
  end

  # Handle Ecto.Changeset errors
  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    error = ApiError.from_changeset(changeset)

    conn
    |> put_status(error.status)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, error: error)
  end

  # Handle ApiError structs
  def call(conn, {:error, %ApiError{} = error}) do
    conn
    |> put_status(error.status)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, error: error)
  end

  # Handle :not_found atoms
  def call(conn, {:error, :not_found}) do
    error = ApiError.not_found()

    conn
    |> put_status(error.status)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, error: error)
  end

  # Handle :unauthorized atoms
  def call(conn, {:error, :unauthorized}) do
    error = ApiError.unauthorized()

    conn
    |> put_status(error.status)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, error: error)
  end

  # Handle :forbidden atoms
  def call(conn, {:error, :forbidden}) do
    error = ApiError.forbidden()

    conn
    |> put_status(error.status)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, error: error)
  end

  # Handle string errors
  def call(conn, {:error, message}) when is_binary(message) do
    error = ApiError.bad_request(message)

    conn
    |> put_status(error.status)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, error: error)
  end

  # Catch-all for unexpected errors
  def call(conn, {:error, _}) do
    error = ApiError.internal_server_error()

    conn
    |> put_status(error.status)
    |> put_view(json: CoachApp.ErrorJSON)
    |> render(:error, error: error)
  end
end
