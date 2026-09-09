defmodule Easy.Nutrition.Diary.SlotView do
  alias Easy.Nutrition.Day
  alias Easy.Nutrition.Diary.CorrectionPolicy
  alias Easy.Nutrition.DiarySlot
  alias Easy.Nutrition.DiarySlot.Document
  alias Easy.Nutrition.{ItemReference, NutrientTotals, Portion}

  @spec build(DiarySlot.t(), DateTime.t()) :: Day.slot()
  def build(%DiarySlot{} = slot, %DateTime{} = now) do
    document = slot.document
    active = Document.active_option(document)
    items = if active, do: active.items, else: []
    today = CorrectionPolicy.local_today(slot.applied_timezone, now)

    %{
      meal_slot: slot.meal_slot,
      meal_id: document.meal_id,
      revision: slot.revision,
      applied_timezone: slot.applied_timezone,
      write_eligible: CorrectionPolicy.write_eligible?(slot.local_date, today),
      planned_calories: NutrientTotals.sum(items).calories,
      logged_calories: NutrientTotals.sum(document.entries).calories,
      options: Enum.with_index(document.options, &option_data/2),
      rows: slot_rows(slot, items, today)
    }
  end

  defp slot_rows(%DiarySlot{has_coverage: false} = slot, _items, _today) do
    Enum.map(slot.document.entries, &row(:recorded, nil, &1))
  end

  defp slot_rows(slot, items, today) do
    planned_ids = MapSet.new(items, & &1.id)
    entries = Map.new(slot.document.entries, &{&1.planned_item_ref, &1})

    planned =
      Enum.map(items, fn item ->
        entry = Map.get(entries, item.id)
        row(planned_status(entry, item, slot.local_date, today), item, entry)
      end)

    extras = Enum.reject(slot.document.entries, &MapSet.member?(planned_ids, &1.planned_item_ref))
    planned ++ Enum.map(extras, &row(:added, nil, &1))
  end

  defp row(status, planned, entry) do
    item = entry || planned
    ref = planned && planned.id

    Map.merge(item_data(item), %{
      id: ref || entry.id,
      entry_id: entry && entry.id,
      planned_item_ref: ref,
      status: status,
      notes: entry && entry.notes
    })
  end

  defp option_data(option, position) do
    items =
      Enum.with_index(option.items, fn item, index ->
        Map.merge(item_data(item), %{planned_item_ref: item.id, position: index})
      end)

    %{meal_id: option.id, meal_name: option.name, position: position, items: items}
  end

  defp item_data(item) do
    %{
      kind: ItemReference.kind(item),
      name: item.name,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      portion: Portion.format(item.portion),
      nutrients: item.nutrients
    }
  end

  defp planned_status(nil, _item, date, today) do
    if Date.compare(date, today) == :lt, do: :skipped, else: :pending
  end

  defp planned_status(entry, item, _date, _today) do
    if same_source?(entry, item), do: :as_planned, else: :swapped
  end

  defp same_source?(entry, item) do
    entry.food_id == item.food_id and entry.recipe_id == item.recipe_id
  end
end
