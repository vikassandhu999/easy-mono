defmodule Easy.NutritionLogs do
  import Ecto.Changeset
  import Ecto.Query
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.CursorPage
  alias Easy.Nutrition.{Food, FoodLog, NutritionLog, NutritionPreset, NutritionSchedule, Timing, Values}
  alias Easy.Repo
  alias Easy.Result

  @type result :: {:ok, term()} | {:error, atom() | Ecto.Changeset.t()}
  @salt "client nutrition log undo"

  @spec list_client_foods(Ctx.t(), keyword()) :: result()
  def list_client_foods(ctx, opts \\ []) do
    with {:ok, _} <- client(ctx), :ok <- CursorPage.validate_options(opts) do
      query = Food.for_business(ctx.business_id) |> Food.search(opts[:search]) |> Food.for_kind(opts[:kind])
      limit = CursorPage.limit(opts)

      with {:ok, paged} <- CursorPage.query(query, opts[:cursor] || "start", limit),
           do: {:ok, CursorPage.finish(Repo.all(paged), limit, Repo.aggregate(query, :count))}
    end
  end

  @spec get_client_food(Ctx.t(), String.t()) :: result()
  def get_client_food(ctx, id) do
    with {:ok, _} <- client(ctx), do: food(ctx, id)
  end

  @spec list_client_nutrition_logs(Ctx.t(), keyword()) :: result()
  def list_client_nutrition_logs(ctx, opts \\ []) do
    with {:ok, _} <- client(ctx), {:ok, date} <- date_option(opts[:logged_on]), {:ok, page} <- pagination(opts) do
      query = NutritionLog.for_client(ctx.business_id, ctx.client_id) |> NutritionLog.for_date(date)

      rows =
        query
        |> NutritionLog.by_time()
        |> NutritionLog.include_food_logs(ctx.business_id)
        |> offset(^page.offset)
        |> limit(^min(page.limit, 100))
        |> Repo.all()

      {:ok, %{count: Repo.aggregate(query, :count), nutrition_logs: rows}}
    end
  end

  @spec get_client_nutrition_log(Ctx.t(), String.t()) :: result()
  def get_client_nutrition_log(ctx, id) do
    with {:ok, _} <- client(ctx), do: get_log(ctx, id)
  end

  @spec create_client_nutrition_log(Ctx.t(), map()) :: result()
  def create_client_nutrition_log(ctx, attrs) do
    attrs = Values.encode(attrs)
    write(ctx, fn client -> create(ctx, client, attrs) end)
  end

  @spec update_client_nutrition_log(Ctx.t(), String.t(), map()) :: result()
  def update_client_nutrition_log(ctx, id, attrs) do
    attrs = Values.encode(attrs)

    write(ctx, fn client ->
      with {:ok, old} <- get_log(ctx, id),
           {:ok, refs} <- references(ctx, old, attrs),
           {:ok, row} <- correct(ctx, client, old, refs, attrs) do
        {:ok, %{data: row, undo_token: undo_token(ctx, old, row)}}
      end
    end)
  end

  @spec delete_client_nutrition_log(Ctx.t(), String.t()) :: result()
  def delete_client_nutrition_log(ctx, id) do
    write(ctx, fn _client ->
      with {:ok, row} <- get_log(ctx, id), {:ok, _} <- Repo.delete(change(row)), do: {:ok, %{undo_token: undo_token(ctx, row, nil)}}
    end)
  end

  @spec restore_client_nutrition_log(Ctx.t(), String.t()) :: result()
  def restore_client_nutrition_log(ctx, token) do
    write(ctx, fn _client ->
      with {:ok, payload} <- undo_payload(ctx, token),
           :ok <- matching_current(ctx, payload),
           :ok <- remove_current(ctx, payload.id),
           do: restore_snapshot(payload.before)
    end)
  end

  defp create(ctx, client, attrs) do
    cs = NutritionLog.insert_changeset(ctx.business_id, ctx.user_id, client.id, attrs)

    with {:ok, candidate} <- apply_action(cs, :insert),
         :ok <- recordable_date(client, candidate.logged_on),
         {:ok, refs} <- references(ctx, nil, attrs),
         :ok <- recordable_date(client, refs.date || candidate.logged_on),
         :ok <- occurrence_available(ctx, refs),
         {:ok, entries} <- food_entries(ctx, candidate, refs, attrs["food_logs"], []),
         {:ok, type} <- log_type(refs.preset, entries),
         {:ok, row} <- cs |> put_references(refs, type) |> Repo.insert(),
         {:ok, _} <- persist_entries(row, entries, []),
         do: get_log(ctx, row.id)
  end

  defp correct(ctx, client, old, refs, attrs) do
    cs = NutritionLog.update_changeset(old, attrs)
    entries = Map.get(attrs, "food_logs", Enum.map(old.food_logs, &entry_attrs/1))

    with {:ok, candidate} <- apply_action(cs, :update),
         :ok <- recordable_date(client, candidate.logged_on),
         {:ok, entries} <- food_entries(ctx, candidate, refs, entries, old.food_logs),
         {:ok, type} <- log_type(refs.preset, entries),
         {:ok, row} <- cs |> put_references(refs, type) |> Repo.update(),
         {:ok, _} <- persist_entries(row, entries, old.food_logs),
         do: get_log(ctx, row.id)
  end

  defp references(ctx, nil, attrs) do
    empty = %{nutrition_schedule_id: nil, scheduled_date: nil, meal_option_id: nil}
    types = %{nutrition_schedule_id: :binary_id, scheduled_date: :date, meal_option_id: :binary_id}
    cs = cast({empty, types}, attrs, Map.keys(types))

    with {:ok, values} <- apply_action(cs, :insert), do: resolve_references(ctx, values)
  end

  defp references(ctx, old, attrs) do
    values = Map.take(old, [:nutrition_schedule_id, :scheduled_date, :meal_option_id])
    cs = cast({values, %{meal_option_id: :binary_id}}, attrs, [:meal_option_id])
    with {:ok, values} <- apply_action(cs, :update), do: resolve_references(ctx, values)
  end

  defp resolve_references(_ctx, %{nutrition_schedule_id: nil, scheduled_date: nil, meal_option_id: nil}),
    do: {:ok, %{preset: nil, option: nil, schedule: nil, date: nil}}

  defp resolve_references(ctx, %{nutrition_schedule_id: id, scheduled_date: %Date{} = date} = values)
       when is_binary(id) do
    with {:ok, schedule} <- NutritionSchedule.for_client(ctx.business_id, ctx.client_id) |> Repo.get(id) |> found(),
         true <- Timing.applies?(schedule, date) || {:error, :invalid_occurrence},
         {:ok, preset} <-
           NutritionPreset.for_client(ctx.business_id, ctx.client_id) |> NutritionPreset.include_content(ctx.business_id) |> Repo.get(schedule.nutrition_preset_id) |> found(),
         {:ok, option} <- chosen_option(preset, values[:meal_option_id]) do
      {:ok, %{preset: preset, option: option, schedule: schedule, date: date}}
    end
  end

  defp resolve_references(_ctx, _values), do: {:error, :invalid_occurrence}

  defp chosen_option(%{type: :meal, options: [option]}, nil), do: {:ok, option}
  defp chosen_option(%{type: :meal, options: options}, id), do: options |> Enum.find(&(&1.id == id)) |> found()
  defp chosen_option(_preset, nil), do: {:ok, nil}
  defp chosen_option(_preset, _id), do: {:error, :invalid_nutrition_item}

  defp food_entries(ctx, parent, refs, attrs, old) when is_list(attrs) and attrs != [] and length(attrs) <= 100 do
    with :ok <- unique_entries(attrs), do: prepare_entries(ctx, parent, refs, attrs, old)
  end

  defp food_entries(_ctx, _parent, _refs, _attrs, _old), do: {:error, :invalid_nutrition_item}

  defp prepare_entries(ctx, parent, refs, attrs, old) do
    Enum.with_index(attrs)
    |> Enum.reduce_while({:ok, [], old}, fn item, {:ok, entries, available} ->
      case positioned_entry(ctx, parent, refs, item, available) do
        {:ok, row} -> {:cont, {:ok, entries ++ [row], Enum.reject(available, &(&1.id == row.id))}}
        error -> {:halt, error}
      end
    end)
    |> case do
      {:ok, entries, _available} -> {:ok, entries}
      error -> error
    end
  end

  defp positioned_entry(ctx, parent, refs, {item, position}, old) when is_map(item),
    do: food_entry(ctx, parent, refs, Map.put(item, "position", position), old)

  defp positioned_entry(_ctx, _parent, _refs, _item, _old), do: {:error, :invalid_nutrition_item}

  defp food_entry(ctx, parent, refs, attrs, old) when is_map(attrs) do
    previous = previous_entry(attrs, old)

    with true <- (is_nil(attrs["id"]) or not is_nil(previous)) || {:error, :not_found},
         :ok <- prescribed_link(refs, attrs["meal_item_id"]),
         {:ok, cs} <- entry_changeset(ctx, parent, attrs, previous),
         {:ok, entry} <- apply_action(cs, :insert),
         {:ok, _} <- Food.factor(entry, entry.amount, entry.unit),
         do: {:ok, entry}
  end

  defp food_entry(_ctx, _parent, _refs, _attrs, _old), do: {:error, :invalid_nutrition_item}

  defp previous_entry(%{"id" => id}, old) when is_binary(id), do: Enum.find(old, &(&1.id == id))
  defp previous_entry(attrs, old), do: Enum.find(old, &(&1.food_id == attrs["food_id"] and &1.meal_item_id == attrs["meal_item_id"]))

  defp entry_changeset(_ctx, _parent, %{"food_id" => id} = attrs, %{food_id: id} = previous),
    do: {:ok, FoodLog.update_changeset(previous, attrs)}

  defp entry_changeset(ctx, parent, attrs, previous) do
    with {:ok, food} <- food(ctx, attrs["food_id"]) do
      cs = FoodLog.insert_changeset(ctx.business_id, parent.id, food, attrs)
      cs = if previous, do: put_change(cs, :id, previous.id), else: cs
      {:ok, cs}
    end
  end

  defp prescribed_link(_refs, nil), do: :ok

  defp prescribed_link(%{option: %{items: items}}, id) do
    if Enum.any?(items, &(&1.id == id)), do: :ok, else: {:error, :invalid_nutrition_item}
  end

  defp prescribed_link(_refs, _id), do: {:error, :invalid_nutrition_item}

  defp unique_entries(attrs) do
    ids = Enum.flat_map(attrs, fn item -> if is_map(item) and item["id"], do: [item["id"]], else: [] end)
    links = Enum.flat_map(attrs, fn item -> if is_map(item) and item["meal_item_id"], do: [item["meal_item_id"]], else: [] end)
    if length(ids) == length(Enum.uniq(ids)) and length(links) == length(Enum.uniq(links)), do: :ok, else: {:error, :invalid_nutrition_item}
  end

  defp log_type(%{type: :meal}, _entries), do: {:ok, :meal}
  defp log_type(%{type: type}, [%{kind: type}]), do: {:ok, type}
  defp log_type(nil, [%{kind: kind}]), do: {:ok, kind}
  defp log_type(nil, entries) when length(entries) > 1, do: {:ok, :meal}
  defp log_type(_preset, _entries), do: {:error, :invalid_nutrition_item}

  defp put_references(cs, refs, type) do
    cs
    |> put_change(:type, type)
    |> put_change(:nutrition_preset_id, refs.preset && refs.preset.id)
    |> put_change(:meal_option_id, refs.option && refs.option.id)
    |> put_change(:nutrition_schedule_id, refs.schedule && refs.schedule.id)
    |> put_change(:scheduled_date, refs.date)
  end

  defp persist_entries(parent, entries, old) do
    Repo.delete_all(FoodLog.for_log(parent.business_id, parent.id))

    Result.traverse(entries, fn entry ->
      entry = %{Ecto.put_meta(entry, state: :built) | nutrition_log_id: parent.id}
      entry = if Enum.any?(old, &(&1.id == entry.id)), do: %{entry | updated_at: DateTime.utc_now(:second)}, else: entry
      entry |> FoodLog.update_changeset(%{}) |> Repo.insert()
    end)
  end

  defp entry_attrs(row), do: row |> Map.take([:id, :food_id, :amount, :unit, :meal_item_id]) |> Values.encode()

  defp get_log(ctx, id) do
    with {:ok, id} <- valid_id(id) do
      NutritionLog.for_client(ctx.business_id, ctx.client_id) |> NutritionLog.include_food_logs(ctx.business_id) |> Repo.get(id) |> found()
    end
  end

  defp food(ctx, id) do
    with {:ok, id} <- valid_id(id), do: Food.for_business(ctx.business_id) |> Repo.get(id) |> found()
  end

  defp client(ctx) do
    with {:ok, id} <- Ctx.fetch_client_id(ctx), do: Client.for_business(ctx.business_id) |> Repo.get(id) |> found()
  end

  defp write(ctx, operation) do
    with {:ok, id} <- Ctx.fetch_client_id(ctx) do
      Repo.transact(fn -> write_locked(ctx, id, operation) end)
    end
  end

  defp write_locked(ctx, id, operation) do
    with {:ok, client} <- Client.for_business(ctx.business_id) |> where([c], c.id == ^id) |> lock("FOR UPDATE") |> preload(:business) |> Repo.one() |> found(),
         do: operation.(client)
  end

  defp recordable_date(client, date) do
    if Date.compare(date, Client.local_date(client, DateTime.utc_now())) == :gt, do: {:error, :future_date}, else: :ok
  end

  defp occurrence_available(_ctx, %{schedule: nil}), do: :ok

  defp occurrence_available(ctx, refs) do
    query =
      NutritionLog.for_client(ctx.business_id, ctx.client_id)
      |> where([l], l.nutrition_schedule_id == ^refs.schedule.id and l.scheduled_date == ^refs.date)

    if Repo.exists?(query), do: {:error, :conflict}, else: :ok
  end

  defp date_option(nil), do: {:ok, nil}
  defp date_option(%Date{} = date), do: {:ok, date}

  defp date_option(value) when is_binary(value) do
    case Date.from_iso8601(value) do
      {:ok, date} -> {:ok, date}
      _ -> {:error, :invalid_date}
    end
  end

  defp date_option(_), do: {:error, :invalid_date}

  defp pagination(opts) do
    {%{offset: 0, limit: 20}, %{offset: :integer, limit: :integer}}
    |> cast(Map.new(opts), [:offset, :limit])
    |> validate_required([:offset, :limit])
    |> validate_number(:offset, greater_than_or_equal_to: 0)
    |> validate_number(:limit, greater_than: 0)
    |> apply_action(:insert)
  end

  defp valid_id(id) do
    case Ecto.UUID.cast(id) do
      {:ok, id} -> {:ok, id}
      _ -> {:error, :not_found}
    end
  end

  defp found(nil), do: {:error, :not_found}
  defp found(value), do: {:ok, value}

  defp undo_token(ctx, before, after_row) do
    Phoenix.Token.encrypt(EasyWeb.Endpoint, @salt, %{
      business_id: ctx.business_id,
      client_id: ctx.client_id,
      id: before.id,
      before: snapshot(before),
      prescription: prescription_fingerprint(ctx, before),
      after: fingerprint(snapshot(after_row))
    })
  end

  defp undo_payload(ctx, token) do
    with {:ok, payload} <- Phoenix.Token.decrypt(EasyWeb.Endpoint, @salt, token, max_age: 86_400),
         true <- payload.business_id == ctx.business_id and payload.client_id == ctx.client_id,
         do: {:ok, payload},
         else: (_ -> {:error, :conflict})
  end

  defp matching_current(ctx, payload) do
    current =
      case get_log(ctx, payload.id) do
        {:ok, row} -> row
        {:error, :not_found} -> nil
      end

    source = struct(NutritionLog, payload.before.log)

    if fingerprint(snapshot(current)) == payload.after and
         prescription_fingerprint(ctx, source) == payload.prescription, do: :ok, else: {:error, :conflict}
  end

  defp remove_current(ctx, id) do
    case get_log(ctx, id) do
      {:ok, row} ->
        case Repo.delete(change(row)) do
          {:ok, _} -> :ok
          error -> error
        end

      {:error, :not_found} ->
        :ok
    end
  end

  defp snapshot(nil), do: nil
  defp snapshot(row), do: %{log: Map.take(row, NutritionLog.__schema__(:fields)), foods: Enum.map(row.food_logs, &Map.take(&1, FoodLog.__schema__(:fields)))}
  defp fingerprint(value), do: :crypto.hash(:sha256, :erlang.term_to_binary(value))

  defp prescription_fingerprint(_ctx, %{nutrition_preset_id: nil}), do: fingerprint(nil)

  defp prescription_fingerprint(ctx, row) do
    preset = NutritionPreset.for_client(ctx.business_id, ctx.client_id) |> NutritionPreset.include_content(ctx.business_id) |> Repo.get(row.nutrition_preset_id)
    schedule = NutritionSchedule.for_client(ctx.business_id, ctx.client_id) |> Repo.get(row.nutrition_schedule_id)
    fingerprint({prescription_fields(preset), schema_fields(schedule)})
  end

  defp prescription_fields(nil), do: nil

  defp prescription_fields(preset) do
    options =
      Enum.map(preset.options, fn option ->
        {schema_fields(option), Enum.map(option.items, &schema_fields/1)}
      end)

    {schema_fields(preset), options}
  end

  defp schema_fields(nil), do: nil
  defp schema_fields(row), do: Map.take(row, row.__struct__.__schema__(:fields))

  defp restore_snapshot(before) do
    with {:ok, row} <- before.log |> then(&struct(NutritionLog, &1)) |> NutritionLog.update_changeset(%{}) |> Repo.insert(),
         {:ok, entries} <-
           Result.traverse(before.foods, fn fields ->
             fields |> then(&struct(FoodLog, &1)) |> FoodLog.update_changeset(%{}) |> Repo.insert()
           end),
         do: {:ok, %{row | food_logs: entries}},
         else: ({:error, cs} -> restore_failure(cs))
  end

  defp restore_failure(cs) do
    occurrence_taken? =
      Enum.any?(cs.errors, fn {_field, {_message, metadata}} ->
        metadata[:constraint_name] == "nutrition_logs_current_occurrence"
      end)

    if occurrence_taken?, do: {:error, :conflict}, else: {:error, cs}
  end
end
