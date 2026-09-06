defmodule Easy.Nutrition.ProgrammingCoverageTest do
  import Easy.Nutrition.ProgrammingMenuFixtures, only: [uuid: 1]
  use Easy.DataCase, async: true

  alias Easy.LocalCalendar
  alias Easy.Nutrition.{Menu, Plan, Programming}
  alias Easy.QueryPlan

  describe "Client Plan Coverage and lifecycle" do
    test "exports the canonical Client Plan lifecycle vocabulary" do
      assert Plan.lifecycles() == [:incomplete, :upcoming, :current, :ended, :archived]
    end

    test "derives lifecycle from dates, archive state, and the client's local date" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      ctx = trainer_ctx(coach)
      today = local_today(client)

      incomplete = insert_client_plan(coach, client, name: "Draft")
      upcoming = insert_client_plan(coach, client, name: "Next", start_date: Date.add(today, 1))
      current = insert_client_plan(coach, client, name: "Now", start_date: today, end_date: today)
      ended = insert_client_plan(coach, client, name: "Past", start_date: Date.add(today, -7), end_date: Date.add(today, -1))
      archived = insert_client_plan(coach, client, name: "Old", start_date: today, archived_at: DateTime.utc_now(:second))

      plans =
        Enum.map([incomplete, upcoming, current, ended, archived], fn plan ->
          {:ok, loaded} = Programming.get_plan(ctx, plan.id)
          loaded
        end)

      assert {:ok, %{current: selected, upcoming: [scheduled]}} = Programming.get_coverage_for_client(ctx, client.id)
      assert selected.id == current.id
      assert scheduled.id == upcoming.id
      by_id = Map.new(plans, &{&1.id, &1})

      assert by_id[incomplete.id].lifecycle == :incomplete
      assert by_id[upcoming.id].lifecycle == :upcoming
      assert by_id[current.id].lifecycle == :current
      assert by_id[ended.id].lifecycle == :ended
      assert by_id[archived.id].lifecycle == :archived
    end

    test "rejects a second unarchived incomplete Client Plan" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      insert_client_plan(coach, client)

      assert {:error, changeset} = Programming.assign_template_to_client(ctx, client.id, template.id, 1, %{})
      assert %{client_id: ["already has an incomplete Client Plan"]} = errors_on(changeset)
    end

    test "accepts several non-overlapping future Client Plans and rejects overlapping Coverage" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      {:ok, first_template} = Programming.create_template(ctx, %{"name" => "Block A"})
      {:ok, second_template} = Programming.create_template(ctx, %{"name" => "Block B"})
      {:ok, third_template} = Programming.create_template(ctx, %{"name" => "Block C"})

      assert {:ok, first} =
               Programming.assign_template_to_client(ctx, client.id, first_template.id, 1, %{
                 "start_date" => "2026-09-01",
                 "end_date" => "2026-09-30"
               })

      assert {:ok, second} =
               Programming.assign_template_to_client(ctx, client.id, second_template.id, 1, %{
                 "start_date" => "2026-10-01",
                 "end_date" => "2026-10-31"
               })

      assert {:error, overlap} =
               Programming.assign_template_to_client(ctx, client.id, third_template.id, 1, %{
                 "start_date" => "2026-09-15",
                 "end_date" => nil
               })

      assert %{start_date: ["overlaps another Client Plan's Coverage"]} = errors_on(overlap)

      assert {:error, restored_overlap} =
               Programming.update_plan(ctx, second.id, 1, %{"start_date" => "2026-09-20"})

      assert %{start_date: ["overlaps another Client Plan's Coverage"]} = errors_on(restored_overlap)

      assert {:ok, archived} = Programming.archive_plan(ctx, first.id, 1)
      assert {:ok, _restored} = Programming.restore_plan(ctx, archived.id, 2)
    end

    test "restore is rejected when it would overlap unarchived Coverage" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      {:ok, first_template} = Programming.create_template(ctx, %{"name" => "Now"})
      {:ok, second_template} = Programming.create_template(ctx, %{"name" => "Later"})

      {:ok, first} =
        Programming.assign_template_to_client(ctx, client.id, first_template.id, 1, %{
          "start_date" => "2026-09-01",
          "end_date" => "2026-09-30"
        })

      {:ok, archived} = Programming.archive_plan(ctx, first.id, 1)

      {:ok, _replacement} =
        Programming.assign_template_to_client(ctx, client.id, second_template.id, 1, %{
          "start_date" => "2026-09-01",
          "end_date" => nil
        })

      assert {:error, changeset} = Programming.restore_plan(ctx, archived.id, 2)
      assert %{start_date: ["overlaps another Client Plan's Coverage"]} = errors_on(changeset)
    end
  end

  describe "resolve_client_coverage/2" do
    test "resolves inclusive Coverage and the selected Day Pattern with its Meal Options" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      food = insert(:food, business: coach.business, creator: coach)
      ctx = trainer_ctx(coach)
      {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      {:ok, source} = Programming.replace_menu(ctx, template.id, 1, breakfast_menu(template, food))

      {:ok, assigned} =
        Programming.assign_template_to_client(ctx, client.id, source.id, 2, %{
          "start_date" => "2026-08-15",
          "end_date" => "2026-08-15"
        })

      assert {:ok, %{plan: resolved, day_pattern: pattern, date: ~D[2026-08-15], weekday: :saturday}} =
               Programming.resolve_client_coverage(client_ctx(client), ~D[2026-08-15])

      assert resolved.id == assigned.id
      assert pattern.id == hd(assigned.menu.day_patterns).id
      assert [%{meal_slot: :breakfast, meal_ids: [_meal_id]}] = pattern.slots
    end

    test "treats start and end dates as inclusive and an absent end date as open-ended" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      plan = insert_client_plan(coach, client, start_date: ~D[2026-08-15], end_date: ~D[2026-08-17])
      ctx = client_ctx(client)

      assert {:ok, nil} = Programming.resolve_client_coverage(ctx, ~D[2026-08-14])
      assert {:ok, %{plan: %{id: id}}} = Programming.resolve_client_coverage(ctx, ~D[2026-08-15])
      assert {:ok, %{plan: %{id: ^id}}} = Programming.resolve_client_coverage(ctx, ~D[2026-08-17])
      assert {:ok, nil} = Programming.resolve_client_coverage(ctx, ~D[2026-08-18])
      assert id == plan.id

      open = insert_client_plan(coach, client, start_date: ~D[2026-09-01], end_date: nil)
      assert {:ok, %{plan: %{id: open_id}}} = Programming.resolve_client_coverage(ctx, ~D[2026-09-01])
      assert {:ok, %{plan: %{id: ^open_id}}} = Programming.resolve_client_coverage(ctx, ~D[2026-12-31])
      assert open_id == open.id
    end

    test "returns successful absence for incomplete, archived, ended, upcoming, and other clients' plans" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      other_client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      other = insert(:coach)
      other_business_client = insert(:client, business: other.business, creator: other, assigned_coach: other)

      insert_client_plan(coach, client)
      insert_client_plan(coach, client, start_date: ~D[2026-09-01], end_date: ~D[2026-09-30])
      insert_client_plan(coach, client, start_date: ~D[2026-06-01], end_date: ~D[2026-06-30])
      insert_client_plan(coach, client, start_date: ~D[2026-08-01], archived_at: DateTime.utc_now(:second))
      insert_client_plan(coach, other_client, start_date: ~D[2026-08-01])
      insert_client_plan(other, other_business_client, start_date: ~D[2026-08-01])

      assert {:ok, nil} = Programming.resolve_client_coverage(client_ctx(client), ~D[2026-08-15])
    end

    test "client-self Coverage requires the trusted client id from Ctx" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      insert_client_plan(coach, client, start_date: ~D[2026-08-15])
      missing_client_ctx = %Easy.Ctx{business_id: coach.business_id, user_id: client.user_id}

      assert {:error, :not_found} = Programming.resolve_client_coverage(missing_client_ctx, ~D[2026-08-15])
    end
  end

  describe "resolve_coverage_for_client/3" do
    test "lets a coach resolve Coverage for a visible client and conceals others" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      hidden = insert(:client, business: insert(:coach).business, creator: insert(:coach))
      plan = insert_client_plan(coach, client, start_date: ~D[2026-08-15], end_date: ~D[2026-08-15])
      ctx = trainer_ctx(coach)

      assert {:ok, %{plan: %{id: id}}} = Programming.resolve_coverage_for_client(ctx, client.id, ~D[2026-08-15])
      assert id == plan.id
      assert {:ok, nil} = Programming.resolve_coverage_for_client(ctx, client.id, ~D[2026-08-16])
      assert {:error, :not_found} = Programming.resolve_coverage_for_client(ctx, hidden.id, ~D[2026-08-15])
    end
  end

  describe "covering_plans_for_clients/3" do
    test "loads a page of covering Client Plans in one query" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      today = ~D[2026-08-15]

      covered =
        for n <- 1..3 do
          client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
          plan = insert_client_plan(coach, client, name: "Covered #{n}", start_date: today)
          {client.id, plan.id}
        end

      uncovered = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      insert_client_plan(coach, uncovered)
      ids = Enum.map(covered, &elem(&1, 0)) ++ [uncovered.id]

      {result, queries} = QueryPlan.capture(fn -> Programming.covering_plans_for_clients(ctx, ids, today) end)

      assert {:ok, plans} = result
      assert map_size(plans) == 3
      assert Enum.all?(covered, fn {client_id, plan_id} -> plans[client_id].id == plan_id end)
      refute Map.has_key?(plans, uncovered.id)
      assert Enum.count(queries, &String.contains?(&1.sql, "nutrition_plans")) == 1
      assert Enum.all?(plans, fn {_id, plan} -> Ecto.assoc_loaded?(plan.client) end)
    end
  end

  defp breakfast_menu(plan, food) do
    pattern = hd(plan.menu.day_patterns)

    %{
      meals: [
        %{
          id: uuid("breakfast"),
          name: "Breakfast",
          meal_items: [
            %{id: uuid("yogurt"), kind: :food, food_id: food.id, portion: %{kind: :gram, grams: 50}}
          ]
        }
      ],
      day_patterns: [
        %{
          id: pattern.id,
          name: pattern.name,
          slots: [
            %{meal_slot: :breakfast, meal_ids: [uuid("breakfast")]}
          ]
        }
      ],
      schedule: Map.new(Menu.weekdays(), &{&1, pattern.id})
    }
  end

  defp insert_client_plan(coach, client, attrs \\ []) do
    insert(
      :plan,
      Keyword.merge(
        [business: coach.business, creator: coach.user, client: client, kind: :client_plan],
        attrs
      )
    )
  end

  defp client_ctx(client) do
    %Easy.Ctx{
      business_id: client.business_id,
      user_id: client.user_id,
      client_id: client.id
    }
  end

  defp local_today(client) do
    LocalCalendar.to_local_date(DateTime.utc_now(), LocalCalendar.applied_timezone(client.timezone, nil))
  end
end
