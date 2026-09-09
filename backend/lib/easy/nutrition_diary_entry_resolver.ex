defmodule Easy.Nutrition.Diary.EntryResolver do
  alias Easy.Ctx
  alias Easy.Nutrition.Diary.Input
  alias Easy.Nutrition.DiarySlot.Document
  alias Easy.Nutrition.{ItemReference, ItemResolver, NutrientTotals, Portion}
  alias Easy.Result

  @type entry :: %{
          id: String.t(),
          planned_item_ref: String.t() | nil,
          name: String.t(),
          food_id: String.t() | nil,
          recipe_id: String.t() | nil,
          portion: Portion.t(),
          nutrients: NutrientTotals.t(),
          notes: String.t() | nil
        }

  @spec resolve(Ctx.t(), Document.t(), String.t() | nil, [Input.entry()]) ::
          {:ok, [entry()]} | {:error, :not_found | :invalid_portion | :conflict}
  def resolve(%Ctx{} = ctx, document, meal_id, commands) do
    Result.traverse(commands, &prepare_entry(ctx, document, meal_id, &1))
  end

  defp prepare_entry(ctx, document, meal_id, command) do
    with {:ok, source, planned_ref} <- Document.entry_source(document, meal_id, command),
         {:ok, attrs} <- entry_attrs(ctx, source, command) do
      {:ok, Map.merge(attrs, %{id: command.id, planned_item_ref: planned_ref})}
    end
  end

  defp entry_attrs(_ctx, nil, %{food_id: nil, recipe_id: nil}), do: {:error, :not_found}

  defp entry_attrs(ctx, source, command) do
    if source && same_source?(source, command) do
      with {:ok, changes} <- update_attrs(ctx, source, command) do
        {:ok, Map.merge(snapshot_attrs(source), changes)}
      end
    else
      spec = ItemReference.new(command, command.portion)

      with {:ok, resolved} <- ItemResolver.resolve(ctx, [spec]) do
        {:ok, resolved_entry_attrs(Map.fetch!(resolved, spec), command)}
      end
    end
  end

  defp same_source?(_source, %{food_id: nil, recipe_id: nil}), do: true
  defp same_source?(source, command), do: source.food_id == command.food_id and source.recipe_id == command.recipe_id

  defp snapshot_attrs(source), do: Map.take(source, [:name, :portion, :nutrients, :food_id, :recipe_id])

  defp update_attrs(ctx, entry, command) do
    with {:ok, ratio, grams} <- portion_scale(ctx, entry, command.portion) do
      {:ok,
       %{
         portion: Map.put(command.portion, :grams, grams),
         nutrients: NutrientTotals.scale(entry.nutrients, ratio),
         notes: command.notes
       }}
    end
  end

  defp portion_scale(_ctx, %{portion: %{grams: weight_g}}, %{kind: :gram, grams: grams})
       when is_number(weight_g) and weight_g > 0 and is_number(grams) and grams > 0,
       do: {:ok, grams / weight_g, grams / 1}

  defp portion_scale(_ctx, %{portion: %{amount: stored, unit: unit, label: label, grams: weight_g}}, %{
         kind: :serving,
         amount: amount,
         unit: unit,
         label: label
       })
       when is_number(stored) and stored > 0 and is_number(amount) and amount > 0 do
    ratio = amount / stored
    grams = if is_number(weight_g) and weight_g > 0, do: weight_g * ratio, else: nil
    {:ok, ratio, grams}
  end

  defp portion_scale(ctx, %{portion: %{grams: stored}} = entry, portion)
       when is_number(stored) and stored > 0 do
    spec = ItemReference.new(entry, portion)

    with {:ok, resolved} <- ItemResolver.resolve(ctx, [spec]) do
      case Map.fetch!(resolved, spec).portion do
        %{grams: grams} when is_number(grams) and grams > 0 -> {:ok, grams / stored, grams}
        _ -> {:error, :invalid_portion}
      end
    end
  end

  defp portion_scale(_ctx, _entry, _portion), do: {:error, :invalid_portion}

  defp resolved_entry_attrs(resolved, command) do
    %{
      name: resolved.item.name,
      portion: resolved.portion,
      nutrients: resolved.nutrients,
      notes: command.notes,
      food_id: if(resolved.kind == :food, do: resolved.item.id),
      recipe_id: if(resolved.kind == :recipe, do: resolved.item.id)
    }
  end
end
