defmodule Easy.Trackers.Content do
  alias Easy.Ctx
  alias Easy.Result
  alias Easy.Trackers
  alias Easy.Trackers.Assignment
  @behaviour Easy.Plans.Domain

  @impl true
  @spec empty() :: map()
  def empty, do: %{"items" => []}

  @impl true
  @spec validate(Ctx.t(), map()) :: {:ok, map()} | {:error, term()}
  def validate(ctx, content) when is_map(content) do
    items = Map.get(content, "items", Map.get(content, :items))

    with true <- is_list(items) and length(items) <= 100,
         {:ok, items} <- Result.traverse(items, &validate_item(ctx, &1)),
         true <- length(Enum.uniq_by(items, & &1["tracker_id"])) == length(items) do
      {:ok, %{"items" => items}}
    else
      {:error, _} = error -> error
      _ -> {:error, :invalid_tracker}
    end
  end

  def validate(_, _), do: {:error, :invalid_tracker}

  defp validate_item(ctx, item) when is_map(item) do
    item = Map.new(item, fn {k, v} -> {to_string(k), v} end)

    with {:ok, id} <- Ecto.UUID.cast(item["tracker_id"]),
         {:ok, _tracker} <- Trackers.active_tracker(ctx, id),
         cs = Assignment.insert_changeset(ctx.business_id, Ecto.UUID.generate(), id, Date.utc_today(), item),
         {:ok, row} <- Ecto.Changeset.apply_action(cs, :insert) do
      {:ok, %{"tracker_id" => id, "timing" => to_string(row.timing), "weekday" => row.weekday}}
    else
      :error -> {:error, :invalid_tracker}
      error -> error
    end
  end

  defp validate_item(_, _), do: {:error, :invalid_tracker}

  @impl true
  @spec summary(map()) :: map()
  def summary(content), do: %{item_count: length(content["items"] || [])}
  @impl true
  @spec coverage(map()) :: map()
  def coverage(_), do: %{}
end
