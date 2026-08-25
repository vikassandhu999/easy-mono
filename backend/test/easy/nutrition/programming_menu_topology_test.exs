defmodule Easy.Nutrition.ProgrammingMenuTopologyTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.{
    DayPattern,
    Meal,
    MealItem,
    MealOption,
    Plan,
    Programming
  }

  alias Easy.Repo

  import Easy.Nutrition.ProgrammingMenuFixtures

  describe "replace_menu/4" do
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
      assert Repo.aggregate(MealItem.for_plan(template.id), :count, :id) == 0
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
                 menu(template,
                   meals: [meal_input("same", "One", 0, []), meal_input("same", "Two", 1, [])]
                 )
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

      assert [
               %{name: "Rest", position: 0, id: rest_id},
               %{id: training_id, name: "Training", position: 1}
             ] =
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

    test "deletes omitted Day Patterns before reusing their positions" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      everyday = hd(template.day_patterns)

      assert {:ok, created} =
               Programming.replace_menu(ctx, template.id, 1, %{
                 meals: [],
                 day_patterns: [
                   %{id: everyday.id, name: "Everyday", position: 0, slots: []},
                   %{local_ref: "rest", name: "Rest", position: 1, slots: []}
                 ],
                 schedule: schedule_for(everyday.id)
               })

      rest = Enum.find(created.day_patterns, &(&1.name == "Rest"))

      assert {:ok, replaced} =
               Programming.replace_menu(ctx, template.id, 2, %{
                 meals: [],
                 day_patterns: [%{id: rest.id, name: "Rest", position: 0, slots: []}],
                 schedule: schedule_for(rest.id)
               })

      assert [%{id: rest_id, position: 0}] = replaced.day_patterns
      assert rest_id == rest.id
      assert Repo.get(DayPattern, everyday.id) == nil
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
                         %{
                           meal_slot: :post_workout,
                           options: [%{List.last(options) | position: 0}]
                         },
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

      assert Enum.map(pattern.meal_options, &{&1.meal_slot, &1.position, &1.nutrition_meal_id}) ==
               [
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
                             %{
                               id: kept_option.id,
                               nutrition_meal_id: kept_option.nutrition_meal_id,
                               position: 0
                             }
                           ]
                         }
                       ]
                     }
                   ],
                   schedule: schedule_for(pattern.id)
                 }
               )

      assert [%{id: kept_id, meal_slot: :breakfast, position: 0}] =
               hd(replaced.day_patterns).meal_options

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

      assert {:ok, hidden_template} =
               Programming.create_template(trainer_ctx(hidden), %{"name" => "Hidden"})

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
          meals: [
            meal_input("breakfast", "Breakfast", 0, [
              food_item("item", food.id, 0, %{kind: :gram, grams: 50})
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
              slots: [
                %{
                  meal_slot: :brunch,
                  options: [%{local_ref: "a", meal_local_ref: "breakfast", position: 0}]
                }
              ]
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
        assert {:error, %Ecto.Changeset{valid?: false}} =
                 Programming.replace_menu(ctx, template.id, 1, attrs)

        assert Repo.aggregate(MealOption, :count, :id) == 0
        assert Repo.get!(Plan, template.id).revision == 1
      end
    end
  end
end
