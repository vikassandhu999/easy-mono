defmodule Easy.Nutrition.ProgrammingClientPlanTest do
  import Easy.Nutrition.ProgrammingMenuFixtures, only: [uuid: 1]
  use Easy.DataCase, async: true

  alias Easy.Nutrition.{Menu, Plan, PlanReader, Programming}
  alias Easy.Repo

  describe "assign_template_to_client/4" do
    test "copies the complete Menu into an independent Client Plan and advances onboarding" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach, stage: :onboarding)
      food = insert(:food, business: coach.business, creator: coach, calories_per_100g: 200.0)
      {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut Block", "target_calories" => 1800.0})
      {:ok, source} = Programming.replace_menu(ctx, template.id, 1, breakfast_menu(template, food))

      assert {:ok, assigned} =
               Programming.assign_template_to_client(ctx, client.id, source.id, %{
                 "start_date" => "2026-09-01",
                 "end_date" => "2026-09-30"
               })

      assert assigned.kind == :client_plan
      assert assigned.name == "Cut Block"
      assert assigned.target_calories == 1800.0
      assert assigned.client_id == client.id
      assert assigned.source_template_id == source.id
      assert assigned.creator_id == coach.user_id
      assert assigned.revision == 1
      assert assigned.start_date == ~D[2026-09-01]
      assert assigned.end_date == ~D[2026-09-30]
      assert assigned.menu == source.menu
      assert Repo.get!(Easy.Clients.Client, client.id).stage == :coaching
    end

    test "rejects invalid sources, invisible clients, and accepts the latest source" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach, stage: :onboarding)
      {:ok, template} = Programming.create_template(ctx, %{"name" => "Source"})
      {:ok, archived} = Programming.archive_plan(ctx, template.id)

      client_plan =
        insert(:plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan,
          start_date: ~D[2026-10-01]
        )

      other = insert(:coach)
      hidden_template = insert(:plan, business: other.business, creator: other.user)
      hidden_client = insert(:client, business: other.business, creator: other, assigned_coach: other)
      {:ok, fresh} = Programming.create_template(ctx, %{"name" => "Fresh"})

      for {target, source, _revision} <- [
            {client.id, archived.id, 2},
            {client.id, client_plan.id, 1},
            {client.id, hidden_template.id, 1},
            {hidden_client.id, fresh.id, 1}
          ] do
        assert {:error, :not_found} = Programming.assign_template_to_client(ctx, target, source, %{})
      end

      assert Repo.get!(Easy.Clients.Client, client.id).stage == :onboarding
      assert {:ok, _assigned} = Programming.assign_template_to_client(ctx, client.id, fresh.id, %{})
      assert Repo.get!(Easy.Clients.Client, client.id).stage == :coaching
    end

    test "rolls onboarding back when Client Plan constraints reject Assignment" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach, stage: :onboarding)
      {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      insert(:plan,
        business: coach.business,
        creator: coach.user,
        client: client,
        kind: :client_plan
      )

      assert {:error, changeset} = Programming.assign_template_to_client(ctx, client.id, template.id, %{})
      assert %{client_id: [_]} = errors_on(changeset)
      assert Repo.get!(Easy.Clients.Client, client.id).stage == :onboarding

      assert Repo.aggregate(Plan.for_client(Plan, coach.business_id, client.id), :count, :id) == 1
    end
  end

  describe "Assignment copy independence" do
    test "later Template and Client Plan edits leave each other unchanged, including after source deletion" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      food = insert(:food, business: coach.business, creator: coach)
      {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut Block"})
      {:ok, source} = Programming.replace_menu(ctx, template.id, 1, breakfast_menu(template, food))
      {:ok, assigned} = Programming.assign_template_to_client(ctx, client.id, source.id, %{})

      assert {:ok, renamed} = Programming.update_plan(ctx, assigned.id, 1, %{"name" => "Individualized"})
      assert renamed.name == "Individualized"
      assert Repo.get!(Plan, source.id).name == "Cut Block"

      pattern = hd(source.menu.day_patterns)

      assert {:ok, _updated_template} =
               Programming.replace_menu(ctx, source.id, 2, %{
                 meals: [],
                 day_patterns: [%{id: pattern.id, name: "Training Day", slots: []}],
                 schedule: schedule_for(pattern.id)
               })

      {:ok, reloaded} = PlanReader.get_plan(ctx, assigned.id)
      assert [%{name: "Breakfast"}] = reloaded.menu.meals
      assert [%{name: "Everyday"}] = reloaded.menu.day_patterns

      assert {:ok, _deleted} = Programming.delete_plan(ctx, source.id)
      persisted = Repo.get!(Plan, assigned.id)
      assert persisted.source_template_id == nil
      assert persisted.menu == Repo.get!(Plan, assigned.id).menu
      assert [%{name: "Breakfast", meal_items: [_item]}] = persisted.menu.meals
    end
  end

  describe "Client Plan authorization and lifecycle" do
    test "lets the business owner mutate any Client Plan and conceals former-coach access" do
      owner_user = insert(:user)
      business = insert(:business, owner: owner_user)
      insert(:coach, user: owner_user, business: business)
      former = insert(:coach, business: business)
      current = insert(:coach, business: business)
      client = insert(:client, business: business, creator: former, assigned_coach: former)

      client_plan =
        insert(:plan,
          business: business,
          creator: former.user,
          client: client,
          kind: :client_plan,
          start_date: ~D[2026-09-01]
        )

      assert {:ok, _updated} =
               Programming.update_plan(owner_ctx(business), client_plan.id, 1, %{"name" => "Owner edit"})

      client
      |> Ecto.Changeset.change(%{assigned_coach_id: current.id})
      |> Repo.update!()

      former_ctx = trainer_ctx(former)
      assert {:error, :not_found} = PlanReader.get_plan(former_ctx, client_plan.id)
      assert {:error, :not_found} = Programming.update_plan(former_ctx, client_plan.id, 2, %{"name" => "Nope"})
      assert {:error, :not_found} = Programming.archive_plan(former_ctx, client_plan.id)
      assert {:error, :not_found} = Programming.restore_plan(former_ctx, client_plan.id)
      assert {:error, :not_found} = Programming.delete_plan(former_ctx, client_plan.id)
      assert {:error, :not_found} = Programming.replace_menu(former_ctx, client_plan.id, 2, %{meals: []})

      current_ctx = trainer_ctx(current)

      assert {:ok, archived} = Programming.archive_plan(current_ctx, client_plan.id)
      assert archived.archived_at
      assert archived.revision == 3

      assert {:ok, restored} = Programming.restore_plan(current_ctx, client_plan.id)
      assert restored.archived_at == nil
      assert restored.revision == 4

      assert {:ok, deleted} = Programming.delete_plan(current_ctx, client_plan.id)
      assert deleted.id == client_plan.id
      assert Repo.get(Plan, client_plan.id) == nil
    end

    test "archives, restores, and replaces a Client Plan Menu at the expected revision" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      food = insert(:food, business: coach.business, creator: coach)
      {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      {:ok, source} = Programming.replace_menu(ctx, template.id, 1, breakfast_menu(template, food))
      {:ok, assigned} = Programming.assign_template_to_client(ctx, client.id, source.id, %{})

      assert {:ok, _archived} = Programming.archive_plan(ctx, assigned.id)
      assert {:error, changeset} = Programming.update_plan(ctx, assigned.id, 2, %{"name" => "Nope"})
      assert %{archived_at: ["is read-only"]} = errors_on(changeset)

      assert {:ok, restored} = Programming.restore_plan(ctx, assigned.id)
      pattern = hd(restored.menu.day_patterns)

      assert {:ok, replaced} =
               Programming.replace_menu(ctx, restored.id, 3, %{
                 meals: [],
                 day_patterns: [%{id: pattern.id, name: pattern.name, slots: []}],
                 schedule: schedule_for(pattern.id)
               })

      assert replaced.menu.meals == []
      assert replaced.revision == 4
      {:ok, template_after} = PlanReader.get_plan(ctx, source.id)
      assert [%{name: "Breakfast"}] = template_after.menu.meals

      assert {:ok, archived_again} = Programming.archive_plan(ctx, replaced.id)
      assert {:ok, deleted} = Programming.delete_plan(ctx, archived_again.id)
      assert deleted.id == assigned.id
      assert Repo.get(Plan, assigned.id) == nil
    end
  end

  describe "Client-self reads" do
    test "lists active plans by default and inspects any Client Plan owned by the authenticated client" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      other_client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      other = insert(:coach)
      other_business_client = insert(:client, business: other.business, creator: other, assigned_coach: other)

      visible = insert_client_plan(coach, client, name: "Visible")
      archived = insert_client_plan(coach, client, name: "Archived", archived_at: ~U[2026-08-15 12:00:00Z])
      other_client_plan = insert_client_plan(coach, other_client, name: "Other client")
      foreign_plan = insert_client_plan(other, other_business_client, name: "Other business")
      template = insert(:plan, business: coach.business, creator: coach.user)

      ctx = client_ctx(client)
      assert {:ok, %{count: 1, plans: [listed]}} = PlanReader.list_client_plans(ctx)
      assert listed.id == visible.id
      assert {:ok, inspected} = PlanReader.get_client_plan(ctx, visible.id)
      assert inspected.id == visible.id
      assert inspected.kind == :client_plan
      assert {:ok, archived_plan} = PlanReader.get_client_plan(ctx, archived.id)
      assert archived_plan.id == archived.id
      assert archived_plan.archived_at

      for hidden_id <- [template.id, other_client_plan.id, foreign_plan.id] do
        assert {:error, :not_found} = PlanReader.get_client_plan(ctx, hidden_id)
      end
    end

    test "client-self reads require the trusted client id from Ctx" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      plan = insert_client_plan(coach, client)
      missing_client_ctx = %Easy.Ctx{business_id: coach.business_id, user_id: client.user_id}

      assert {:error, :not_found} = PlanReader.list_client_plans(missing_client_ctx)
      assert {:error, :not_found} = PlanReader.get_client_plan(missing_client_ctx, plan.id)
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
      schedule: schedule_for(pattern.id)
    }
  end

  defp schedule_for(pattern_id), do: Map.new(Menu.weekdays(), &{&1, pattern_id})

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
end
