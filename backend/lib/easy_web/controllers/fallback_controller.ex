defmodule EasyWeb.FallbackController do
  use Phoenix.Controller, formats: [:json]

  @doc """
  Translates standardized application errors into JSON:API-compliant responses.
  """
  # 1. We now have ONE function to handle ALL our application errors.
  #    It pattern matches specifically on our struct.
  def call(conn, {:error, %Easy.Error{} = error}) do
    http_status = Plug.Conn.Status.code(error.status)

    conn
    |> put_status(error.status)
    |> put_view(json: EasyWeb.ErrorJSON)
    |> render(:"#{http_status}", %{app_error: Easy.Error.to_map(error)})
    |> halt()
  end

  # --- Deprecated Handlers ---
  # It's good to keep these for a while to catch old code.
  # They now just convert the old format to the new one.

  def call(conn, {:error, :not_found}) do
    call(conn, {:error, Easy.Error.not_found()})
  end

  def call(conn, {:error, :unauthorized}) do
    call(conn, {:error, Easy.Error.unauthorized()})
  end

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    call(conn, {:error, Easy.Error.unprocessable(changeset)})
  end

  def call(conn, {:error, _}) do
    call(
      conn,
      {:error,
       Easy.Error.new(:internal_error, "An internal error occurred", %{}, :internal_server_error)}
    )
  end
end
