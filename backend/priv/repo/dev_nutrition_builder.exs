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
alias Easy.Nutrition.{Food, Plan, PlanReader, Programming}
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

    {:ok, seeded} = PlanReader.get_template(ctx, template.id)
    seeded
  end)

everyday = hd(template.menu.day_patterns)
gram = fn grams -> %{kind: :gram, grams: grams * 1.0} end

meal_ids = Map.new(~w(oats yogurt salmon chili empty), &{&1, Ecto.UUID.generate()})
rest_id = Ecto.UUID.generate()
food_item = fn food, grams ->
  %{id: Ecto.UUID.generate(), kind: :food, food_id: food.id, portion: gram.(grams)}
end

{:ok, plan} =
  Programming.replace_menu(ctx, template.id, 1, %{
    meals: [
      %{
        id: meal_ids["oats"],
        name: "Protein oats + berries",
meal_items: [food_item.(f1, 80), food_item.(f2, 150)]
      },
      %{
        id: meal_ids["yogurt"],
        name: "Greek yogurt + almonds",
meal_items: [food_item.(f3, 170), food_item.(f4, 20)]
      },
      %{
        id: meal_ids["salmon"],
        name: "Salmon, rice & greens",
meal_items: [
          food_item.(f5, 180),
          food_item.(f6, 150),
          food_item.(f2, 120)
        ]
      },
      %{
        id: meal_ids["chili"],
        name: "Turkey chili & rice",
meal_items: [food_item.(f6, 150), food_item.(f2, 150)]
      },
      %{id: meal_ids["empty"], name: "New meal", meal_items: []}
    ],
    day_patterns: [
      %{
        id: everyday.id,
        name: "Training day",
slots: [
          %{
            meal_slot: :breakfast,
            meal_ids: [meal_ids["oats"]]
          },
          %{
            meal_slot: :mid_morning,
            meal_ids: [meal_ids["yogurt"]]
          },
          %{
            meal_slot: :dinner,
            meal_ids: [meal_ids["salmon"], meal_ids["chili"]]
          }
        ]
      },
      %{
        id: rest_id,
        name: "Rest day",
slots: [
          %{
            meal_slot: :breakfast,
            meal_ids: [meal_ids["yogurt"]]
          },
          %{
            meal_slot: :lunch,
            meal_ids: [meal_ids["empty"]]
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
      saturday: rest_id,
      sunday: rest_id
    }
  })

IO.puts("NB fixture ready — /library/nutrition-plans/#{plan.id}")
