defmodule EasyWeb.CoachController do
  use EasyWeb, :controller

  alias Easy.{Coaches, ApiError}
  alias EasyWeb.ResponseHelpers

  def show(conn, %{"id" => id}) do
    scope = conn.assigns[:scope]

    case Coaches.get_coach(scope, id) do
      {:ok, coach} ->
        conn
        |> json(%{coach: format_coach(coach)})

      {:error, :not_found} ->
        error = ApiError.not_found("Coach")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You do not have permission to access this coach")
        render_error(conn, error)
    end
  end

  def update(conn, %{"id" => id} = params) do
    scope = conn.assigns[:scope]

    # Extract update attributes
    attrs = Map.take(params, ["bio", "specialties", "credentials"])

    case Coaches.update_coach(scope, id, attrs) do
      {:ok, updated_coach} ->
        conn
        |> json(%{coach: format_coach(updated_coach)})

      {:error, :not_found} ->
        error = ApiError.not_found("Coach")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You can only update your own coach profile")
        render_error(conn, error)

      {:error, %Ecto.Changeset{} = changeset} ->
        error = ApiError.validation_error(changeset)
        render_error(conn, error)
    end
  end

  def list_clients(conn, %{"id" => id}) do
    scope = conn.assigns[:scope]

    case Coaches.list_coach_clients(scope, id) do
      {:ok, clients} ->
        conn
        |> json(%{clients: Enum.map(clients, &format_client/1)})

      {:error, :not_found} ->
        error = ApiError.not_found("Coach")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You do not have permission to access this coach")
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to list clients", %{reason: to_string(reason)})

        render_error(conn, error)
    end
  end

  def assign_client(conn, %{"id" => coach_id, "client_id" => client_id}) do
    scope = conn.assigns[:scope]

    case Coaches.assign_client(scope, coach_id, client_id) do
      {:ok, assignment} ->
        conn
        |> put_status(:created)
        |> json(%{
          assignment: format_assignment(assignment)
        })

      {:error, :coach_not_found} ->
        error = ApiError.not_found("Coach")
        render_error(conn, error)

      {:error, :client_not_found} ->
        error = ApiError.not_found("Client")
        render_error(conn, error)

      {:error, :forbidden} ->
        error =
          ApiError.forbidden("You do not have permission to manage this coach's assignments")

        render_error(conn, error)

      {:error, :different_business} ->
        error = ApiError.forbidden("Client does not belong to the same business")
        render_error(conn, error)

      {:error, %Ecto.Changeset{} = changeset} ->
        # Check if it's a unique constraint violation
        if has_unique_constraint_error?(changeset) do
          error = ApiError.from_code(:already_assigned, nil, nil)
          render_error(conn, error)
        else
          error = ApiError.validation_error(changeset)
          render_error(conn, error)
        end

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to assign client", %{reason: to_string(reason)})

        render_error(conn, error)
    end
  end

  def unassign_client(conn, %{"id" => coach_id, "client_id" => client_id}) do
    scope = conn.assigns[:scope]

    case Coaches.unassign_client(scope, coach_id, client_id) do
      {:ok, _assignment} ->
        conn
        |> json(%{
          message: "Client successfully unassigned from coach"
        })

      {:error, :coach_not_found} ->
        error = ApiError.not_found("Coach")
        render_error(conn, error)

      {:error, :client_not_found} ->
        error = ApiError.not_found("Client")
        render_error(conn, error)

      {:error, :forbidden} ->
        error =
          ApiError.forbidden("You do not have permission to manage this coach's assignments")

        render_error(conn, error)

      {:error, :not_found} ->
        error = ApiError.not_found("Assignment")
        error = %{error | message: "Client is not assigned to this coach"}
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to unassign client", %{reason: to_string(reason)})

        render_error(conn, error)
    end
  end

  defp has_unique_constraint_error?(changeset) do
    Enum.any?(changeset.errors, fn {_field, {_msg, opts}} ->
      Keyword.get(opts, :constraint) == :unique
    end)
  end

  defp format_coach(coach), do: ResponseHelpers.format_coach(coach)

  defp format_client(client), do: ResponseHelpers.format_client(client)

  defp format_assignment(assignment), do: ResponseHelpers.format_assignment(assignment)

  defp render_error(conn, %ApiError{} = error) do
    conn = maybe_add_headers(conn, error)

    conn
    |> put_status(error.status)
    |> json(ApiError.to_json(error))
  end

  defp maybe_add_headers(conn, %ApiError{headers: nil}), do: conn

  defp maybe_add_headers(conn, %ApiError{headers: headers}) do
    Enum.reduce(headers, conn, fn {key, value}, acc ->
      put_resp_header(acc, key, value)
    end)
  end
end
