defmodule EasyWeb.Coaches.NutritionPlanControllerTest do
  use Easy.ConnCase

  alias Easy.Nutrition.Plan
  alias Easy.Repo

  describe "Nutrition Template collection" do
    test "rejects unknown list query keys", %{conn: conn} do
      coach = insert(:coach)

      response =
        conn
        |> authenticate_coach(coach)
        |> get("/v1/coach/nutrition-plans", %{"unexpected" => "value"})

      assert %{"error_detail" => %{"fields" => %{"unexpected" => ["is unknown"]}}} =
               json_response(response, 422)
    end

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
      assert created["lifecycle"] == "active"
      assert created["client_id"] == nil
      refute Map.has_key?(created, "business_id")

      assert [%{"name" => "Everyday", "id" => pattern_id, "slots" => []}] = created["menu"]["day_patterns"]

      assert created["menu"]["schedule"] == %{
               "monday" => pattern_id,
               "tuesday" => pattern_id,
               "wednesday" => pattern_id,
               "thursday" => pattern_id,
               "friday" => pattern_id,
               "saturday" => pattern_id,
               "sunday" => pattern_id
             }

      list_conn = get(conn, "/v1/coach/nutrition-plans", %{"search" => "cut"})

      assert %{"data" => [listed], "count" => 1} = json_response(list_conn, 200)
      assert listed["id"] == created["id"]
      assert listed["kind"] == "template"
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

      assert %{"error_detail" => %{"fields" => %{"client_id" => ["is unknown"]}}} =
               json_response(response, 422)
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

    test "paginates templates by cursor while preserving the legacy offset response", %{conn: conn} do
      coach = insert(:coach)
      conn = authenticate_coach(conn, coach)

      for _ <- 1..3, do: insert(:plan, creator: coach, business: coach.business)

      offset_response = conn |> get("/v1/coach/nutrition-plans") |> json_response(200)
      assert %{"data" => [_ | _], "count" => 3, "next_cursor" => nil} = offset_response

      first_page =
        conn
        |> get("/v1/coach/nutrition-plans", %{"cursor" => "start", "limit" => "2"})
        |> json_response(200)

      assert %{"data" => [_, _], "count" => 3, "next_cursor" => cursor} = first_page
      assert is_binary(cursor)

      assert %{"data" => [_], "count" => 3, "next_cursor" => nil} =
               conn
               |> get("/v1/coach/nutrition-plans", %{"cursor" => cursor, "limit" => "2"})
               |> json_response(200)
    end

    test "rejects malformed cursors and does not leak templates through another tenant's cursor", %{conn: conn} do
      coach = insert(:coach)
      other_coach = insert(:coach)
      own_template = insert(:plan, creator: coach, business: coach.business)
      insert(:plan, creator: other_coach, business: other_coach.business)
      insert(:plan, creator: other_coach, business: other_coach.business)
      conn = authenticate_coach(conn, coach)

      assert conn
             |> get("/v1/coach/nutrition-plans", %{"cursor" => "not-a-cursor"})
             |> json_response(422)

      other_cursor =
        build_conn()
        |> authenticate_coach(other_coach)
        |> get("/v1/coach/nutrition-plans", %{"cursor" => "start", "limit" => "1"})
        |> json_response(200)
        |> Map.fetch!("next_cursor")

      assert %{"data" => templates, "count" => 1} =
               conn
               |> get("/v1/coach/nutrition-plans", %{"cursor" => other_cursor})
               |> json_response(200)

      assert Enum.all?(templates, &(&1["id"] == own_template.id))
    end
  end

  describe "POST /v1/coach/nutrition-plans/preview-menu" do
    test "returns a resolved menu without persisting a plan", %{conn: conn} do
      coach = insert(:coach)
      pattern_id = Ecto.UUID.generate()

      menu = %{
        "meals" => [],
        "day_patterns" => [%{"id" => pattern_id, "name" => "Everyday", "slots" => []}],
        "schedule" => Map.new(~w(monday tuesday wednesday thursday friday saturday sunday), &{&1, pattern_id})
      }

      response =
        conn
        |> authenticate_coach(coach)
        |> post("/v1/coach/nutrition-plans/preview-menu", %{"menu" => menu})
        |> json_response(200)

      assert %{
               "data" => %{
                 "meals" => [],
                 "day_patterns" => [%{"id" => ^pattern_id, "name" => "Everyday", "slots" => []}],
                 "schedule" => %{"monday" => ^pattern_id, "sunday" => ^pattern_id}
               }
             } = response
    end

    test "conceals another tenant's food referenced by a preview", %{conn: conn} do
      coach = insert(:coach)
      other_coach = insert(:coach)
      food = insert(:food, creator: other_coach, business: other_coach.business)
      pattern_id = Ecto.UUID.generate()
      meal_id = Ecto.UUID.generate()

      menu = %{
        "meals" => [
          %{
            "id" => meal_id,
            "name" => "Lunch",
            "meal_items" => [
              %{
                "id" => Ecto.UUID.generate(),
                "kind" => "food",
                "food_id" => food.id,
                "portion" => %{"kind" => "gram", "grams" => 100}
              }
            ]
          }
        ],
        "day_patterns" => [%{"id" => pattern_id, "name" => "Everyday", "slots" => [%{"meal_slot" => "lunch", "meal_ids" => [meal_id]}]}],
        "schedule" => Map.new(~w(monday tuesday wednesday thursday friday saturday sunday), &{&1, pattern_id})
      }

      assert conn
             |> authenticate_coach(coach)
             |> post("/v1/coach/nutrition-plans/preview-menu", %{"menu" => menu})
             |> json_response(404)
    end
  end

  describe "Nutrition Template lifecycle" do
    test "shows, updates, archives, restores, and deletes", %{conn: conn} do
      coach = insert(:coach)
      conn = authenticate_coach(conn, coach)
      template = insert(:plan, business: coach.business, creator: coach.user)

      show_conn = get(conn, "/v1/coach/nutrition-plans/#{template.id}")
      assert %{"data" => shown} = json_response(show_conn, 200)
      assert shown["kind"] == "template"
      assert shown["revision"] == 1
      assert [%{"name" => "Everyday", "slots" => []}] = shown["menu"]["day_patterns"]

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

      assert Repo.get!(Plan, template.id).name == "Revised Template"

      archive_conn = post(conn, "/v1/coach/nutrition-plans/#{template.id}/archive")
      assert %{"data" => %{"lifecycle" => "archived", "revision" => 3}} = json_response(archive_conn, 200)

      restore_conn = post(conn, "/v1/coach/nutrition-plans/#{template.id}/restore")
      assert %{"data" => %{"lifecycle" => "active", "revision" => 4}} = json_response(restore_conn, 200)

      delete_conn = delete(conn, "/v1/coach/nutrition-plans/#{template.id}")

      assert response(delete_conn, 204) == ""
      assert Repo.get(Plan, template.id) == nil
    end

    test "accepts lifecycle revision queries and rejects stale or malformed values", %{conn: conn} do
      coach = insert(:coach)
      template = insert(:plan, business: coach.business, creator: coach.user)
      conn = authenticate_coach(conn, coach)

      stale_archive =
        post(conn, "/v1/coach/nutrition-plans/#{template.id}/archive?expected_revision=2")

      assert %{
               "error_code" => "stale_revision",
               "error_detail" => %{"current_revision" => 1}
             } = json_response(stale_archive, 409)

      archive =
        post(conn, "/v1/coach/nutrition-plans/#{template.id}/archive?expected_revision=1")

      assert %{"data" => %{"lifecycle" => "archived", "revision" => 2}} =
               json_response(archive, 200)

      malformed_restore =
        post(conn, "/v1/coach/nutrition-plans/#{template.id}/restore?expected_revision=invalid")

      assert %{"error_detail" => %{"fields" => %{"expected_revision" => [_ | _]}}} =
               json_response(malformed_restore, 422)

      for revision <- [0, -1] do
        invalid_restore =
          post(conn, "/v1/coach/nutrition-plans/#{template.id}/restore?expected_revision=#{revision}")

        assert %{"error_detail" => %{"fields" => %{"expected_revision" => [_ | _]}}} =
                 json_response(invalid_restore, 422)
      end

      stale_restore =
        post(conn, "/v1/coach/nutrition-plans/#{template.id}/restore?expected_revision=1")

      assert %{
               "error_code" => "stale_revision",
               "error_detail" => %{"current_revision" => 2}
             } = json_response(stale_restore, 409)

      restore =
        post(conn, "/v1/coach/nutrition-plans/#{template.id}/restore?expected_revision=2")

      assert %{"data" => %{"lifecycle" => "active", "revision" => 3}} = json_response(restore, 200)

      stale_delete = delete(conn, "/v1/coach/nutrition-plans/#{template.id}?expected_revision=2")

      assert %{
               "error_code" => "stale_revision",
               "error_detail" => %{"current_revision" => 3}
             } = json_response(stale_delete, 409)

      name = template.name

      assert %Plan{name: ^name, revision: 3, archived_at: nil, menu: %{meals: []}} =
               Repo.get(Plan, template.id)

      delete_conn = delete(conn, "/v1/coach/nutrition-plans/#{template.id}?expected_revision=3")
      assert response(delete_conn, 204) == ""
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
               post(conn, "/v1/coach/nutrition-plans/#{hidden.id}/archive"),
               404
             )

      assert json_response(
               post(conn, "/v1/coach/nutrition-plans/#{hidden.id}/restore"),
               404
             )

      assert json_response(
               delete(conn, "/v1/coach/nutrition-plans/#{hidden.id}"),
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
               "data" => %{
                 "start_date" => start_iso,
                 "end_date" => end_iso,
                 "lifecycle" => "upcoming",
                 "revision" => 2
               }
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
        |> post("/v1/coach/nutrition-plans/#{first.id}/archive")
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
        |> post("/v1/coach/clients/#{client.id}/nutrition-plans/#{other_template.id}/assign", %{"start_date" => nil})
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
        |> post("/v1/coach/nutrition-plans/#{created["id"]}/duplicate")
        |> json_response(201)

      assert %{
               "data" => %{
                 "id" => duplicate_id,
                 "kind" => "template",
                 "name" => "HTTP Cut (Copy)",
                 "revision" => 1,
                 "client_id" => nil,
                 "source_template_id" => nil,
                 "menu" => %{
                   "day_patterns" => [%{"id" => copied_pattern_id, "name" => "Everyday"}],
                   "schedule" => copied_schedule
                 }
               }
             } = response

      assert duplicate_id != created["id"]
      assert copied_pattern_id == hd(created["menu"]["day_patterns"])["id"]
      assert copied_schedule["monday"] == copied_pattern_id
      assert copied_schedule["sunday"] == copied_pattern_id
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
          |> post("/v1/coach/nutrition-plans/#{source.id}/duplicate")
          |> json_response(404)

        assert %{"error_code" => "not_found"} = response
      end
    end
  end

  describe "Nutrition Template Assignment" do
    test "rejects a stale template revision and accepts the current revision", %{conn: conn} do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      template = insert(:plan, business: coach.business, creator: coach.user)
      conn = authenticate_coach(conn, coach)

      assert %{"data" => %{"revision" => 2}} =
               conn
               |> patch("/v1/coach/nutrition-plans/#{template.id}", %{
                 "expected_revision" => 1,
                 "name" => "Revised Template"
               })
               |> json_response(200)

      assert %{"error_code" => "stale_revision", "error_detail" => %{"current_revision" => 2}} =
               conn
               |> post("/v1/coach/clients/#{client.id}/nutrition-plans/#{template.id}/assign", %{
                 "expected_revision" => 1
               })
               |> json_response(409)

      assert %{"data" => %{"client_id" => client_id, "source_template_id" => source_id}} =
               conn
               |> post("/v1/coach/clients/#{client.id}/nutrition-plans/#{template.id}/assign", %{
                 "expected_revision" => 2
               })
               |> json_response(201)

      assert client_id == client.id
      assert source_id == template.id
    end

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

      pattern_id = hd(created["menu"]["day_patterns"])["id"]

      response =
        conn
        |> post("/v1/coach/clients/#{client.id}/nutrition-plans/#{created["id"]}/assign", %{
          "start_date" => nil,
          "end_date" => nil
        })
        |> json_response(201)

      assert %{
               "data" => %{
                 "id" => assigned_id,
                 "kind" => "client_plan",
                 "lifecycle" => "incomplete",
                 "revision" => 1,
                 "client_id" => client_id,
                 "source_template_id" => source_id,
                 "menu" => %{
                   "day_patterns" => [%{"id" => copied_pattern_id, "name" => "Everyday"}],
                   "schedule" => copied_schedule
                 }
               }
             } = response

      assert assigned_id != created["id"]
      assert client_id == client.id
      assert source_id == created["id"]
      assert copied_pattern_id == pattern_id
      assert copied_schedule["monday"] == copied_pattern_id
      assert Repo.get!(Easy.Clients.Client, client.id).stage == :coaching

      assert %{"data" => [listed], "count" => 1} =
               conn
               |> get("/v1/coach/nutrition-plans")
               |> json_response(200)

      assert listed["id"] == created["id"]
      assert listed["assigned_client_count"] == 1
    end

    test "conceals invalid Assignment inputs", %{conn: conn} do
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
          |> post("/v1/coach/clients/#{target}/nutrition-plans/#{source}/assign")
          |> json_response(404)

        assert %{"error_code" => "not_found"} = response
      end
    end
  end
end
