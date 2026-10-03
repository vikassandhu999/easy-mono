defmodule Easy.Nutrition.ProgrammingReadErrorsTest do
  use Easy.DataCase, async: true

  import Easy.Nutrition.ProgrammingMenuFixtures

  alias Easy.Ctx
  alias Easy.Nutrition.{Menu, Plan, PlanReader, Programming}

  test "hidden client plans are rejected before resolving invalid stored portions" do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach)
    other_trainer = insert(:coach, business: coach.business)
    food = insert(:food, business: coach.business, creator: coach, serving_sizes: [])
    ctx = trainer_ctx(coach)
    {:ok, template} = Programming.create_template(ctx, %{name: "Private plan"})
    {:ok, assigned} = Programming.assign_template_to_client(ctx, client.id, template.id, %{})

    item = food_item("item", food.id, %{kind: :serving, amount: 1, unit: "cup", label: nil})
    {:ok, invalid_portion_menu} = Menu.cast(menu(assigned, meals: [meal_input("meal", "Meal", [item])]))
    assigned |> Plan.menu_changeset(invalid_portion_menu) |> Repo.update!()

    assert {:error, :invalid_portion} = PlanReader.get_plan(ctx, assigned.id)
    assert {:error, :not_found} = PlanReader.get_plan(trainer_ctx(other_trainer), assigned.id)
  end

  test "missing menu sources propagate through template, client-plan, and coverage reads" do
    coach = insert(:coach)
    ctx = trainer_ctx(coach)
    client = insert(:client, business: coach.business, coach: coach)
    today = Date.utc_today()
    {:ok, template} = Programming.create_template(ctx, %{name: "Stored template"})

    {:ok, assigned} =
      Programming.assign_template_to_client(ctx, client.id, template.id, %{start_date: Date.add(today, -1)})

    item = food_item("item", Ecto.UUID.generate(), %{kind: :gram, grams: 100})
    attrs = menu(template, meals: [meal_input("meal", "Meal", [item])])
    {:ok, missing_source_menu} = Menu.cast(attrs)

    for plan <- [template, assigned] do
      plan |> Plan.menu_changeset(missing_source_menu) |> Repo.update!()
    end

    client_ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}

    for result <- [
          PlanReader.get_template(ctx, template.id),
          PlanReader.list_templates(ctx),
          PlanReader.get_plan(ctx, assigned.id),
          PlanReader.get_client_plan(client_ctx, assigned.id),
          PlanReader.list_client_plans(client_ctx),
          PlanReader.get_coverage_for_client(ctx, client.id),
          PlanReader.resolve_client_coverage(client_ctx, today),
          PlanReader.resolve_coverage_for_client(ctx, client.id, today)
        ] do
      assert result == {:error, :not_found}
    end
  end
end
