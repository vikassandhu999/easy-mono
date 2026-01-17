defmodule EasyWeb.CoachController do
  alias Easy.Orgs.Coaches
  use EasyWeb, :controller

  alias Easy.Orgs

  def show(conn, _params) do
    user_id = conn.assigns.claims["user_id"]
    business_id = conn.assigns.claims["business_id"]

    with {:ok, coach} <- Coaches.get_by_user_id(user_id, business_id) do
      conn
      |> put_status(:ok)
      |> render(:show, coach: coach)
    end
  end

  def update(conn, params) do
    user_id = conn.assigns.claims["user_id"]
    business_id = conn.assigns.claims["business_id"]

    with {:ok, coach} <- Coaches.get_by_user_id(user_id, business_id),
         {:ok, updated_coach} <- Coaches.update(coach, params) do
      conn
      |> put_status(:ok)
      |> render(:show, coach: updated_coach)
    end
  end
end
