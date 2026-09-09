defmodule Easy.Nutrition.Diary.Input do
  alias Easy.Nutrition.DiarySlot
  alias Easy.Nutrition.MealSlot
  alias Easy.Nutrition.Portion

  @type t :: %{slots: [slot()]}
  @type slot :: %{
          meal_slot: MealSlot.t(),
          meal_id: String.t() | nil,
          expected_revision: non_neg_integer(),
          entries: [entry()]
        }

  @type entry :: %{
          id: String.t(),
          planned_item_ref: String.t() | nil,
          food_id: String.t() | nil,
          recipe_id: String.t() | nil,
          portion: Portion.t(),
          notes: String.t() | nil
        }

  # Request-shape rules the slot document cannot see: one draft per Meal Slot,
  # one draft per entry ID, one Library source per entry. Planned references
  # are validated by the document itself.
  @spec validate_slots([slot()]) :: :ok | {:error, Ecto.Changeset.t()}
  def validate_slots(slots) do
    entries = Enum.flat_map(slots, & &1.entries)

    errors =
      [
        {:slots, "repeats a Meal Slot", duplicates?(slots, & &1.meal_slot)},
        {:entries, "repeats an entry ID", Enum.any?(slots, &duplicates?(&1.entries, fn entry -> entry.id end))},
        {:entries, "must supply at most one Library reference", Enum.any?(entries, &(&1.food_id && &1.recipe_id))}
      ]
      |> Enum.filter(&elem(&1, 2))

    case errors do
      [] ->
        :ok

      errors ->
        changeset =
          Enum.reduce(errors, Ecto.Changeset.change(%DiarySlot{}), fn {field, message, _}, changeset ->
            Ecto.Changeset.add_error(changeset, field, message)
          end)

        {:error, changeset}
    end
  end

  defp duplicates?(items, key), do: length(Enum.uniq_by(items, key)) != length(items)
end
