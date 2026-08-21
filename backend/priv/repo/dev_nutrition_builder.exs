# Dev-only, idempotent seed: the nutrition plan the NB style-diff manifest
# (design-handoff/manifests/NB.json) runs against.
#
#   cd backend && mix run priv/repo/dev_nutrition_builder.exs
#
# Restores one Template Menu every run: Training day (plain / shared / swapped)
# and Rest day (shared meal + empty meal). Prints the plan id for the manifest.

import Ecto.Query
import Ecto.Changeset

alias Easy.Ctx
alias Easy.Nutrition.{DayPattern, Food, Plan, Programming, WeekSchedule}
alias Easy.Repo

plan_name = "NB fixture — Lean Bulk"
plan_id = "49584e72-1edd-41d5-a648-f339a1b57149"

business_id =
  Repo.one(
    from(p in Plan,
      group_by: p.business_id,
      order_by: [desc: count(p.id)],
      select: p.business_id,
      limit: 1
    )
  ) || Repo.one!(from(b in Easy.Orgs.Business, select: b.id, limit: 1))

business = Repo.get!(Easy.Orgs.Business, business_id)
Repo.delete_all(from(p in Plan, where: p.name == ^plan_name or p.id == ^plan_id))
coach = Repo.one!(from(c in Easy.Orgs.Coach, where: c.business_id == ^business.id, limit: 1))
ctx = %Ctx{business_id: business.id, user_id: coach.user_id, coach_id: coach.id, owner?: true}

foods =
  Repo.all(
    from(f in Food,
      where: is_nil(f.business_id) or f.business_id == ^business.id,
      where: f.calories_per_100g > 20.0 and f.calories_per_100g < 200.0,
      order_by: f.name,
      limit: 6
    )
  )

if foods == [] do
  raise "no foods in the dev DB — run priv/repo/seeds.exs first"
end

[f1, f2, f3, f4, f5, f6] = foods

{:ok, template} =
  Repo.transaction(fn ->
    template =
      business.id
      |> Plan.insert_changeset(coach.user_id, %{
        "name" => plan_name,
        "target_calories" => 2100.0,
        "target_protein_g" => 180.0,
        "target_carbs_g" => 200.0,
        "target_fat_g" => 60.0
      })
      |> put_change(:id, plan_id)
      |> Repo.insert!()

    pattern =
      business.id
      |> DayPattern.insert_changeset(template.id, %{name: "Everyday", position: 0})
      |> Repo.insert!()

    Enum.each(WeekSchedule.weekdays(), fn weekday ->
      business.id
      |> WeekSchedule.insert_changeset(template.id, pattern.id, %{weekday: weekday})
      |> Repo.insert!()
    end)

    {:ok, seeded} = Programming.get_template(ctx, template.id)
    seeded
  end)

everyday = hd(template.day_patterns)
gram = fn grams -> %{kind: :gram, grams: grams * 1.0} end

food_item = fn ref, food, grams, position ->
  %{local_ref: ref, kind: :food, food_id: food.id, position: position, portion: gram.(grams)}
end

{:ok, plan} =
  Programming.replace_menu(ctx, template.id, 1, %{
    meals: [
      %{
        local_ref: "oats",
        name: "Protein oats + berries",
        position: 0,
        meal_items: [food_item.("oats-1", f1, 80, 0), food_item.("oats-2", f2, 150, 1)]
      },
      %{
        local_ref: "yogurt",
        name: "Greek yogurt + almonds",
        position: 1,
        meal_items: [food_item.("yogurt-1", f3, 170, 0), food_item.("yogurt-2", f4, 20, 1)]
      },
      %{
        local_ref: "salmon",
        name: "Salmon, rice & greens",
        position: 2,
        meal_items: [
          food_item.("salmon-1", f5, 180, 0),
          food_item.("salmon-2", f6, 150, 1),
          food_item.("salmon-3", f2, 120, 2)
        ]
      },
      %{
        local_ref: "chili",
        name: "Turkey chili & rice",
        position: 3,
        meal_items: [food_item.("chili-1", f6, 150, 0), food_item.("chili-2", f2, 150, 1)]
      },
      %{local_ref: "empty", name: "New meal", position: 4, meal_items: []}
    ],
    day_patterns: [
      %{
        id: everyday.id,
        name: "Training day",
        position: 0,
        slots: [
          %{
            meal_slot: :breakfast,
            options: [%{local_ref: "t-b", meal_local_ref: "oats", position: 0}]
          },
          %{
            meal_slot: :mid_morning,
            options: [%{local_ref: "t-m", meal_local_ref: "yogurt", position: 0}]
          },
          %{
            meal_slot: :dinner,
            options: [
              %{local_ref: "t-d0", meal_local_ref: "salmon", position: 0},
              %{local_ref: "t-d1", meal_local_ref: "chili", position: 1}
            ]
          }
        ]
      },
      %{
        local_ref: "rest",
        name: "Rest day",
        position: 1,
        slots: [
          %{
            meal_slot: :breakfast,
            options: [%{local_ref: "r-b", meal_local_ref: "yogurt", position: 0}]
          },
          %{
            meal_slot: :lunch,
            options: [%{local_ref: "r-l", meal_local_ref: "empty", position: 0}]
          }
        ]
      }
    ],
    schedule: %{
      monday: everyday.id,
      tuesday: everyday.id,
      wednesday: everyday.id,
      thursday: everyday.id,
      friday: everyday.id,
      saturday: "rest",
      sunday: "rest"
    }
  })

IO.puts("NB fixture ready — /library/nutrition-plans/#{plan.id}")
