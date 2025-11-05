defmodule EasyWeb.Plugs.ApiErrorHandler do
  @moduledoc """
  Custom error handler for API routes that catches exceptions and returns JSON responses.

  This plug wraps the request in a try/catch and ensures that any exceptions
  are converted to proper JSON error responses instead of HTML error pages.

  Use this in your endpoint or router to ensure API routes always return JSON.
  """

  import Plug.Conn
  import Phoenix.Controller, only: [json: 2]
  require Logger

  def init(opts), do: opts

  def call(conn, _opts) do
    try do
      conn
    catch
      kind, reason ->
        handle_error(conn, kind, reason, __STACKTRACE__)
    end
  end

  defp handle_error(conn, kind, reason, stack) do
    # Log the error for debugging
    Logger.error("""
    [ApiErrorHandler] Caught #{kind}:
    #{Exception.format(kind, reason, stack)}
    """)

    # Determine HTTP status code and error message
    {status, code, message} = error_info(kind, reason)

    # Send JSON error response
    conn
    |> put_status(status)
    |> json(%{
      code: code,
      error: message,
      details: error_details(reason)
    })
  end

  defp error_info(:error, %Ecto.NoResultsError{}) do
    {404, "not_found", "Resource not found"}
  end

  defp error_info(:error, %Ecto.InvalidChangesetError{changeset: changeset}) do
    details = traverse_errors(changeset)
    {422, "validation_error", "Validation failed", details}
  end

  defp error_info(:error, %Phoenix.Router.NoRouteError{}) do
    {404, "not_found", "Route not found"}
  end

  defp error_info(:error, %ArgumentError{message: _message}) do
    # This catches the DateTime truncation error and other argument errors
    {500, "internal_server_error", "Internal server error"}
  end

  defp error_info(:error, %Ecto.ConstraintError{} = _error) do
    {422, "constraint_violation", "Database constraint violation"}
  end

  defp error_info(:error, %DBConnection.ConnectionError{}) do
    {503, "service_unavailable", "Database connection error"}
  end

  defp error_info(:throw, _value) do
    {500, "internal_server_error", "Internal server error"}
  end

  defp error_info(:exit, _reason) do
    {500, "internal_server_error", "Internal server error"}
  end

  defp error_info(_kind, _reason) do
    {500, "internal_server_error", "An unexpected error occurred"}
  end

  defp error_details(%{message: message}) when is_binary(message) do
    %{message: message}
  end

  defp error_details(%Ecto.Changeset{} = changeset) do
    traverse_errors(changeset)
  end

  defp error_details(_), do: nil

  defp traverse_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
