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
    test "collisions for every node type roll back without modifying another plan or tenant" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      food = insert(:food, business: coach.business, creator: coach)
      {:ok, target} = Programming.create_template(ctx, %{name: "Target"})
      target_day = hd(target.day_patterns)
      target_meal = meal_input("target", "Target meal", [food_item("target-item", food.id, %{kind: :gram, grams: 50})])

      valid = %{
        meals: [target_meal],
        day_patterns: [%{id: target_day.id, name: "Everyday", slots: [%{meal_slot: :breakfast, options: [%{id: uuid("target-option"), nutrition_meal_id: target_meal.id}]}]}],
        schedule: schedule_for(target_day.id)
      }

      for owner <- [coach, insert(:coach)] do
        source_ctx = trainer_ctx(owner)
        {:ok, source} = Programming.create_template(source_ctx, %{name: "Source"})
        source_food = insert(:food, business: owner.business, creator: owner)
        source_day = hd(source.day_patterns)
        source_meal = meal_input(owner.id, "Source meal", [food_item("#{owner.id}-item", source_food.id, %{kind: :gram, grams: 50})])
        source_option = uuid("#{owner.id}-option")

        {:ok, source} =
          Programming.replace_menu(source_ctx, source.id, 1, %{
            meals: [source_meal],
            day_patterns: [%{id: source_day.id, name: "Everyday", slots: [%{meal_slot: :breakfast, options: [%{id: source_option, nutrition_meal_id: source_meal.id}]}]}],
            schedule: schedule_for(source_day.id)
          })

        {:ok, source} = Programming.get_template(source_ctx, source.id)

        meal_collision =
          valid
          |> put_in([:meals, Access.at(0), :id], source_meal.id)
          |> put_in([:day_patterns, Access.at(0), :slots, Access.at(0), :options, Access.at(0), :nutrition_meal_id], source_meal.id)

        item_collision = put_in(valid, [:meals, Access.at(0), :meal_items, Access.at(0), :id], hd(source_meal.meal_items).id)

        day_collision =
          valid
          |> put_in([:day_patterns, Access.at(0), :id], source_day.id)
          |> Map.put(:schedule, schedule_for(source_day.id))

        option_collision = put_in(valid, [:day_patterns, Access.at(0), :slots, Access.at(0), :options, Access.at(0), :id], source_option)

        for invalid <- [meal_collision, item_collision, day_collision, option_collision] do
          assert {:error, %Ecto.Changeset{valid?: false}} = Programming.replace_menu(ctx, target.id, 1, invalid)
          assert {:ok, unchanged} = Programming.get_template(ctx, target.id)
          assert unchanged.revision == 1
          assert unchanged.meals == []
          assert [%{id: target_day_id, meal_options: []}] = unchanged.day_patterns
          assert target_day_id == target_day.id
          assert {:ok, ^source} = Programming.get_template(source_ctx, source.id)
        end
      end
    end

    test "array reordering retains identities and shared meal references across a reload" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      {:ok, plan} = Programming.create_template(ctx, %{name: "Weekly menu"})
      food = insert(:food, business: coach.business, creator: coach)
      a = meal_input("a", "A", [food_item("a1", food.id, %{kind: :gram, grams: 50}), food_item("a2", food.id, %{kind: :gram, grams: 75})])
      b = meal_input("b", "B", [])
      day = hd(plan.day_patterns)
      rest = uuid("rest")

      input = %{
        meals: [a, b],
        day_patterns: [
          %{
            id: day.id,
            name: "Training",
            slots: [
              %{
                meal_slot: :breakfast,
                options: [
                  %{id: uuid("first"), nutrition_meal_id: a.id},
                  %{id: uuid("second"), nutrition_meal_id: b.id}
                ]
              }
            ]
          },
          %{id: rest, name: "Rest", slots: [%{meal_slot: :lunch, options: [%{id: uuid("reuse"), nutrition_meal_id: a.id}]}]}
        ],
        schedule: schedule_for(day.id) |> Map.put(:sunday, rest)
      }

      assert {:ok, _saved} = Programming.replace_menu(ctx, plan.id, 1, input)
      [training, rest_day] = input.day_patterns
      [slot] = training.slots

      reordered = %{
        input
        | meals: [b, %{a | meal_items: Enum.reverse(a.meal_items)}],
          day_patterns: [rest_day, %{training | slots: [%{slot | options: Enum.reverse(slot.options)}]}]
      }

      assert {:ok, _saved} = Programming.replace_menu(ctx, plan.id, 2, reordered)
      assert {:ok, loaded} = Programming.get_template(ctx, plan.id)
      assert Enum.map(loaded.meals, &{&1.id, &1.position}) == [{b.id, 0}, {a.id, 1}]
      assert Enum.map(List.last(loaded.meals).meal_items, &{&1.id, &1.position}) == [{uuid("a2"), 0}, {uuid("a1"), 1}]
      assert Enum.map(loaded.day_patterns, &{&1.id, &1.position}) == [{rest, 0}, {day.id, 1}]

      assert Enum.map(List.last(loaded.day_patterns).meal_options, &{&1.id, &1.nutrition_meal_id, &1.position}) == [
               {uuid("second"), b.id, 0},
               {uuid("first"), a.id, 1}
             ]

      assert hd(hd(loaded.day_patterns).meal_options).nutrition_meal_id == a.id
      assert Enum.find(loaded.week_schedule, &(&1.weekday == :sunday)).nutrition_day_pattern_id == rest
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
                     meal_input("kept", "Kept", [
                       food_item("kept-item", food.id, %{kind: :gram, grams: 50}),
                       food_item("omitted-item", food.id, %{kind: :gram, grams: 80})
                     ]),
                     meal_input("omitted", "Omitted", [])
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
                     persisted_meal(kept.id, "Kept revised", [
                       persisted_item(kept_item.id, :food, food.id, %{kind: :gram, grams: 40})
                     ])
                   ]
                 )
               )

      assert [%{id: kept_id, name: "Kept revised", position: 0}] = replaced.meals
      assert kept_id == kept.id
      assert [%{id: kept_item_id, position: 0, weight_g: 40.0}] = hd(replaced.meals).meal_items
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
                 menu(template, meals: [meal_input("breakfast", "Breakfast", [])])
               )

      assert {:error, %Ecto.Changeset{action: :stale_revision, data: %Plan{revision: 2}}} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 menu(template,
                   meals: [
                     meal_input("lunch", "Lunch", [
                       food_item("item", food.id, %{kind: :gram, grams: 50})
                     ])
                   ]
                 )
               )

      assert {:ok, current} = Programming.get_template(ctx, template.id)
      assert current.revision == 2
      assert [%{name: "Breakfast", meal_items: []}] = current.meals
      assert Repo.aggregate(MealItem.for_plan(template.id), :count, :id) == 0
    end

    test "rejects duplicate node IDs and does not write archived plans" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      assert {:error, %Ecto.Changeset{valid?: false}} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 menu(template,
                   meals: [meal_input("same", "One", []), meal_input("same", "Two", [])]
                 )
               )

      assert {:ok, archived} = Programming.archive_template(ctx, template.id, 1)

      assert {:error, changeset} =
               Programming.replace_menu(
                 ctx,
                 archived.id,
                 2,
                 menu(archived, meals: [meal_input("one", "One", [])])
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
                     %{id: uuid("rest"), name: "Rest", slots: []},
                     %{id: everyday.id, name: "Training", slots: []}
                   ],
                   schedule:
                     schedule_for(everyday.id)
                     |> Map.put(:saturday, uuid("rest"))
                     |> Map.put(:sunday, uuid("rest"))
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
                   day_patterns: [%{id: rest_id, name: "Rest", slots: []}],
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
                   %{id: everyday.id, name: "Everyday", slots: []},
                   %{id: uuid("rest"), name: "Rest", slots: []}
                 ],
                 schedule: schedule_for(everyday.id)
               })

      rest = Enum.find(created.day_patterns, &(&1.name == "Rest"))

      assert {:ok, replaced} =
               Programming.replace_menu(ctx, template.id, 2, %{
                 meals: [],
                 day_patterns: [%{id: rest.id, name: "Rest", slots: []}],
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
                 menu(template, meals: [meal_input("breakfast", "Breakfast", [])])
               )

      assert [%{id: pattern_id, meal_options: []}] = kept.day_patterns
      assert pattern_id == pattern.id
      assert length(kept.week_schedule) == 7

      assert {:error, %Ecto.Changeset{valid?: false}} =
               Programming.replace_menu(ctx, template.id, 2, %{
                 meals: [meal_input("lunch", "Lunch", [])],
                 day_patterns: [],
                 schedule: schedule_for(pattern.id)
               })

      incomplete = Map.delete(schedule_for(pattern.id), :sunday)

      assert {:error, %Ecto.Changeset{valid?: false}} =
               Programming.replace_menu(ctx, template.id, 2, %{
                 meals: [],
                 day_patterns: [%{id: pattern.id, name: pattern.name, slots: []}],
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
          meal_input("meal-#{index}", "Meal #{index}", [
            food_item("item-#{index}", food.id, %{kind: :gram, grams: 50})
          ])
        end

      options =
        for index <- 0..3 do
          %{id: uuid("opt-#{index}"), nutrition_meal_id: uuid("meal-#{index}")}
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
                       slots: [
                         %{
                           meal_slot: :post_workout,
                           options: [List.last(options)]
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
                   meals: Enum.map(created.meals, &persisted_meal(&1.id, &1.name, [])),
                   day_patterns: [
                     %{
                       id: pattern.id,
                       name: pattern.name,
                       slots: [
                         %{
                           meal_slot: :breakfast,
                           options: [
                             %{
                               id: kept_option.id,
                               nutrition_meal_id: kept_option.nutrition_meal_id
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

    test "rejects duplicate slot Meals, unknown slots, and Meals from another plan or tenant" do
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
                 menu(other, meals: [meal_input("foreign", "Foreign", [])])
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
                 menu(hidden_template, meals: [meal_input("hidden", "Hidden", [])])
               )

      hidden_meal_id = hd(hidden_menu.meals).id

      invalid = [
        %{
          meals: [
            meal_input("breakfast", "Breakfast", [
              food_item("item", food.id, %{kind: :gram, grams: 50})
            ])
          ],
          day_patterns: [
            %{
              id: pattern.id,
              name: pattern.name,
              slots: [
                %{
                  meal_slot: :breakfast,
                  options: [
                    %{id: uuid("a"), nutrition_meal_id: uuid("breakfast")},
                    %{id: uuid("b"), nutrition_meal_id: uuid("breakfast")}
                  ]
                }
              ]
            }
          ],
          schedule: schedule_for(pattern.id)
        },
        %{
          meals: [meal_input("breakfast", "Breakfast", [])],
          day_patterns: [
            %{
              id: pattern.id,
              name: pattern.name,
              slots: [
                %{
                  meal_slot: :brunch,
                  options: [%{id: uuid("a"), nutrition_meal_id: uuid("breakfast")}]
                }
              ]
            }
          ],
          schedule: schedule_for(pattern.id)
        },
        %{
          meals: [
            meal_input("one", "One", []),
            meal_input("two", "Two", [])
          ],
          day_patterns: [
            %{
              id: pattern.id,
              name: pattern.name,
              slots: [
                %{
                  meal_slot: :breakfast,
                  options: [
                    %{id: uuid("a"), nutrition_meal_id: uuid("one")},
                    %{id: uuid("b"), nutrition_meal_id: uuid("missing")}
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
              slots: [
                %{
                  meal_slot: :breakfast,
                  options: [%{id: uuid("a"), nutrition_meal_id: foreign_meal_id}]
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
              slots: [
                %{
                  meal_slot: :breakfast,
                  options: [%{id: uuid("a"), nutrition_meal_id: hidden_meal_id}]
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
