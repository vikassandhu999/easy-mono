defmodule EasyWeb.Coaches.NutritionPlanControllerTest do
  use Easy.ConnCase

  import OpenApiSpex.TestAssertions

  alias Easy.Nutrition.Plan
  alias Easy.Repo

  describe "Nutrition Template collection" do
    test "creates and lists discriminated templates with an empty Everyday Day Pattern", %{conn: conn} do
      coach = insert(:coach)
      conn = authenticate_coach(conn, coach)

      create_conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/nutrition-plans", %{
          "name" => "Cut Block",
          "description" => "Reusable cutting Template",
          "target_calories" => 2000,
          "target_protein_g" => 150
        })

      assert %{"data" => created} = json_response(create_conn, 201)
      assert created["kind"] == "template"
      assert created["name"] == "Cut Block"
      assert created["revision"] == 1
      assert created["archived_at"] == nil
      assert created["lifecycle"] == nil
      assert created["client_id"] == nil
      assert created["status"] == "active"
      refute Map.has_key?(created, "business_id")

      assert [%{"name" => "Everyday", "position" => 0, "id" => pattern_id, "weekdays" => weekdays}] =
               created["day_patterns"]

      assert Enum.sort(weekdays) == Enum.sort(~w(monday tuesday wednesday thursday friday saturday sunday))

      assert created["schedule"] == %{
               "monday" => pattern_id,
               "tuesday" => pattern_id,
               "wednesday" => pattern_id,
               "thursday" => pattern_id,
               "friday" => pattern_id,
               "saturday" => pattern_id,
               "sunday" => pattern_id
             }

      assert_schema(created, "NutritionPlan", EasyWeb.ApiSpec.spec())

      list_conn = get(conn, "/v1/coach/nutrition-plans", %{"search" => "cut"})

      assert %{"data" => [listed], "count" => 1} = json_response(list_conn, 200)
      assert listed["id"] == created["id"]
      assert listed["kind"] == "template"
      assert_schema(listed, "NutritionPlan", EasyWeb.ApiSpec.spec())
    end

    test "rejects client-plan fields on the template collection", %{conn: conn} do
      coach = insert(:coach)

      response =
        conn
        |> authenticate_coach(coach)
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/nutrition-plans", %{
          "name" => "Invalid Template",
          "client_id" => Ecto.UUID.generate(),
          "start_date" => "2026-08-15"
        })

      assert %{"errors" => [_ | _]} = json_response(response, 422)
    end

    test "lists only templates for this business", %{conn: conn} do
      coach = insert(:coach)
      conn = authenticate_coach(conn, coach)
      insert(:plan, creator: coach, business: coach.business)

      client = insert(:client, creator: coach, business: coach.business)
      insert(:plan, creator: coach, business: coach.business, client_id: client.id)

      other = insert(:coach)
      insert(:plan, creator: other, business: other.business)

      conn = get(conn, "/v1/coach/nutrition-plans")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
      assert hd(data)["client_id"] == nil
    end
  end

  describe "Nutrition Template lifecycle" do
    test "shows, updates, archives, restores, and deletes through revisioned commands", %{conn: conn} do
      coach = insert(:coach)
      conn = authenticate_coach(conn, coach)
      template = insert(:plan, business: coach.business, creator: coach.user)

      show_conn = get(conn, "/v1/coach/nutrition-plans/#{template.id}")
      assert %{"data" => shown} = json_response(show_conn, 200)
      assert shown["kind"] == "template"
      assert shown["revision"] == 1
      assert shown["day_patterns"] == []
      assert_schema(shown, "NutritionPlan", EasyWeb.ApiSpec.spec())

      update_conn =
        patch(conn, "/v1/coach/nutrition-plans/#{template.id}", %{
          "expected_revision" => 1,
          "name" => "Revised Template"
        })

      assert %{"data" => %{"name" => "Revised Template", "revision" => 2}} =
               json_response(update_conn, 200)

      stale_conn =
        patch(conn, "/v1/coach/nutrition-plans/#{template.id}", %{
          "expected_revision" => 1,
          "name" => "Lost write"
        })

      stale_response = json_response(stale_conn, 409)

      assert %{
               "error_code" => "stale_revision",
               "error_detail" => %{"current_revision" => 2}
             } = stale_response

      assert_schema(stale_response, "StaleRevisionError", EasyWeb.ApiSpec.spec())
      assert Repo.get!(Plan, template.id).name == "Revised Template"

      stale_archive_conn =
        post(conn, "/v1/coach/nutrition-plans/#{template.id}/archive", %{"expected_revision" => 1})

      assert %{
               "error_code" => "stale_revision",
               "error_detail" => %{"current_revision" => 2}
             } = json_response(stale_archive_conn, 409)

      archive_conn =
        post(conn, "/v1/coach/nutrition-plans/#{template.id}/archive", %{"expected_revision" => 2})

      assert %{"data" => %{"archived_at" => archived_at, "revision" => 3, "status" => "archived"}} =
               json_response(archive_conn, 200)

      assert archived_at

      stale_restore_conn =
        post(conn, "/v1/coach/nutrition-plans/#{template.id}/restore", %{"expected_revision" => 2})

      assert %{
               "error_code" => "stale_revision",
               "error_detail" => %{"current_revision" => 3}
             } = json_response(stale_restore_conn, 409)

      restore_conn =
        post(conn, "/v1/coach/nutrition-plans/#{template.id}/restore", %{"expected_revision" => 3})

      assert %{"data" => %{"archived_at" => nil, "revision" => 4, "status" => "active"}} =
               json_response(restore_conn, 200)

      delete_conn = delete(conn, "/v1/coach/nutrition-plans/#{template.id}?expected_revision=4")

      assert response(delete_conn, 204) == ""
      assert Repo.get(Plan, template.id) == nil
    end

    test "conceals another business Template for every lifecycle operation", %{conn: conn} do
      coach = insert(:coach)
      other = insert(:coach)
      hidden = insert(:plan, business: other.business, creator: other.user)
      conn = authenticate_coach(conn, coach)

      assert json_response(get(conn, "/v1/coach/nutrition-plans/#{hidden.id}"), 404)

      assert json_response(
               patch(conn, "/v1/coach/nutrition-plans/#{hidden.id}", %{
                 "expected_revision" => 1,
                 "name" => "Nope"
               }),
               404
             )

      assert json_response(
               post(conn, "/v1/coach/nutrition-plans/#{hidden.id}/archive", %{
                 "expected_revision" => 1
               }),
               404
             )

      assert json_response(
               post(conn, "/v1/coach/nutrition-plans/#{hidden.id}/restore", %{
                 "expected_revision" => 1
               }),
               404
             )

      assert json_response(
               delete(conn, "/v1/coach/nutrition-plans/#{hidden.id}?expected_revision=1"),
               404
             )
    end

    test "preserves Client Plan detail and Coverage updates", %{conn: conn} do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      start_date = Date.add(Date.utc_today(), 7)
      end_date = Date.add(start_date, 30)

      client_plan =
        insert(:plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan,
          start_date: Date.add(start_date, -7)
        )

      conn = authenticate_coach(conn, coach)

      assert %{"data" => %{"kind" => "client_plan", "revision" => 1, "client" => %{"id" => client_id}}} =
               conn
               |> get("/v1/coach/nutrition-plans/#{client_plan.id}")
               |> json_response(200)

      assert client_id == client.id

      assert %{
               "data" =>
                 %{
                   "start_date" => start_iso,
                   "end_date" => end_iso,
                   "lifecycle" => "upcoming",
                   "revision" => 2
                 } = data
             } =
               conn
               |> patch("/v1/coach/nutrition-plans/#{client_plan.id}", %{
                 "expected_revision" => 1,
                 "start_date" => Date.to_iso8601(start_date),
                 "end_date" => Date.to_iso8601(end_date)
               })
               |> json_response(200)

      assert start_iso == Date.to_iso8601(start_date)
      assert end_iso == Date.to_iso8601(end_date)
      assert_schema(data, "NutritionPlan", EasyWeb.ApiSpec.spec())
    end

    test "reports incomplete, overlap, stale-revision, and archived Coverage errors", %{conn: conn} do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      first =
        insert(:plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan,
          start_date: ~D[2026-09-01],
          end_date: ~D[2026-09-30]
        )

      second =
        insert(:plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan,
          start_date: ~D[2026-10-01],
          end_date: ~D[2026-10-31]
        )

      conn = authenticate_coach(conn, coach)

      overlap =
        conn
        |> patch("/v1/coach/nutrition-plans/#{second.id}", %{
          "expected_revision" => 1,
          "start_date" => "2026-09-15",
          "end_date" => nil
        })
        |> json_response(422)

      assert %{
               "error_code" => "invalid_input",
               "error_detail" => %{"fields" => %{"start_date" => ["overlaps another Client Plan's Coverage"]}}
             } = overlap

      stale =
        conn
        |> patch("/v1/coach/nutrition-plans/#{first.id}", %{
          "expected_revision" => 9,
          "start_date" => "2026-08-01"
        })
        |> json_response(409)

      assert %{"error_code" => "stale_revision", "error_detail" => %{"current_revision" => 1}} = stale

      archived =
        conn
        |> post("/v1/coach/nutrition-plans/#{first.id}/archive", %{"expected_revision" => 1})
        |> json_response(200)
        |> Map.fetch!("data")

      archived_edit =
        conn
        |> patch("/v1/coach/nutrition-plans/#{archived["id"]}", %{
          "expected_revision" => archived["revision"],
          "start_date" => "2026-08-01"
        })
        |> json_response(422)

      assert %{
               "error_code" => "invalid_input",
               "error_detail" => %{"fields" => %{"archived_at" => ["is read-only"]}}
             } = archived_edit

      incomplete =
        insert(:plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan
        )

      other_template =
        insert(:plan, business: coach.business, creator: coach.user, name: "Second Draft")

      second_incomplete =
        conn
        |> post("/v1/coach/clients/#{client.id}/nutrition-plans/#{other_template.id}/assign", %{
          "expected_revision" => 1,
          "start_date" => nil
        })
        |> json_response(422)

      assert %{
               "error_code" => "invalid_input",
               "error_detail" => %{"fields" => %{"client_id" => ["already has an incomplete Client Plan"]}}
             } = second_incomplete

      assert incomplete.id
    end
  end

  describe "Nutrition Template duplication" do
    test "duplicates only an active Template with an independent Everyday menu", %{conn: conn} do
      coach = insert(:coach)
      conn = authenticate_coach(conn, coach)

      created =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/nutrition-plans", %{"name" => "HTTP Cut"})
        |> json_response(201)
        |> Map.fetch!("data")

      response =
        conn
        |> post("/v1/coach/nutrition-plans/#{created["id"]}/duplicate", %{
          "expected_revision" => created["revision"]
        })
        |> json_response(201)

      assert %{
               "data" =>
                 %{
                   "id" => duplicate_id,
                   "kind" => "template",
                   "name" => "HTTP Cut (Copy)",
                   "revision" => 1,
                   "client_id" => nil,
                   "source_template_id" => nil,
                   "day_patterns" => [%{"id" => copied_pattern_id, "name" => "Everyday"}],
                   "schedule" => copied_schedule
                 } = data
             } = response

      assert duplicate_id != created["id"]
      assert copied_pattern_id != hd(created["day_patterns"])["id"]
      assert copied_schedule["monday"] == copied_pattern_id
      assert copied_schedule["sunday"] == copied_pattern_id
      assert_schema(data, "NutritionPlan", EasyWeb.ApiSpec.spec())
    end

    test "returns not found for archived, Client Plan, and cross-tenant sources", %{conn: conn} do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      other = insert(:coach)
      conn = authenticate_coach(conn, coach)

      archived =
        insert(:plan,
          business: coach.business,
          creator: coach.user,
          archived_at: ~U[2026-08-15 12:00:00Z]
        )

      client_plan =
        insert(:plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan,
          start_date: ~D[2026-09-01]
        )

      hidden = insert(:plan, business: other.business, creator: other.user)

      for source <- [archived, client_plan, hidden] do
        response =
          conn
          |> post("/v1/coach/nutrition-plans/#{source.id}/duplicate", %{"expected_revision" => 1})
          |> json_response(404)

        assert %{"error_code" => "not_found"} = response
      end
    end
  end

  describe "Nutrition Template Assignment" do
    test "assigns a complete independent Client Plan and advances onboarding", %{conn: conn} do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach, stage: :onboarding)
      conn = authenticate_coach(conn, coach)

      created =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/nutrition-plans", %{"name" => "HTTP Assignment"})
        |> json_response(201)
        |> Map.fetch!("data")

      pattern_id = hd(created["day_patterns"])["id"]

      response =
        conn
        |> post("/v1/coach/clients/#{client.id}/nutrition-plans/#{created["id"]}/assign", %{
          "expected_revision" => created["revision"],
          "start_date" => nil,
          "end_date" => nil
        })
        |> json_response(201)

      assert %{
               "data" =>
                 %{
                   "id" => assigned_id,
                   "kind" => "client_plan",
                   "lifecycle" => "incomplete",
                   "revision" => 1,
                   "client_id" => client_id,
                   "source_template_id" => source_id,
                   "day_patterns" => [%{"id" => copied_pattern_id, "name" => "Everyday"}],
                   "schedule" => copied_schedule
                 } = data
             } = response

      assert assigned_id != created["id"]
      assert client_id == client.id
      assert source_id == created["id"]
      assert copied_pattern_id != pattern_id
      assert copied_schedule["monday"] == copied_pattern_id
      assert Repo.get!(Easy.Clients.Client, client.id).stage == :coaching
      assert_schema(data, "NutritionPlan", EasyWeb.ApiSpec.spec())

      assert %{"data" => [listed], "count" => 1} =
               conn
               |> get("/v1/coach/nutrition-plans")
               |> json_response(200)

      assert listed["id"] == created["id"]
      assert listed["assigned_client_count"] == 1
    end

    test "returns conflict for a stale source revision and conceals invalid Assignment inputs", %{conn: conn} do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      other = insert(:coach)
      hidden_client = insert(:client, business: other.business, creator: other, assigned_coach: other)
      conn = authenticate_coach(conn, coach)

      created =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/nutrition-plans", %{"name" => "Fresh"})
        |> json_response(201)
        |> Map.fetch!("data")

      stale =
        conn
        |> post("/v1/coach/clients/#{client.id}/nutrition-plans/#{created["id"]}/assign", %{
          "expected_revision" => 9
        })
        |> json_response(409)

      assert %{"error_code" => "stale_revision", "error_detail" => %{"current_revision" => 1}} = stale
      assert_schema(stale, "StaleRevisionError", EasyWeb.ApiSpec.spec())

      archived =
        insert(:plan,
          business: coach.business,
          creator: coach.user,
          archived_at: ~U[2026-08-15 12:00:00Z]
        )

      client_plan =
        insert(:plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan,
          start_date: ~D[2026-10-01]
        )

      for {target, source} <- [
            {client.id, archived.id},
            {client.id, client_plan.id},
            {hidden_client.id, created["id"]}
          ] do
        response =
          conn
          |> post("/v1/coach/clients/#{target}/nutrition-plans/#{source}/assign", %{
            "expected_revision" => 1
          })
          |> json_response(404)

        assert %{"error_code" => "not_found"} = response
      end
    end

    test "generated OpenAPI includes the Assignment route" do
      assignment = EasyWeb.ApiSpec.spec().paths["/v1/coach/clients/{client_id}/nutrition-plans/{id}/assign"].post

      assert assignment.operationId == "assignNutritionPlan"
      assert assignment.requestBody.required == true
      assert assignment.responses[201]
      assert assignment.responses[404]
      assert assignment.responses[409]
      assert assignment.responses[422]
    end
  end
end
