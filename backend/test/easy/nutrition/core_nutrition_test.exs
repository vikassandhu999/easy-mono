defmodule Easy.Nutrition.CoreNutritionTest do
  use Easy.DataCase, async: true
  alias Easy.Ctx
  alias Easy.Nutrition.{Content, Diary, DiaryEntry, Library, Nutrients}
  alias Easy.Plans.{Programming, Reader}

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC")
    ctx = trainer_ctx(coach)

    {:ok, food} =
      Library.create_food(ctx, %{
        name: "Oats",
        nutrients: %{"energy_kcal" => 100, "protein_g" => 10},
        servings: [%{"id" => "bowl", "label" => "Bowl", "grams" => 50}]
      })

    %{
      ctx: ctx,
      coach: coach,
      client: client,
      client_ctx: %Ctx{business_id: coach.business_id, client_id: client.id, user_id: client.user_id},
      food: food,
      today: Date.utc_today()
    }
  end

  defp document(food) do
    pattern = Ecto.UUID.generate()
    meal = Ecto.UUID.generate()

    %{
      targets: %{energy_kcal: %{min: 1800, max: 2200}},
      meals: [
        %{
          id: meal,
          name: "Breakfast",
          items: [
            %{
              id: Ecto.UUID.generate(),
              source: %{type: :food, id: food.id},
              portion: %{type: :serving, serving_id: "bowl", amount: 1}
            }
          ]
        }
      ],
      day_patterns: [
        %{
          id: pattern,
          name: "Training day",
          slots: [
            %{id: Ecto.UUID.generate(), name: "After waking", meal_ids: [meal]},
            %{id: Ecto.UUID.generate(), name: "Later", meal_ids: [meal]}
          ]
        }
      ],
      schedule: %{cycle_weeks: 1, entries: Enum.map(0..6, &%{id: Ecto.UUID.generate(), day: &1, ref: pattern})}
    }
  end

  defp plan(f) do
    assert {:ok, template} = Programming.create_template(f.ctx, :nutrition, %{name: "Menu", content: document(f.food)})

    assert {:ok, plan} =
             Programming.assign_template_to_client(f.ctx, f.client.id, :nutrition, template.id, %{start_date: f.today})

    plan
  end

  defp draft(plan) do
    meal = hd(plan.content["meals"])
    item = hd(meal["items"])
    slot = hd(hd(plan.content["day_patterns"])["slots"])

    %{
      id: Ecto.UUID.generate(),
      expected_revision: 0,
      request_id: Ecto.UUID.generate(),
      plan_revision_id: plan.current_revision.id,
      slot_id: slot["id"],
      name: slot["name"],
      chosen_meal_id: meal["id"],
      entries: [
        %{
          id: Ecto.UUID.generate(),
          request_id: Ecto.UUID.generate(),
          planned_item_id: item["id"],
          source: item["source"],
          portion: item["portion"]
        }
      ]
    }
  end

  test "unknown is absent, explicit zero survives, invalid nutrients and servings fail", f do
    assert f.food.nutrients == %{"energy_kcal" => 100, "protein_g" => 10}
    assert {:ok, zero} = Library.update_food(f.ctx, f.food.id, 1, %{nutrients: %{"fiber_g" => 0}})
    assert zero.nutrients == %{"fiber_g" => 0}
    assert {:error, %Ecto.Changeset{}} = Library.create_food(f.ctx, %{name: "invalid", nutrients: %{"fiber_g" => nil}})

    assert {:error, %Ecto.Changeset{}} =
             Library.create_food(f.ctx, %{name: "invalid", servings: [%{"id" => "x", "label" => "Cup", "grams" => 0}]})

    assert Nutrients.totals([%{"fiber_g" => 0}, %{}])["fiber_g"] == %{value: nil, known_entries: 1, total_entries: 2}
  end

  test "published and assignment copies survive food edits; republish refreshes", f do
    p = plan(f)
    assert hd(hd(p.content["meals"])["items"])["nutrients"] == %{"energy_kcal" => 50.0, "protein_g" => 5.0}
    assert {:ok, _} = Library.update_food(f.ctx, f.food.id, 1, %{nutrients: %{"energy_kcal" => 300}})
    assert {:ok, same} = Reader.get_plan(f.ctx, :nutrition, p.id)
    assert same.content == p.content
    assert {:ok, revised} = Programming.update_plan(f.ctx, :nutrition, p.id, p.revision, %{content: p.content})
    assert hd(hd(revised.content["meals"])["items"])["nutrients"]["energy_kcal"] == 150.0
  end

  test "meal save journals additions changes removals and replay does not bump sequence", f do
    p = plan(f)
    d = draft(p)
    assert {:ok, day} = Diary.save_client_nutrition_day(f.client_ctx, f.today, %{meals: [d]})
    assert day.counts == %{expected: 2, recorded: 1}
    assert Enum.at(day.slots, 1).status == :not_recorded
    assert day.totals["energy_kcal"].value == 50.0
    assert day.totals["fiber_g"] == %{value: nil, known_entries: 0, total_entries: 1}
    assert {:ok, _} = Diary.save_client_nutrition_day(f.client_ctx, f.today, %{meals: [d]})
    assert Repo.get!(Easy.Clients.Client, f.client.id).last_change_seq == 1
    [e] = d.entries

    edited = %{
      d
      | expected_revision: 1,
        request_id: Ecto.UUID.generate(),
        entries: [%{e | portion: %{"type" => "grams", "grams" => 100}}]
    }

    assert {:ok, day} = Diary.save_client_nutrition_day(f.client_ctx, f.today, %{meals: [edited]})
    assert day.totals["energy_kcal"].value == 100.0

    assert {:ok, _} =
             Diary.save_client_nutrition_day(f.client_ctx, f.today, %{
               meals: [%{edited | expected_revision: 2, request_id: Ecto.UUID.generate(), entries: []}]
             })

    assert Repo.get!(DiaryEntry, e.id).deleted_at

    assert Repo.query!("SELECT action FROM record_changes WHERE row_id=$1 ORDER BY seq", [Ecto.UUID.dump!(e.id)]).rows ==
             [["added"], ["changed"], ["removed"]]

    assert Repo.query!("SELECT kind FROM records WHERE id=$1", [Ecto.UUID.dump!(d.id)]).rows == [["meal"]]

    assert Repo.query!("SELECT DISTINCT changed_by_id FROM record_changes WHERE client_id=$1", [
             Ecto.UUID.dump!(f.client.id)
           ]).rows == [[Ecto.UUID.dump!(f.client.id)]]
  end

  test "quick add is foodless and unknown totals expose counts", f do
    p = plan(f)
    d = draft(p)

    quick = %{
      id: Ecto.UUID.generate(),
      request_id: Ecto.UUID.generate(),
      planned_item_id: nil,
      source: nil,
      portion: nil,
      name: "Quick add",
      nutrients: %{"energy_kcal" => 80}
    }

    assert {:ok, day} =
             Diary.save_client_nutrition_day(f.client_ctx, f.today, %{meals: [%{d | entries: d.entries ++ [quick]}]})

    assert day.totals["energy_kcal"].value == 130.0
    assert day.totals["protein_g"] == %{value: nil, known_entries: 1, total_entries: 2}
    assert Repo.get!(DiaryEntry, quick.id).source == nil
  end

  test "same-source planned amount uses copied density and saved corrections retain eaten values", f do
    p = plan(f)
    d = draft(p)

    assert {:ok, _} =
             Library.update_food(f.ctx, f.food.id, 1, %{
               nutrients: %{"energy_kcal" => 900},
               servings: [%{"id" => "bowl", "label" => "Bowl", "grams" => 200}]
             })

    [e] = d.entries
    d = %{d | entries: [%{e | portion: %{"type" => "serving", "serving_id" => "bowl", "amount" => 2}}]}
    assert {:ok, day} = Diary.save_client_nutrition_day(f.client_ctx, f.today, %{meals: [d]})
    assert day.totals["energy_kcal"].value == 100.0
    [e] = d.entries

    assert {:ok, day} =
             Diary.save_client_nutrition_day(f.client_ctx, f.today, %{
               meals: [
                 %{
                   d
                   | expected_revision: 1,
                     request_id: Ecto.UUID.generate(),
                     entries: [Map.put(e, :notes, "Correction")]
                 }
               ]
             })

    assert day.totals["energy_kcal"].value == 100.0
  end

  test "end of day target chooses latest revision and marks immediate target change", f do
    p = plan(f)
    assert {:ok, %{nutrition_days: [before]}} = Diary.list_client_nutrition_days(f.client_ctx, date: f.today)
    refute before.target_changed
    content = put_in(p.content, ["day_patterns", Access.at(0), "targets"], %{"energy_kcal" => %{"min" => 2500}})
    assert {:ok, changed} = Programming.update_plan(f.ctx, :nutrition, p.id, p.revision, %{content: content})
    assert {:ok, %{nutrition_days: [day]}} = Diary.list_client_nutrition_days(f.client_ctx, date: f.today)
    assert day.targets == %{"energy_kcal" => %{"min" => 2500}}
    assert day.plan_revision_id == changed.current_revision.id
    assert day.target_changed

    assert {:ok, _} =
             Programming.update_plan(f.ctx, :nutrition, p.id, changed.revision, %{
               content: p.content,
               effective_on: Date.add(f.today, 1)
             })

    assert {:ok, %{nutrition_days: [tomorrow]}} =
             Diary.list_client_nutrition_days(f.client_ctx, date: Date.add(f.today, 1))

    refute tomorrow.target_changed
  end

  test "expected meals follows shared coverage and E6", f do
    p = plan(f)

    query = fn date ->
      Repo.query!("SELECT slot_name FROM expected_meals($1,$2,$2)", [[Ecto.UUID.dump!(f.client.id)], date]).rows
    end

    assert query.(f.today) == [["After waking"], ["Later"]]
    assert query.(Date.add(f.today, -1)) == []

    Repo.update_all(from(t in Easy.CoachingTerms.CoachingTerm, where: t.client_id == ^f.client.id),
      set: [ends_on: f.today]
    )

    insert(:coaching_term, client: f.client, starts_on: Date.add(f.today, 2))
    assert query.(Date.add(f.today, 2)) == []
    assert p.current_revision.number == 1
  end

  test "food metrics report actual amounts and known nutrients", f do
    d = draft(plan(f))
    assert {:ok, _} = Diary.save_client_nutrition_day(f.client_ctx, f.today, %{meals: [d]})
    assert {:ok, [metric]} = Diary.food_metrics_for_client(f.ctx, f.client.id, from: f.today, to: f.today)
    assert metric.food_id == f.food.id
    assert metric.entries_count == 1
    assert metric.days_count == 1
    assert metric.average_grams == 50.0
    assert metric.nutrients["fiber_g"].value == nil
  end

  test "recipes embed ingredients and derive yield; archives preserve references", f do
    assert {:ok, recipe} =
             Library.create_recipe(f.ctx, %{
               name: "Porridge",
               servings_count: 2,
               cooked_weight_g: 200,
               ingredients: [%{"food_id" => f.food.id, "portion" => %{"type" => "grams", "grams" => 100}}]
             })

    assert recipe.nutrients["energy_kcal"] == 50.0

    assert {:ok, item} =
             Library.resolve(f.ctx, %{"type" => "recipe", "id" => recipe.id}, %{
               "type" => "serving",
               "serving_id" => "serving",
               "amount" => 1
             })

    assert item["grams"] == 100.0
    assert item["nutrients"]["energy_kcal"] == 50.0
    assert {:ok, archived} = Library.delete_food(f.ctx, f.food.id)
    assert archived.archived_at
    assert {:ok, %{foods: []}} = Library.list_foods(f.ctx)
    assert {:ok, _} = Library.get_recipe(f.ctx, recipe.id)
  end

  test "tenant isolation for library, plans, days, metrics and writes", f do
    p = plan(f)
    other = trainer_ctx(insert(:coach))
    assert {:error, :not_found} = Library.get_food(other, f.food.id)
    assert {:error, :not_found} = Library.update_food(other, f.food.id, 1, %{name: "Wrong"})
    assert {:error, :not_found} = Library.delete_food(other, f.food.id)
    assert {:error, :not_found} = Reader.get_plan(other, :nutrition, p.id)
    assert {:error, :not_found} = Diary.list_nutrition_days_for_client(other, f.client.id)
    assert {:error, :not_found} = Diary.food_metrics_for_client(other, f.client.id, [])
    assert {:error, :not_found} = Diary.save_client_nutrition_day(f.ctx, f.today, %{meals: [draft(p)]})
    assert {:ok, %{foods: []}} = Library.list_foods(other)
  end

  test "content rejects missing weekday duplicate ids invalid bounds", f do
    c = document(f.food)
    assert {:error, _} = Content.validate(f.ctx, put_in(c.schedule.entries, []))
    assert {:error, _} = Content.validate(f.ctx, %{c | targets: %{energy_kcal: %{min: 10, max: 5}}})
  end

  test "unchanged meal save does not change the record or sequence", f do
    d = draft(plan(f))
    assert {:ok, _} = Diary.save_client_nutrition_day(f.client_ctx, f.today, %{meals: [d]})

    assert {:ok, day} =
             Diary.save_client_nutrition_day(f.client_ctx, f.today, %{
               meals: [%{d | expected_revision: 1, request_id: Ecto.UUID.generate()}]
             })

    assert hd(day.slots).meal.revision == 1
    assert Repo.get!(Easy.Clients.Client, f.client.id).last_change_seq == 1
  end

  test "recipe food metrics keep original ingredient contributions after recipe and food edits", f do
    assert {:ok, recipe} =
             Library.create_recipe(f.ctx, %{
               name: "Porridge",
               servings_count: 2,
               cooked_weight_g: 200,
               ingredients: [%{"food_id" => f.food.id, "portion" => %{"type" => "grams", "grams" => 100}}]
             })

    entry = %{
      id: Ecto.UUID.generate(),
      request_id: Ecto.UUID.generate(),
      planned_item_id: nil,
      source: %{type: :recipe, id: recipe.id},
      portion: %{type: :serving, serving_id: "serving", amount: 1}
    }

    meal = %{
      id: Ecto.UUID.generate(),
      request_id: Ecto.UUID.generate(),
      expected_revision: 0,
      name: "Porridge",
      plan_revision_id: nil,
      slot_id: nil,
      chosen_meal_id: nil,
      entries: [entry]
    }

    assert {:ok, _} = Diary.save_client_nutrition_day(f.client_ctx, f.today, %{meals: [meal]})
    assert {:ok, _} = Library.update_recipe(f.ctx, recipe.id, recipe.revision, %{ingredients: []})
    assert {:ok, _} = Library.update_food(f.ctx, f.food.id, f.food.revision, %{nutrients: %{"energy_kcal" => 999}})
    assert {:ok, [metric]} = Diary.food_metrics_for_client(f.ctx, f.client.id, from: f.today, to: f.today)
    assert metric.average_grams == 50.0
    assert metric.nutrients["energy_kcal"].value == 50.0
  end

  test "recorded slot keeps its prescription after a same-day publication", f do
    p = plan(f)
    d = draft(p)
    assert {:ok, _} = Diary.save_client_nutrition_day(f.client_ctx, f.today, %{meals: [d]})
    assert {:ok, _} = Library.update_food(f.ctx, f.food.id, 1, %{nutrients: %{"energy_kcal" => 900}})
    replacement = Ecto.UUID.generate()
    content = p.content |> put_in(["meals", Access.at(0), "id"], replacement)

    content =
      update_in(
        content,
        ["day_patterns", Access.at(0), "slots"],
        &Enum.map(&1, fn slot -> Map.put(slot, "meal_ids", [replacement]) end)
      )

    assert {:ok, _} = Programming.update_plan(f.ctx, :nutrition, p.id, p.revision, %{content: content})
    assert {:ok, %{nutrition_days: [day]}} = Diary.list_client_nutrition_days(f.client_ctx, date: f.today)
    recorded = hd(day.slots)
    assert recorded.plan_revision_id == p.current_revision.id
    assert hd(hd(recorded.options)["items"])["nutrients"]["energy_kcal"] == 50.0
    assert day.plan_revision_number == 2
    refute day.target_changed
  end

  test "empty recipe drafts cannot be prescribed until they have a positive yield", f do
    assert {:ok, recipe} = Library.create_recipe(f.ctx, %{name: "Draft recipe", servings_count: 1, ingredients: []})

    assert {:error, :invalid_portion} =
             Library.resolve(f.ctx, %{"type" => "recipe", "id" => recipe.id}, %{
               "type" => "serving",
               "serving_id" => "serving",
               "amount" => 1
             })
  end

  test "slot names must be unique in a day pattern", f do
    c = document(f.food)

    c =
      update_in(c.day_patterns, fn [pattern] -> [%{pattern | slots: Enum.map(pattern.slots, &%{&1 | name: "Same"})}] end)

    assert {:error, _} = Content.validate(f.ctx, c)
  end

  test "library usage pages include templates client plans and embedded recipe ingredients", f do
    plan(f)

    assert {:ok, _} =
             Library.create_recipe(f.ctx, %{
               name: "Uses oats",
               servings_count: 1,
               ingredients: [%{"food_id" => f.food.id, "portion" => %{"type" => "grams", "grams" => 100}}]
             })

    assert {:ok, page} = Library.list_food_usage(f.ctx, f.food.id, limit: 1)
    assert page.counts == %{recipes: 1, templates: 1, client_plans: 1}
    assert page.count == 3
    assert page.next_cursor
    assert {:ok, second} = Library.list_food_usage(f.ctx, f.food.id, limit: 1, cursor: page.next_cursor)
    assert hd(second.data).id != hd(page.data).id
    assert {:ok, impact} = Library.get_food_impact(f.ctx, f.food.id)
    assert length(impact.recipes) == 1
    assert length(impact.templates) == 1
    assert length(impact.client_plans) == 1
  end

  test "slot names are trimmed before uniqueness checks and publication", f do
    c = document(f.food)

    c =
      update_in(c.day_patterns, fn [pattern] ->
        [first, second] = pattern.slots
        [%{pattern | slots: [%{first | name: "Snack"}, %{second | name: " Snack "}]}]
      end)

    assert {:error, _} = Content.validate(f.ctx, c)

    c =
      update_in(c.day_patterns, fn [pattern] ->
        [first, second] = pattern.slots
        [%{pattern | slots: [%{first | name: " Breakfast "}, second]}]
      end)

    assert {:ok, value} = Content.validate(f.ctx, c)
    assert hd(hd(value["day_patterns"])["slots"])["name"] == "Breakfast"
    invalid = update_in(c.day_patterns, fn [pattern] -> [%{pattern | slots: [%{hd(pattern.slots) | name: 1}]}] end)
    assert {:error, _} = Content.validate(f.ctx, invalid)
  end
end
