defmodule Easy.Nutrition.ContentValidator do
  alias Easy.Nutrition.Library
  alias Easy.Nutrition.Nutrients
  @spec validate(Easy.Ctx.t(), map()) :: {:ok, map()} | {:error, term()}
  def validate(ctx, input) do
    content = encode(input)

    with :ok <- shape(content),
         content <- normalize_slots(content),
         :ok <- topology(content),
         {:ok, meals} <- Easy.Result.traverse(content["meals"], &freeze_meal(ctx, &1)) do
      {:ok, Map.put(content, "meals", meals)}
    end
  end

  @spec encode(term()) :: term()
  def encode(value) when is_map(value), do: Map.new(value, fn {k, v} -> {to_string(k), encode(v)} end)
  def encode(value) when is_list(value), do: Enum.map(value, &encode/1)
  def encode(value) when is_atom(value) and value not in [nil, true, false], do: to_string(value)
  def encode(value), do: value

  defp shape(%{
         "targets" => targets,
         "meals" => meals,
         "day_patterns" => patterns,
         "schedule" => %{"cycle_weeks" => 1, "entries" => entries}
       })
       when is_list(meals) and is_list(patterns) and is_list(entries) do
    if targets?(targets) and Enum.all?(patterns, &pattern_shape?/1) and
         Enum.all?(meals, &is_list(&1["items"])),
       do: :ok,
       else: invalid("invalid targets or document shape")
  end

  defp shape(_), do: invalid("requires targets, meals, day patterns and one weekly schedule")

  defp pattern_shape?(%{"slots" => slots} = pattern) when is_list(slots),
    do: targets?(Map.get(pattern, "targets", %{})) and Enum.all?(slots, &slot_shape?/1)

  defp pattern_shape?(_), do: false
  defp slot_shape?(%{"name" => name}) when is_binary(name), do: true
  defp slot_shape?(_), do: false

  defp normalize_slots(content),
    do: Map.put(content, "day_patterns", Enum.map(content["day_patterns"], &normalize_pattern/1))

  defp normalize_pattern(pattern), do: Map.update!(pattern, "slots", &normalize_slot_list/1)

  defp normalize_slot_list(slots), do: Enum.map(slots, &normalize_slot/1)
  defp normalize_slot(slot), do: Map.update!(slot, "name", &String.trim/1)

  defp targets?(targets) when is_map(targets) do
    Enum.all?(targets, fn {code, bounds} -> Map.has_key?(Nutrients.registry(), code) and bounds?(bounds) end)
  end

  defp targets?(_), do: false

  defp bounds?(bounds) when is_map(bounds) do
    values = Map.values(bounds)

    values != [] and Enum.all?(Map.keys(bounds), &(&1 in ["min", "max"])) and
      Enum.all?(values, &(is_number(&1) and &1 >= 0)) and
      (not Map.has_key?(bounds, "min") or not Map.has_key?(bounds, "max") or bounds["min"] <= bounds["max"])
  end

  defp bounds?(_), do: false

  defp topology(c) do
    meals = c["meals"]
    patterns = c["day_patterns"]
    entries = c["schedule"]["entries"]
    slots = Enum.flat_map(patterns, & &1["slots"])
    nodes = meals ++ patterns ++ entries ++ slots ++ Enum.flat_map(meals, & &1["items"])
    ids = Enum.map(nodes, & &1["id"])

    valid =
      valid_ids?(ids) and
        Enum.sort(Enum.map(entries, & &1["day"])) == Enum.to_list(0..6) and
        Enum.all?(entries, &(&1["ref"] in Enum.map(patterns, fn p -> p["id"] end))) and
        Enum.all?(patterns, &unique_slot_names?/1) and
        Enum.all?(
          slots,
          &(is_binary(&1["name"]) and String.trim(&1["name"]) != "" and is_list(&1["meal_ids"]) and
              Enum.all?(&1["meal_ids"], fn id -> id in Enum.map(meals, fn m -> m["id"] end) end))
        )

    if valid,
      do: :ok,
      else: invalid("ids must be unique; references must belong to this document; each weekday needs exactly one pattern")
  end

  defp valid_ids?(ids),
    do: Enum.all?(ids, &match?({:ok, _}, Ecto.UUID.cast(&1))) and length(ids) == length(Enum.uniq(ids))

  defp unique_slot_names?(pattern) do
    names = Enum.map(pattern["slots"], & &1["name"])
    length(names) == length(Enum.uniq(names))
  end

  defp freeze_meal(ctx, meal) do
    with {:ok, items} <- Easy.Result.traverse(meal["items"], &freeze_item(ctx, &1)) do
      {:ok, Map.put(meal, "items", items)}
    end
  end

  defp freeze_item(ctx, item) do
    with {:ok, values} <- Library.resolve(ctx, item["source"], item["portion"]) do
      {:ok, Map.merge(item, values)}
    end
  end

  defp invalid(message),
    do: {:error, Ecto.Changeset.add_error(Ecto.Changeset.change({%{}, %{content: :map}}), :content, message)}
end
