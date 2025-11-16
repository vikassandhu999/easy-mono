defmodule EasyWeb.BusinessController do
  use EasyWeb, :controller

  alias Easy.{Organizations, ApiError}
  alias EasyWeb.ResponseHelpers

  def show(conn, %{"id" => id}) do
    scope = conn.assigns[:scope]

    case Organizations.get_business(scope, id) do
      {:ok, business} ->
        conn
        |> put_status(:ok)
        |> render(:show, business: business)

      {:error, :not_found} ->
        error = ApiError.not_found("Business")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You do not have permission to access this business")
        render_error(conn, error)
    end
  end

  def update(conn, %{"id" => id} = params) do
    scope = conn.assigns[:scope]
    attrs = Map.take(params, ["name", "description"])

    case Organizations.update_business(scope, id, attrs) do
      {:ok, updated_business} ->
        conn
        |> put_status(:ok)
        |> render(:update, business: updated_business)

      {:error, :not_found} ->
        error = ApiError.not_found("Business")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("Only the business owner can update business information")
        render_error(conn, error)

      {:error, %Ecto.Changeset{} = changeset} ->
        error = ApiError.validation_error(changeset)
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to update business", %{reason: to_string(reason)})

        render_error(conn, error)
    end
  end

  def list_coaches(conn, %{"id" => id}) do
    scope = conn.assigns[:scope]

    case Organizations.list_business_coaches(scope, id) do
      {:ok, coaches} ->
        conn
        |> put_status(:ok)
        |> render(:list_coaches, coaches: coaches)

      {:error, :not_found} ->
        error = ApiError.not_found("Business")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You do not have permission to access this business")
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to list coaches", %{reason: to_string(reason)})

        render_error(conn, error)
    end
  end

  def list_clients(conn, %{"id" => id} = params) do
    scope = conn.assigns[:scope]
    limit = parse_limit(params["limit"])
    offset = parse_offset(params["offset"])
    status = params["status"]

    opts = [limit: limit, offset: offset]
    opts = if status, do: Keyword.put(opts, :status, status), else: opts

    case Organizations.list_business_clients(scope, id, opts) do
      {:ok, clients, total} ->
        conn
        |> put_status(:ok)
        |> render(:list_clients,
          clients: clients,
          pagination: ResponseHelpers.format_pagination(limit, offset, total)
        )

      {:error, :not_found} ->
        error = ApiError.not_found("Business")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You do not have permission to access this business")
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to list clients", %{reason: to_string(reason)})

        render_error(conn, error)
    end
  end

  def show_subscription(conn, %{"id" => id}) do
    scope = conn.assigns[:scope]

    case Organizations.get_business_subscription(scope, id) do
      {:ok, subscription} ->
        conn
        |> put_status(:ok)
        |> render(:show_subscription, subscription: subscription)

      {:error, :business_not_found} ->
        error = ApiError.not_found("Business")
        render_error(conn, error)

      {:error, :not_found} ->
        error = ApiError.not_found("Subscription")
        error = %{error | message: "No active subscription found"}
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You do not have permission to access this business")
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to retrieve subscription", %{
            reason: to_string(reason)
          })

        render_error(conn, error)
    end
  end

  defp parse_limit(nil), do: 50

  defp parse_limit(limit) when is_binary(limit) do
    case Integer.parse(limit) do
      {num, _} when num > 0 and num <= 100 -> num
      _ -> 50
    end
  end

  defp parse_limit(limit) when is_integer(limit) and limit > 0 and limit <= 100, do: limit
  defp parse_limit(_), do: 50

  defp parse_offset(nil), do: 0

  defp parse_offset(offset) when is_binary(offset) do
    case Integer.parse(offset) do
      {num, _} when num >= 0 -> num
      _ -> 0
    end
  end

  defp parse_offset(offset) when is_integer(offset) and offset >= 0, do: offset
  defp parse_offset(_), do: 0

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
