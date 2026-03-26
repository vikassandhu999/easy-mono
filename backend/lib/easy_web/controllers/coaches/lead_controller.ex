defmodule EasyWeb.Coaches.LeadController do
  use EasyWeb, :controller

  alias Easy.Orgs.Coaches
  alias Easy.Repo
  alias Easy.Storefront.Lead

  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    status = Map.get(params, "status")

    base =
      Lead
      |> Lead.for_business(business_id)
      |> Lead.with_status(status)

    count = Repo.aggregate(base, :count, :id)

    leads =
      base
      |> Lead.newest()
      |> Easy.Utils.paginate(offset, limit)
      |> Lead.with_preloads()
      |> Repo.all()

    render(conn, :index, leads: leads, count: count)
  end

  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Lead |> Lead.for_business(business_id) |> Lead.with_preloads() |> Repo.get(id) do
      nil -> {:error, :not_found}
      lead -> render(conn, :show, lead: lead)
    end
  end

  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Lead |> Lead.for_business(business_id) |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      lead ->
        with {:ok, updated} <- Lead.update(lead, conn.body_params) do
          render(conn, :show, lead: updated)
        end
    end
  end

  def convert(conn, %{"id" => id}) do
    %{business_id: business_id, user_id: user_id} = conn.assigns.claims

    with lead when not is_nil(lead) <-
           Lead |> Lead.for_business(business_id) |> Lead.with_preloads() |> Repo.get(id),
         {:ok, coach} <- Coaches.get_by_user_id(user_id, business_id),
         {:ok, updated_lead} <- Lead.convert(lead, coach) do
      render(conn, :show, lead: updated_lead)
    else
      nil ->
        {:error, :not_found}

      {:error, :already_converted} ->
        {:error, Easy.Error.unprocessable("lead is already converted")}

      error ->
        error
    end
  end

  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Lead |> Lead.for_business(business_id) |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      lead ->
        with {:ok, _deleted} <- Lead.delete(lead) do
          send_resp(conn, :no_content, "")
        end
    end
  end
end
