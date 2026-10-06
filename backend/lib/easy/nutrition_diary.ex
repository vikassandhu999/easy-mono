defmodule Easy.Nutrition.Diary do
  alias Easy.ClientAccess
  alias Easy.ClientAccount
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Nutrition.ContentValidator
  alias Easy.Nutrition.DayReader
  alias Easy.Nutrition.DiaryEntry
  alias Easy.Nutrition.DiaryMeal
  alias Easy.Nutrition.MealWriter
  alias Easy.Nutrition.Nutrients
  alias Easy.RecordJournal
  alias Easy.Repo
  import Ecto.Query

  @spec list_client_nutrition_days(Ctx.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def list_client_nutrition_days(ctx, opts \\ []) do
    with {:ok, client} <- ClientAccount.get_client_account(ctx), do: DayReader.list(ctx, client, opts)
  end

  @spec list_nutrition_days_for_client(Ctx.t(), String.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def list_nutrition_days_for_client(ctx, id, opts \\ []) do
    with {:ok, client} <- ClientAccess.authorize_client(ctx, id), do: DayReader.list(ctx, client, opts)
  end

  @spec save_client_nutrition_day(Ctx.t(), Date.t(), map()) :: {:ok, map()} | {:error, term()}
  def save_client_nutrition_day(ctx, date, input) do
    drafts = ContentValidator.encode(input)["meals"]

    RecordJournal.write(ctx, &save_locked(ctx, &1, date, drafts))
    |> then(&Easy.ChatRecordNotes.notify_result(ctx, &1))
  end

  defp save_locked(ctx, client, date, drafts) do
    with true <- Date.compare(date, Client.local_date(client, DateTime.utc_now())) != :gt || {:error, :future_date},
         {:ok, results} <- Easy.Result.traverse(drafts, &save_one(ctx, client, date, &1)),
         {:ok, day} <- DayReader.assemble(ctx, client, date) do
      {:ok, day, Enum.flat_map(results, &elem(&1, 1))}
    end
  end

  defp save_one(ctx, client, date, draft) do
    case MealWriter.save(ctx, client, date, draft) do
      {:ok, meal, changes} -> {:ok, {meal, changes}}
      error -> error
    end
  end

  @spec food_metrics_for_client(Ctx.t(), String.t(), keyword()) :: {:ok, [map()]} | {:error, term()}
  def food_metrics_for_client(ctx, client_id, opts) do
    with {:ok, client} <- ClientAccess.authorize_client(ctx, client_id),
         {:ok, dates} <- DayReader.dates(client, opts) do
      entries =
        Repo.all(
          from(e in DiaryEntry,
            join: m in DiaryMeal,
            on: m.id == e.meal_id and m.business_id == e.business_id,
            where:
              m.business_id == ^ctx.business_id and m.client_id == ^client_id and m.local_date >= ^Enum.min(dates, Date) and
                m.local_date <= ^Enum.max(dates, Date) and
                is_nil(e.deleted_at),
            select: {e, m.local_date}
          )
        )

      rows =
        Enum.flat_map(entries, fn {e, date} ->
          Enum.map(e.food_components, &Map.merge(&1, %{"entry_id" => e.id, "date" => date}))
        end)

      metrics =
        rows
        |> Enum.group_by(& &1["food_id"])
        |> Enum.map(&food_metric/1)
        |> Enum.sort_by(&{-&1.entries_count, &1.name})

      {:ok, metrics}
    end
  end

  defp food_metric({id, foods}) do
    amounts = foods |> Enum.group_by(& &1["entry_id"]) |> Map.values() |> Enum.map(&sum_grams/1)

    %{
      food_id: id,
      name: hd(foods)["name"],
      entries_count: length(amounts),
      days_count: foods |> Enum.map(& &1["date"]) |> Enum.uniq() |> length(),
      average_grams: Enum.sum(amounts) / length(amounts),
      nutrients: Nutrients.totals(Enum.map(foods, & &1["nutrients"]))
    }
  end

  defp sum_grams(components), do: Enum.sum(Enum.map(components, & &1["grams"]))
end
