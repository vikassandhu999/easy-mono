defmodule Easy.Nutrition.Day do
  alias Easy.Nutrition.NutrientTotals

  @type t() :: %{
          date: Date.t(),
          plan_id: String.t() | nil,
          write_eligible: boolean(),
          applied_timezone: String.t(),
          targets: targets(),
          slots: [slot()],
          summary: summary()
        }

  @type list_result() :: %{count: non_neg_integer(), nutrition_days: [t()]}

  @type slot() :: %{
          meal_slot: atom(),
          meal_id: String.t() | nil,
          revision: non_neg_integer(),
          applied_timezone: String.t() | nil,
          write_eligible: boolean(),
          planned_calories: number() | nil,
          logged_calories: number() | nil,
          options: [option()],
          rows: [row()]
        }

  @type option() :: %{
          meal_id: String.t() | nil,
          meal_name: String.t() | nil,
          position: non_neg_integer(),
          items: [planned_item()]
        }

  @type planned_item() :: %{
          planned_item_ref: String.t(),
          kind: :food | :recipe,
          name: String.t() | nil,
          food_id: String.t() | nil,
          recipe_id: String.t() | nil,
          position: non_neg_integer(),
          portion: portion(),
          nutrients: NutrientTotals.t()
        }

  @type row() :: %{
          id: String.t(),
          entry_id: String.t() | nil,
          planned_item_ref: String.t() | nil,
          status: :as_planned | :swapped | :added | :recorded | :pending | :skipped,
          kind: :food | :recipe,
          name: String.t(),
          food_id: String.t() | nil,
          recipe_id: String.t() | nil,
          portion: portion(),
          nutrients: NutrientTotals.t(),
          notes: String.t() | nil
        }

  @type targets() :: %{
          calories: number() | nil,
          protein_g: number() | nil,
          carbs_g: number() | nil,
          fat_g: number() | nil,
          fiber_g: number() | nil
        }

  @type summary() :: %{
          logged: NutrientTotals.t(),
          planned: NutrientTotals.t(),
          counts: %{
            as_planned: non_neg_integer(),
            swapped: non_neg_integer(),
            added: non_neg_integer(),
            recorded: non_neg_integer(),
            pending: non_neg_integer(),
            skipped: non_neg_integer()
          },
          has_intake: boolean(),
          adherence: :none | :under | :on | :over | nil
        }

  @type portion() :: Easy.Nutrition.Portions.t()
end
