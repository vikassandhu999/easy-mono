defmodule Easy.Nutrition.Diary.DayAssembler do
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Nutrition.Day
  alias Easy.Nutrition.Diary.CorrectionPolicy
  alias Easy.Nutrition.Diary.SlotView

  alias Easy.Nutrition.{
    DiaryDay,
    DiarySlot,
    ItemResolver,
    MealSlot,
    Menu,
    PlanReader
  }

  alias Easy.Nutrition.DiarySlot.Document
  alias Easy.Repo
  alias Easy.Result

  @type actor :: :client | :coach
  @type list_error :: PlanReader.read_error() | :invalid_date_range | :date_range_too_wide | :incomplete_date_range

  @spec list(Ctx.t(), Client.t(), keyword(), actor()) :: {:ok, Day.list_result()} | {:error, list_error()}
  def list(%Ctx{} = ctx, %Client{} = client, opts, actor) when is_list(opts) and actor in [:client, :coach] do
    now = DateTime.utc_now()

    Repo.snapshot(fn ->
      client = Repo.preload(client, :business)

      with {:ok, dates} <- resolve_dates(opts, CorrectionPolicy.local_today(client, now)),
           {:ok, days} <- Result.traverse(dates, &assemble(ctx, client, &1, actor, now)) do
        {:ok, %{nutrition_days: days}}
      end
    end)
  end

  @spec assemble(Ctx.t(), Client.t(), Date.t(), actor(), DateTime.t()) ::
          {:ok, Day.t()} | {:error, PlanReader.read_error()}
  def assemble(%Ctx{} = ctx, %Client{} = client, %Date{} = date, actor, %DateTime{} = now)
      when actor in [:client, :coach] do
    Repo.snapshot(fn -> assemble_day(ctx, client, date, actor, now) end)
  end

  defp assemble_day(ctx, client, date, actor, now) do
    frozen = frozen_by_slot(client, date)
    frozen_day = Repo.one(DiaryDay.for_date(client.business_id, client.id, date))
    items = Enum.flat_map(Map.values(frozen), &Document.items(&1.document))
    timezone = day_timezone(Map.values(frozen), Client.applied_timezone(client))
    today = CorrectionPolicy.local_today(timezone, now)

    case live_guidance(ctx, client.id, date, today, actor) do
      {:ok, guidance} ->
        live_items = if guidance, do: Menu.items(guidance.plan.menu), else: []
        {:ok, available} = ItemResolver.available(ctx, items ++ live_items)
        day = merge_day(date, today, timezone, guidance, frozen, frozen_day, now)
        {:ok, Day.format(day, available)}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp resolve_dates(opts, today) do
    date = Keyword.get(opts, :date)
    from_date = Keyword.get(opts, :from)
    to_date = Keyword.get(opts, :to)

    cond do
      not is_nil(date) ->
        {:ok, [date]}

      not is_nil(from_date) and not is_nil(to_date) ->
        range_dates(from_date, to_date)

      not is_nil(from_date) or not is_nil(to_date) ->
        {:error, :incomplete_date_range}

      true ->
        {:ok, [today]}
    end
  end

  defp range_dates(from_date, to_date) do
    cond do
      Date.compare(from_date, to_date) == :gt ->
        {:error, :invalid_date_range}

      Date.diff(to_date, from_date) > 30 ->
        {:error, :date_range_too_wide}

      true ->
        {:ok, Enum.to_list(Date.range(from_date, to_date))}
    end
  end

  defp live_guidance(ctx, client_id, date, today, actor) do
    if Date.compare(date, today) == :lt do
      {:ok, nil}
    else
      resolve_guidance(ctx, client_id, date, actor)
    end
  end

  defp resolve_guidance(ctx, _client_id, date, :client), do: PlanReader.resolve_client_coverage(ctx, date)
  defp resolve_guidance(ctx, client_id, date, :coach), do: PlanReader.resolve_coverage_for_client(ctx, client_id, date)

  defp merge_day(date, today, timezone, guidance, frozen, frozen_day, now) do
    live =
      if guidance do
        guidance.day_pattern
        |> live_slots(guidance.plan, date, timezone, now)
        |> Map.new(&{&1.meal_slot, &1})
      else
        %{}
      end

    slots =
      MealSlot.values()
      |> Enum.map(&merged_slot(&1, frozen, live, now))
      |> Enum.reject(&is_nil/1)

    targets = DiaryDay.targets(frozen_day || (guidance && guidance.plan))
    applied = day_timezone(slots, timezone)

    %{
      date: date,
      plan_id: guidance && guidance.plan.id,
      write_eligible:
        Enum.any?(slots, & &1.write_eligible) or
          (slots == [] and CorrectionPolicy.write_eligible?(date, today)),
      applied_timezone: applied,
      targets: targets,
      slots: slots,
      summary: Day.summarize(slots, targets)
    }
  end

  defp merged_slot(slot, frozen, live, now) do
    cond do
      Map.has_key?(frozen, slot) -> SlotView.build(Map.fetch!(frozen, slot), now)
      Map.has_key?(live, slot) -> Map.fetch!(live, slot)
      true -> nil
    end
  end

  defp frozen_by_slot(client, date) do
    DiarySlot
    |> DiarySlot.for_client(client.business_id, client.id)
    |> DiarySlot.for_date(date)
    |> Repo.all()
    |> Map.new(&{&1.meal_slot, &1})
  end

  defp live_slots(nil, _plan, _date, _timezone, _now), do: []

  defp live_slots(pattern, plan, date, timezone, now) do
    MealSlot.values()
    |> Enum.flat_map(fn meal_slot ->
      case Menu.meals_for_slot(plan.menu, pattern, meal_slot) do
        [] ->
          []

        meals ->
          slot = %DiarySlot{
            meal_slot: meal_slot,
            local_date: date,
            applied_timezone: timezone,
            has_coverage: true,
            document: Document.from_meals(meals)
          }

          [SlotView.build(slot, now)]
      end
    end)
  end

  defp day_timezone(slots, fallback) do
    Enum.find_value(MealSlot.values(), fallback, fn meal_slot ->
      case Enum.find(slots, &(&1.meal_slot == meal_slot and is_binary(&1.applied_timezone))) do
        %{applied_timezone: timezone} -> timezone
        _missing -> nil
      end
    end)
  end
end
