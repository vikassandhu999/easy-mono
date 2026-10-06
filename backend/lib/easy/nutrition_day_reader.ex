defmodule Easy.Nutrition.DayReader do
  alias Easy.Clients.Client
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Nutrition.DiaryEntry
  alias Easy.Nutrition.DiaryMeal
  alias Easy.Nutrition.Nutrients
  alias Easy.Plans.Plan
  alias Easy.Plans.Reader
  alias Easy.Plans.Revision
  alias Easy.Repo
  import Ecto.Query
  @spec list(Ctx.t(), Client.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def list(ctx, client, opts) do
    with {:ok, dates} <- dates(client, opts),
         {:ok, days} <- Easy.Result.traverse(dates, &assemble(ctx, client, &1)),
         do: {:ok, %{nutrition_days: days}}
  end

  @spec dates(Client.t(), keyword()) :: {:ok, [Date.t()]} | {:error, atom()}
  def dates(client, opts) do
    today = Client.local_date(client, DateTime.utc_now())

    with {:ok, from} <- date(opts[:date] || opts[:from] || today),
         {:ok, to} <- date(opts[:date] || opts[:to] || from),
         true <- Date.diff(to, from) in 0..365 || {:error, :invalid_date},
         do: {:ok, Enum.to_list(Date.range(from, to))}
  end

  defp date(%Date{} = d), do: {:ok, d}
  defp date(value), do: Date.from_iso8601(value)
  @spec assemble(Ctx.t(), Client.t(), Date.t()) :: {:ok, map()}
  def assemble(ctx, client, date) do
    client = Repo.preload(client, [:business, :terms])

    plan =
      Repo.one(
        from(p in Plan,
          where:
            p.business_id == ^ctx.business_id and p.client_id == ^client.id and p.domain == :nutrition and
              fragment("plan_covers(?, ?)", p.id, type(^date, :date))
        )
      )

    revision = revision(ctx, plan, date)

    meals =
      Repo.all(
        from(m in DiaryMeal,
          where: m.business_id == ^ctx.business_id and m.client_id == ^client.id and m.local_date == ^date,
          order_by: [asc: m.inserted_at, asc: m.id]
        )
      )

    entries =
      Repo.all(
        from(e in DiaryEntry,
          where: e.business_id == ^ctx.business_id and e.meal_id in ^Enum.map(meals, & &1.id) and is_nil(e.deleted_at),
          order_by: [asc: e.inserted_at, asc: e.id]
        )
      )

    meals = Enum.map(meals, &Map.put(&1, :entries, Enum.filter(entries, fn e -> e.meal_id == &1.id end)))
    slots = slots(revision, date, meals)
    slot_ids = Enum.map(slots, & &1.id)

    {:ok,
     %{
       date: date,
       timezone: Client.applied_timezone(client),
       write_eligible: writable?(client, date),
       plan_id: identity(plan),
       plan_revision_id: identity(revision),
       plan_revision_number: revision_number(revision),
       targets: revision_targets(revision, date),
       target_changed: changed?(plan, date, client),
       totals: Nutrients.totals(Enum.map(entries, & &1.nutrients)),
       counts: %{expected: length(slots), recorded: Enum.count(slots, &(&1.status == :recorded))},
       slots: slots,
       extra_meals: Enum.reject(meals, &(&1.slot_id in slot_ids))
     }}
  end

  defp revision_number(nil), do: nil
  defp revision_number(row), do: row.number
  defp identity(nil), do: nil
  defp identity(row), do: row.id
  defp revision(_ctx, nil, _date), do: nil
  defp revision(ctx, plan, date), do: Reader.revision_on(ctx, :nutrition, plan.id, date)
  defp revision_targets(nil, _date), do: %{}
  defp revision_targets(revision, date), do: targets(revision.content, date)
  defp slots(nil, _date, _meals), do: []
  defp slots(revision, date, meals), do: Enum.map(pattern(revision.content, date)["slots"], &slot(&1, revision, meals))

  defp writable?(client, date),
    do:
      Enum.any?(client.terms, &CoachingTerm.covers?(&1, date)) and
        Date.compare(date, Client.local_date(client, DateTime.utc_now())) != :gt

  defp slot(s, revision, meals) do
    meal = Enum.find(meals, &(&1.slot_id == s["id"]))

    revision =
      if meal && meal.plan_revision_id != revision.id, do: Repo.get(Revision, meal.plan_revision_id), else: revision

    s =
      if meal, do: Enum.find(pattern(revision.content, meal.local_date)["slots"], &(&1["id"] == meal.slot_id)), else: s

    %{
      id: s["id"],
      name: s["name"],
      plan_revision_id: revision.id,
      options: Enum.filter(revision.content["meals"], &(&1["id"] in s["meal_ids"])),
      meal: meal,
      status: if(meal, do: :recorded, else: :not_recorded)
    }
  end

  @spec pattern(map(), Date.t()) :: map() | nil
  def pattern(content, date) do
    entry = Enum.find(content["schedule"]["entries"], &(&1["day"] == Date.day_of_week(date) - 1))
    entry && Enum.find(content["day_patterns"], &(&1["id"] == entry["ref"]))
  end

  @spec targets(map(), Date.t()) :: map()
  def targets(content, date) do
    p = pattern(content, date)
    if p && Map.has_key?(p, "targets"), do: p["targets"], else: content["targets"]
  end

  defp changed?(nil, _, _), do: false

  defp changed?(plan, date, client) do
    revisions =
      Repo.all(
        from(r in Revision,
          where: r.plan_id == ^plan.id and (is_nil(r.effective_on) or r.effective_on <= ^date),
          order_by: [asc_nulls_first: r.effective_on, asc: r.number]
        )
      )

    revisions
    |> Enum.chunk_every(2, 1, :discard)
    |> Enum.any?(fn [old, new] ->
      new.effective_on == date and Client.local_date(client, new.inserted_at) == date and
        targets(old.content, date) != targets(new.content, date)
    end)
  end
end
