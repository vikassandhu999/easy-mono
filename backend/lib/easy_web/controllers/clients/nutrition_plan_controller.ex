defmodule EasyWeb.Clients.NutritionPlanController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.Reads

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id) do
      offset = parse_integer(params, "offset", 0)
      lim = parse_integer(params, "limit", 50)
      status = parse_enum(params, "status", Plan.statuses())

      with {:ok, %{plans: plans, count: count}} <-
             Reads.list_client_plans(business_id, client.id, status, offset, lim) do
        render(conn, :index, plans: plans, count: count)
      end
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, plan} <- Reads.fetch_client_plan_full(business_id, client.id, id) do
      render(conn, :show, plan: plan)
    end
  end

  @spec today(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def today(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    date = Easy.Utils.safe_date(params["date"]) || Date.utc_today()

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, %{plan: plan, plan_items: plan_items, day: day}} <-
           Reads.fetch_active_plan_day(business_id, client.id, date) do
      render(conn, :today, plan: plan, plan_items: plan_items, date: date, day: day)
    end
  end
end
