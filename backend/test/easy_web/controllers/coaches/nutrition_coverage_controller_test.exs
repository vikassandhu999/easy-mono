defmodule EasyWeb.Coaches.NutritionCoverageControllerTest do
  use Easy.ConnCase

  alias Easy.LocalCalendar

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

    conn =
      build_conn()
      |> authenticate_coach(coach)

    %{coach: coach, client: client, conn: conn}
  end

  describe "GET /v1/coach/clients/:client_id/nutrition-coverage" do
    test "returns today's current plan and upcoming plans", %{coach: coach, client: client, conn: conn} do
      date = local_today(client)

      current =
        insert(:plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan,
          start_date: date,
          end_date: Date.add(date, 6)
        )

      upcoming =
        insert(:plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan,
          start_date: Date.add(date, 7),
          end_date: Date.add(date, 13)
        )

      conn = get(conn, "/v1/coach/clients/#{client.id}/nutrition-coverage")

      assert %{
               "data" => %{
                 "date" => date_iso,
                 "current" => %{"id" => current_id},
                 "upcoming" => [%{"id" => upcoming_id}]
               }
             } = json_response(conn, 200)

      assert date_iso == Date.to_iso8601(date)
      assert current_id == current.id
      assert upcoming_id == upcoming.id
    end

    test "no current plan is explicit and upcoming plans are sorted without past or archived plans", %{coach: coach, client: client, conn: conn} do
      date = local_today(client)
      attrs = [business: coach.business, creator: coach.user, client: client, kind: :client_plan]
      later = insert(:plan, attrs ++ [start_date: Date.add(date, 14)])
      next = insert(:plan, attrs ++ [start_date: Date.add(date, 1), end_date: Date.add(date, 7)])
      insert(:plan, attrs ++ [start_date: Date.add(date, -7), end_date: Date.add(date, -1)])
      insert(:plan, attrs ++ [start_date: date, archived_at: DateTime.utc_now(:second)])
      insert(:plan, attrs ++ [start_date: nil])

      response = conn |> get("/v1/coach/clients/#{client.id}/nutrition-coverage") |> json_response(200)
      assert response["data"]["current"] == nil
      assert Enum.map(response["data"]["upcoming"], & &1["id"]) == [next.id, later.id]
    end

    test "ending coverage keeps today's plan and does not archive it", %{coach: coach, client: client, conn: conn} do
      date = local_today(client)
      plan = insert(:plan, business: coach.business, creator: coach.user, client: client, kind: :client_plan, start_date: Date.add(date, -1))

      response =
        conn
        |> patch("/v1/coach/nutrition-plans/#{plan.id}", %{expected_revision: plan.revision, end_date: Date.to_iso8601(date)})
        |> json_response(200)

      assert response["data"]["end_date"] == Date.to_iso8601(date)
      assert response["data"]["archived_at"] == nil
      assert response["data"]["lifecycle"] == "current"
      assert response["data"]["revision"] == plan.revision + 1
    end

    test "uses the client timezone even when its date differs from UTC", %{coach: coach, client: client, conn: conn} do
      timezone = if DateTime.utc_now().hour < 12, do: "Etc/GMT+12", else: "Pacific/Kiritimati"
      client |> Ecto.Changeset.change(timezone: timezone) |> Easy.Repo.update!()
      date = LocalCalendar.to_local_date(DateTime.utc_now(), timezone)
      plan = insert(:plan, business: coach.business, creator: coach.user, client: client, kind: :client_plan, start_date: date, end_date: date)

      response = conn |> get("/v1/coach/clients/#{client.id}/nutrition-coverage") |> json_response(200)
      assert response["data"]["date"] == Date.to_iso8601(date)
      assert response["data"]["current"]["id"] == plan.id
    end

    test "uses the business timezone when the client timezone is blank", %{client: client, conn: conn} do
      timezone = if DateTime.utc_now().hour < 12, do: "Etc/GMT+12", else: "Pacific/Kiritimati"
      client.business |> Ecto.Changeset.change(timezone: timezone) |> Easy.Repo.update!()
      client |> Ecto.Changeset.change(timezone: "") |> Easy.Repo.update!()

      coverage = conn |> get("/v1/coach/clients/#{client.id}/nutrition-coverage") |> json_response(200)
      client_response = conn |> get("/v1/coach/clients/#{client.id}") |> json_response(200)

      assert client_response["data"]["local_date"] == coverage["data"]["date"]
    end

    test "conceals clients from another business", %{conn: conn} do
      other_client = insert(:client)

      conn = get(conn, "/v1/coach/clients/#{other_client.id}/nutrition-coverage")

      assert json_response(conn, 404)
    end
  end

  defp local_today(client) do
    LocalCalendar.to_local_date(
      DateTime.utc_now(),
      LocalCalendar.applied_timezone(client.timezone, client.business && client.business.timezone)
    )
  end
end
