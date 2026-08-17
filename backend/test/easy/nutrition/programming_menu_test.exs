defmodule Easy.Nutrition.ProgrammingMenuTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.{DayPattern, Library, Meal, MealItem, MealOption, Plan, Programming, WeekSchedule}
  alias Easy.Repo

  describe "replace_menu/4" do
    test "creates ordered Meals and Menu Items and resolves Library Portions" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      food =
        insert(:food,
          business: coach.business,
          creator: coach,
          calories_per_100g: 200.0,
          protein_g_per_100g: 20.0,
          carbs_g_per_100g: 30.0,
          fat_g_per_100g: 5.0,
          fiber_g_per_100g: 2.0,
          serving_sizes: [
            %{label: "1 cup", amount: 1.0, unit: "cup", weight_g: 80.0, is_default: true}
          ]
        )

      recipe =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          servings_count: 2,
          cooked_weight_g: 400.0,
          recipe_ingredients: [
            build(:recipe_ingredient,
              business: coach.business,
              food: food,
              weight_g: 200.0,
              position: 0
            )
          ]
        )

      assert {:ok, replaced} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 menu(template,
                   meals: [
                     meal_input("dinner", "Dinner", 10, [
                       recipe_item("rice", recipe.id, 20, %{kind: :serving, amount: 1})
                     ]),
                     meal_input("breakfast", "Breakfast", 0, [
                       food_item("yogurt", food.id, 0, %{kind: :gram, grams: 50}),
                       food_item("cup", food.id, 1, %{
                         kind: :serving,
                         amount: 1,
                         unit: "cup",
                         label: "1 cup"
                       })
                     ])
                   ]
                 )
               )

      assert replaced.revision == 2
      assert [breakfast, dinner] = replaced.meals
      assert breakfast.name == "Breakfast"
      assert breakfast.position == 0
      assert dinner.name == "Dinner"
      assert dinner.position == 10

      assert [yogurt, cup] = breakfast.meal_items
      assert yogurt.food_id == food.id
      assert yogurt.portion_kind == :gram
      assert yogurt.weight_g == 50.0
      assert yogurt.calories == 100.0
      assert yogurt.protein == 10.0
      assert yogurt.complete

      assert cup.food_id == food.id
      assert cup.portion_kind == :serving
      assert cup.weight_g == 80.0
      assert cup.amount == 1.0
      assert cup.unit == "cup"
      assert cup.serving_label == "1 cup"
      assert cup.calories == 160.0

      assert [%{recipe_id: recipe_id, portion_kind: :serving, amount: 1.0, weight_g: 200.0, calories: 200.0}] =
               dinner.meal_items

      assert recipe_id == recipe.id
    end

    test "keeps a stored Food serving Portion after Library serving sizes change" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      food =
        insert(:food,
          business: coach.business,
          creator: coach,
          serving_sizes: [
            %{label: "1 cup", amount: 1.0, unit: "cup", weight_g: 80.0, is_default: true}
          ]
        )

      assert {:ok, replaced} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 menu(template,
                   meals: [
                     meal_input("breakfast", "Breakfast", 0, [
                       food_item("cup", food.id, 0, %{kind: :serving, amount: 1, unit: "cup", label: "1 cup"})
                     ])
                   ]
                 )
               )

      assert [%{unit: "cup", serving_label: "1 cup", weight_g: 80.0}] = hd(replaced.meals).meal_items

      assert {:ok, _} =
               Library.update_food(ctx, food.id, food.revision, %{
                 serving_sizes: [
                   %{label: "scoop", amount: 1.0, unit: "scoop", weight_g: 30.0, is_default: true}
                 ]
               })

      assert {:ok, current} = Programming.get_template(ctx, template.id)
      assert [%{unit: "cup", serving_label: "1 cup", weight_g: 80.0}] = hd(current.meals).meal_items
    end

    test "retains persisted identities, reorders nodes, and deletes omitted Meals and Menu Items" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      food = insert(:food, business: coach.business, creator: coach)

      assert {:ok, created} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 menu(template,
                   meals: [
                     meal_input("kept", "Kept", 0, [
                       food_item("kept-item", food.id, 0, %{kind: :gram, grams: 50}),
                       food_item("omitted-item", food.id, 1, %{kind: :gram, grams: 80})
                     ]),
                     meal_input("omitted", "Omitted", 1, [])
                   ]
                 )
               )

      [kept, omitted_meal] = created.meals
      [kept_item, omitted_item] = kept.meal_items

      assert {:ok, replaced} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 2,
                 menu(created,
                   meals: [
                     persisted_meal(kept.id, "Kept revised", 5, [
                       persisted_item(kept_item.id, :food, food.id, 3, %{kind: :gram, grams: 40})
                     ])
                   ]
                 )
               )

      assert [%{id: kept_id, name: "Kept revised", position: 5}] = replaced.meals
      assert kept_id == kept.id
      assert [%{id: kept_item_id, position: 3, weight_g: 40.0}] = hd(replaced.meals).meal_items
      assert kept_item_id == kept_item.id
      assert Repo.get(Meal, omitted_meal.id) == nil
      assert Repo.get(MealItem, omitted_item.id) == nil
    end

    test "rejects a stale revision without changing the Menu" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      food = insert(:food, business: coach.business, creator: coach)

      assert {:ok, _created} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 menu(template, meals: [meal_input("breakfast", "Breakfast", 0, [])])
               )

      assert {:error, %Ecto.Changeset{action: :stale_revision, data: %Plan{revision: 2}}} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 menu(template,
                   meals: [
                     meal_input("lunch", "Lunch", 0, [
                       food_item("item", food.id, 0, %{kind: :gram, grams: 50})
                     ])
                   ]
                 )
               )

      assert {:ok, current} = Programming.get_template(ctx, template.id)
      assert current.revision == 2
      assert [%{name: "Breakfast", meal_items: []}] = current.meals
      assert Repo.aggregate(MealItem, :count, :id) == 0
    end

    test "rejects another tenant's Food or Recipe and an invalid Portion without partial writes" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      other = insert(:coach)
      hidden_food = insert(:food, business: other.business, creator: other)
      hidden_recipe = insert(:recipe, business: other.business, creator: other)
      food = insert(:food, business: coach.business, creator: coach, serving_sizes: [])

      requests = [
        menu(template,
          meals: [meal_input("one", "One", 0, [food_item("hidden", hidden_food.id, 0, %{kind: :gram, grams: 50})])]
        ),
        menu(template,
          meals: [
            meal_input("one", "One", 0, [
              recipe_item("hidden", hidden_recipe.id, 0, %{kind: :serving, amount: 1})
            ])
          ]
        ),
        menu(template,
          meals: [
            meal_input("one", "One", 0, [
              food_item("serving", food.id, 0, %{kind: :serving, amount: 1, unit: "cup", label: "1 cup"})
            ])
          ]
        )
      ]

      for attrs <- requests do
        assert {:error, reason} = Programming.replace_menu(ctx, template.id, 1, attrs)
        assert reason == :not_found or match?(%Ecto.Changeset{valid?: false}, reason)
        assert Repo.aggregate(Meal.for_plan(template.id), :count, :id) == 0
        assert Repo.get!(Plan, template.id).revision == 1
      end
    end

    test "preserves unknown nutrient fields and full calculation precision" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      food =
        insert(:food,
          business: coach.business,
          creator: coach,
          calories_per_100g: 33.333,
          protein_g_per_100g: nil,
          carbs_g_per_100g: 10.0,
          fat_g_per_100g: 1.0,
          fiber_g_per_100g: 0.0
        )

      assert {:ok, replaced} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 menu(template,
                   meals: [
                     meal_input("breakfast", "Breakfast", 0, [
                       food_item("item", food.id, 0, %{kind: :gram, grams: 50})
                     ])
                   ]
                 )
               )

      [item] = hd(replaced.meals).meal_items
      assert item.calories == 16.6665
      assert item.protein == nil
      assert item.carbohydrates == 5.0
      refute item.complete
    end

    test "resolves a Recipe gram Portion when cooked weight exists and rejects one when it does not" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      food = insert(:food, business: coach.business, creator: coach, calories_per_100g: 100.0)

      weighed =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          servings_count: 2,
          cooked_weight_g: 400.0,
          recipe_ingredients: [
            build(:recipe_ingredient, business: coach.business, food: food, weight_g: 200.0, position: 0)
          ]
        )

      unweighed =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          servings_count: 2,
          cooked_weight_g: nil,
          recipe_ingredients: [
            build(:recipe_ingredient, business: coach.business, food: food, weight_g: 200.0, position: 0)
          ]
        )

      assert {:ok, replaced} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 menu(template,
                   meals: [
                     meal_input("weighed", "Weighed", 0, [
                       recipe_item("grams", weighed.id, 0, %{kind: :gram, grams: 100})
                     ])
                   ]
                 )
               )

      assert [%{portion_kind: :gram, weight_g: 100.0}] = hd(replaced.meals).meal_items

      assert {:error, %Ecto.Changeset{valid?: false}} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 2,
                 menu(replaced,
                   meals: [
                     meal_input("unweighed", "Unweighed", 0, [
                       recipe_item("grams", unweighed.id, 0, %{kind: :gram, grams: 100})
                     ])
                   ]
                 )
               )

      assert {:ok, current} = Programming.get_template(ctx, template.id)
      assert current.revision == 2
      assert [%{name: "Weighed"}] = current.meals
    end

    test "rejects duplicate local references and does not write archived plans" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      assert {:error, %Ecto.Changeset{valid?: false}} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 menu(template, meals: [meal_input("same", "One", 0, []), meal_input("same", "Two", 1, [])])
               )

      assert {:ok, archived} = Programming.archive_template(ctx, template.id, 1)

      assert {:error, changeset} =
               Programming.replace_menu(
                 ctx,
                 archived.id,
                 2,
                 menu(archived, meals: [meal_input("one", "One", 0, [])])
               )

      assert %{archived_at: ["is read-only"]} = errors_on(changeset)
      assert Repo.aggregate(Meal.for_plan(template.id), :count, :id) == 0
    end

    test "creates, renames, reorders, and removes Day Patterns through one complete Week Schedule" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      everyday = hd(template.day_patterns)

      assert {:ok, replaced} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 %{
                   meals: [],
                   day_patterns: [
                     %{id: everyday.id, name: "Training", position: 1, slots: []},
                     %{local_ref: "rest", name: "Rest", position: 0, slots: []}
                   ],
                   schedule:
                     schedule_for(everyday.id)
                     |> Map.put(:saturday, "rest")
                     |> Map.put(:sunday, "rest")
                 }
               )

      assert [%{name: "Rest", position: 0, id: rest_id}, %{id: training_id, name: "Training", position: 1}] =
               replaced.day_patterns

      assert training_id == everyday.id
      assert rest_id != everyday.id

      assert Enum.map(replaced.week_schedule, &{&1.weekday, &1.nutrition_day_pattern_id}) == [
               {:monday, training_id},
               {:tuesday, training_id},
               {:wednesday, training_id},
               {:thursday, training_id},
               {:friday, training_id},
               {:saturday, rest_id},
               {:sunday, rest_id}
             ]

      assert {:ok, trimmed} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 2,
                 %{
                   meals: [],
                   day_patterns: [%{id: rest_id, name: "Rest", position: 0, slots: []}],
                   schedule: schedule_for(rest_id)
                 }
               )

      assert [%{id: ^rest_id, name: "Rest"}] = trimmed.day_patterns
      assert Repo.get(DayPattern, everyday.id) == nil
      assert Enum.all?(trimmed.week_schedule, &(&1.nutrition_day_pattern_id == rest_id))
    end

    test "allows empty Day Pattern slots and rejects a Menu without a Day Pattern or complete schedule" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      pattern = hd(template.day_patterns)

      assert {:ok, kept} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 menu(template, meals: [meal_input("breakfast", "Breakfast", 0, [])])
               )

      assert [%{id: pattern_id, meal_options: []}] = kept.day_patterns
      assert pattern_id == pattern.id
      assert length(kept.week_schedule) == 7

      assert {:error, %Ecto.Changeset{valid?: false}} =
               Programming.replace_menu(ctx, template.id, 2, %{
                 meals: [meal_input("lunch", "Lunch", 0, [])],
                 day_patterns: [],
                 schedule: schedule_for(pattern.id)
               })

      incomplete = Map.delete(schedule_for(pattern.id), :sunday)

      assert {:error, %Ecto.Changeset{valid?: false}} =
               Programming.replace_menu(ctx, template.id, 2, %{
                 meals: [],
                 day_patterns: [%{id: pattern.id, name: pattern.name, position: 0, slots: []}],
                 schedule: incomplete
               })

      assert {:ok, current} = Programming.get_template(ctx, template.id)
      assert current.revision == 2
      assert [%{name: "Breakfast"}] = current.meals
    end

    test "places unlimited ordered Meal Options, keeps position zero as the default, and omits dropped options" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      pattern = hd(template.day_patterns)
      food = insert(:food, business: coach.business, creator: coach)

      meals =
        for index <- 0..3 do
          meal_input("meal-#{index}", "Meal #{index}", index, [
            food_item("item-#{index}", food.id, 0, %{kind: :gram, grams: 50})
          ])
        end

      options =
        for index <- 0..3 do
          %{local_ref: "opt-#{index}", meal_local_ref: "meal-#{index}", position: index}
        end

      assert {:ok, created} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 %{
                   meals: meals,
                   day_patterns: [
                     %{
                       id: pattern.id,
                       name: pattern.name,
                       position: 0,
                       slots: [
                         %{meal_slot: :post_workout, options: [%{List.last(options) | position: 0}]},
                         %{meal_slot: :breakfast, options: Enum.take(options, 3)}
                       ]
                     }
                   ],
                   schedule: schedule_for(pattern.id)
                 }
               )

      breakfast_meal_ids = Enum.map(Enum.take(created.meals, 3), & &1.id)
      post_meal_id = List.last(created.meals).id
      [pattern] = created.day_patterns

      assert Enum.map(pattern.meal_options, &{&1.meal_slot, &1.position, &1.nutrition_meal_id}) == [
               {:breakfast, 0, Enum.at(breakfast_meal_ids, 0)},
               {:breakfast, 1, Enum.at(breakfast_meal_ids, 1)},
               {:breakfast, 2, Enum.at(breakfast_meal_ids, 2)},
               {:post_workout, 0, post_meal_id}
             ]

      [default | _rest] = Enum.filter(pattern.meal_options, &(&1.meal_slot == :breakfast))
      assert default.position == 0
      assert default.nutrition_meal_id == hd(breakfast_meal_ids)

      kept_option = hd(pattern.meal_options)

      assert {:ok, replaced} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 2,
                 %{
                   meals: Enum.map(created.meals, &persisted_meal(&1.id, &1.name, &1.position, [])),
                   day_patterns: [
                     %{
                       id: pattern.id,
                       name: pattern.name,
                       position: 0,
                       slots: [
                         %{
                           meal_slot: :breakfast,
                           options: [
                             %{id: kept_option.id, nutrition_meal_id: kept_option.nutrition_meal_id, position: 0}
                           ]
                         }
                       ]
                     }
                   ],
                   schedule: schedule_for(pattern.id)
                 }
               )

      assert [%{id: kept_id, meal_slot: :breakfast, position: 0}] = hd(replaced.day_patterns).meal_options
      assert kept_id == kept_option.id
      assert Repo.aggregate(MealOption, :count, :id) == 1
    end

    test "rejects duplicate slot Meals, unknown slots, non-contiguous option order, and Meals from another plan or tenant" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      assert {:ok, other} = Programming.create_template(ctx, %{"name" => "Other"})
      pattern = hd(template.day_patterns)
      food = insert(:food, business: coach.business, creator: coach)

      assert {:ok, other_menu} =
               Programming.replace_menu(
                 ctx,
                 other.id,
                 1,
                 menu(other, meals: [meal_input("foreign", "Foreign", 0, [])])
               )

      foreign_meal_id = hd(other_menu.meals).id
      hidden = insert(:coach)

      assert {:ok, hidden_template} = Programming.create_template(trainer_ctx(hidden), %{"name" => "Hidden"})

      assert {:ok, hidden_menu} =
               Programming.replace_menu(
                 trainer_ctx(hidden),
                 hidden_template.id,
                 1,
                 menu(hidden_template, meals: [meal_input("hidden", "Hidden", 0, [])])
               )

      hidden_meal_id = hd(hidden_menu.meals).id

      invalid = [
        %{
          meals: [meal_input("breakfast", "Breakfast", 0, [food_item("item", food.id, 0, %{kind: :gram, grams: 50})])],
          day_patterns: [
            %{
              id: pattern.id,
              name: pattern.name,
              position: 0,
              slots: [
                %{
                  meal_slot: :breakfast,
                  options: [
                    %{local_ref: "a", meal_local_ref: "breakfast", position: 0},
                    %{local_ref: "b", meal_local_ref: "breakfast", position: 1}
                  ]
                }
              ]
            }
          ],
          schedule: schedule_for(pattern.id)
        },
        %{
          meals: [meal_input("breakfast", "Breakfast", 0, [])],
          day_patterns: [
            %{
              id: pattern.id,
              name: pattern.name,
              position: 0,
              slots: [%{meal_slot: :brunch, options: [%{local_ref: "a", meal_local_ref: "breakfast", position: 0}]}]
            }
          ],
          schedule: schedule_for(pattern.id)
        },
        %{
          meals: [
            meal_input("one", "One", 0, []),
            meal_input("two", "Two", 1, [])
          ],
          day_patterns: [
            %{
              id: pattern.id,
              name: pattern.name,
              position: 0,
              slots: [
                %{
                  meal_slot: :breakfast,
                  options: [
                    %{local_ref: "a", meal_local_ref: "one", position: 0},
                    %{local_ref: "b", meal_local_ref: "two", position: 2}
                  ]
                }
              ]
            }
          ],
          schedule: schedule_for(pattern.id)
        },
        %{
          meals: [],
          day_patterns: [
            %{
              id: pattern.id,
              name: pattern.name,
              position: 0,
              slots: [
                %{
                  meal_slot: :breakfast,
                  options: [%{local_ref: "a", nutrition_meal_id: foreign_meal_id, position: 0}]
                }
              ]
            }
          ],
          schedule: schedule_for(pattern.id)
        },
        %{
          meals: [],
          day_patterns: [
            %{
              id: pattern.id,
              name: pattern.name,
              position: 0,
              slots: [
                %{
                  meal_slot: :breakfast,
                  options: [%{local_ref: "a", nutrition_meal_id: hidden_meal_id, position: 0}]
                }
              ]
            }
          ],
          schedule: schedule_for(pattern.id)
        }
      ]

      for attrs <- invalid do
        assert {:error, %Ecto.Changeset{valid?: false}} = Programming.replace_menu(ctx, template.id, 1, attrs)
        assert Repo.aggregate(MealOption, :count, :id) == 0
        assert Repo.get!(Plan, template.id).revision == 1
      end
    end
  end

  describe "duplicate_template/3" do
    test "copies Meals, Menu Items, Meal Options, and the Week Schedule onto the new Template" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      pattern = hd(template.day_patterns)
      food = insert(:food, business: coach.business, creator: coach)

      assert {:ok, source} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 %{
                   meals: [
                     meal_input("breakfast", "Breakfast", 0, [
                       food_item("yogurt", food.id, 0, %{kind: :gram, grams: 50})
                     ])
                   ],
                   day_patterns: [
                     %{
                       id: pattern.id,
                       name: pattern.name,
                       position: 0,
                       slots: [
                         %{
                           meal_slot: :breakfast,
                           options: [%{local_ref: "opt", meal_local_ref: "breakfast", position: 0}]
                         }
                       ]
                     }
                   ],
                   schedule: schedule_for(pattern.id)
                 }
               )

      assert {:ok, copy} = Programming.duplicate_template(ctx, source.id, 2)
      assert [%{name: "Breakfast", id: copy_meal_id, meal_items: [item]}] = copy.meals
      assert copy_meal_id != hd(source.meals).id
      assert item.food_id == food.id
      assert item.weight_g == 50.0
      assert item.id != hd(hd(source.meals).meal_items).id
      assert [%{id: copy_pattern_id, meal_options: [option]}] = copy.day_patterns
      assert copy_pattern_id != hd(source.day_patterns).id
      assert option.nutrition_meal_id == copy_meal_id
      assert option.meal_slot == :breakfast
      assert option.position == 0
      assert option.id != hd(hd(source.day_patterns).meal_options).id
      assert Enum.all?(copy.week_schedule, &(&1.nutrition_day_pattern_id == copy_pattern_id))
    end
  end

  defp menu(plan, opts) do
    pattern = hd(plan.day_patterns)

    %{
      meals: Keyword.fetch!(opts, :meals),
      day_patterns: [
        %{id: pattern.id, name: pattern.name, position: pattern.position, slots: []}
      ],
      schedule: schedule_for(pattern.id)
    }
  end

  defp schedule_for(pattern_id) do
    Map.new(WeekSchedule.weekdays(), &{&1, pattern_id})
  end

  defp meal_input(ref, name, position, meal_items) do
    %{local_ref: ref, name: name, position: position, meal_items: meal_items}
  end

  defp persisted_meal(id, name, position, meal_items) do
    %{id: id, name: name, position: position, meal_items: meal_items}
  end

  defp food_item(ref, food_id, position, portion) do
    %{local_ref: ref, kind: :food, food_id: food_id, position: position, portion: portion}
  end

  defp recipe_item(ref, recipe_id, position, portion) do
    %{local_ref: ref, kind: :recipe, recipe_id: recipe_id, position: position, portion: portion}
  end

  defp persisted_item(id, kind, source_id, position, portion) do
    base = %{id: id, kind: kind, position: position, portion: portion}

    case kind do
      :food -> Map.put(base, :food_id, source_id)
      :recipe -> Map.put(base, :recipe_id, source_id)
    end
  end
end
