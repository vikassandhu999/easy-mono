defmodule EasyWeb.FallbackController do
  use Phoenix.Controller, formats: [:json]
  require Logger

  def call(conn, {:error, %Easy.Error{} = error}) do
    http_status = Plug.Conn.Status.code(error.status)

    conn
    |> put_status(error.status)
    |> put_view(json: EasyWeb.ErrorJSON)
    |> render(:"#{http_status}", %{app_error: Easy.Error.to_map(error)})
    |> halt()
  end

  def call(conn, {:error, :not_found}) do
    call(conn, {:error, Easy.Error.not_found()})
  end

  def call(conn, {:error, :unauthorized}) do
    call(conn, {:error, Easy.Error.unauthorized()})
  end

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    call(conn, {:error, Easy.Error.unprocessable(changeset)})
  end

  def call(conn, {:error, reason}) do
    Logger.error("Unhandled error in FallbackController: #{inspect(reason)}")

    call(
      conn,
      {:error,
       Easy.Error.new(:internal_error, "An internal error occurred", %{}, :internal_server_error)}
    )
  end

  def send_unauthorized_response(
        conn,
        message \\ "Insufficient permissions to perform this action."
      ) do
    call(conn, {:error, Easy.Error.unauthorized(message)})
  end

  def not_found_response(conn, message \\ "The requested resource was not found.") do
    call(conn, {:error, Easy.Error.not_found(message)})
  end

  def forbidden_response(conn, message \\ "You do not have permission to perform this action.") do
    call(conn, {:error, Easy.Error.unauthorized(message)})
  end
end
