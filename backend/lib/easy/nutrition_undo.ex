defmodule Easy.Nutrition.Undo do
  import Ecto.Query
  alias Easy.{Ctx, Repo}
  alias Easy.Nutrition.{MealItem, MealOption, NutritionPreset, NutritionSchedule, NutritionTargets, TargetSchedule}
  @schemas [NutritionPreset, NutritionTargets, MealOption, MealItem, NutritionSchedule, TargetSchedule]
  @salt "client nutrition undo"
  @spec snapshot(Ctx.t(), String.t()) :: map()
  def snapshot(ctx, client_id) do
    Map.new(@schemas, fn schema ->
      rows = query(schema, ctx, client_id) |> order_by([r], asc: r.id) |> Repo.all()
      {schema, Enum.map(rows, &Map.take(&1, schema.__schema__(:fields)))}
    end)
  end

  @spec token(Ctx.t(), String.t(), map(), Date.t()) :: String.t()
  def token(ctx, client_id, before, today) do
    payload = %{
      business_id: ctx.business_id,
      client_id: client_id,
      before: before,
      today: today,
      after: fingerprint(snapshot(ctx, client_id))
    }

    Phoenix.Token.encrypt(EasyWeb.Endpoint, @salt, payload)
  end

  @spec restore(Ctx.t(), String.t(), String.t(), Date.t()) :: {:ok, :restored} | {:error, :conflict}
  def restore(ctx, client_id, token, today) do
    with {:ok, payload} <- Phoenix.Token.decrypt(EasyWeb.Endpoint, @salt, token, max_age: 86_400),
         true <- payload.business_id == ctx.business_id and payload.client_id == client_id,
         true <- payload.today == today,
         true <- payload.after == fingerprint(snapshot(ctx, client_id)) do
      Enum.each(Enum.reverse(@schemas), fn schema -> Repo.delete_all(query(schema, ctx, client_id)) end)
      Enum.each(@schemas, fn schema -> Repo.insert_all(schema, payload.before[schema]) end)
      {:ok, :restored}
    else
      _ -> {:error, :conflict}
    end
  end

  defp fingerprint(rows), do: :crypto.hash(:sha256, :erlang.term_to_binary(rows))

  defp query(MealOption, ctx, client_id) do
    from(o in MealOption,
      join: p in NutritionPreset,
      on: p.id == o.nutrition_preset_id and p.business_id == o.business_id,
      where: o.business_id == ^ctx.business_id and p.client_id == ^client_id
    )
  end

  defp query(MealItem, ctx, client_id) do
    from(i in MealItem,
      join: o in MealOption,
      on: o.id == i.meal_option_id and o.business_id == i.business_id,
      join: p in NutritionPreset,
      on: p.id == o.nutrition_preset_id and p.business_id == o.business_id,
      where: i.business_id == ^ctx.business_id and p.client_id == ^client_id
    )
  end

  defp query(schema, ctx, client_id), do: schema.for_client(ctx.business_id, client_id)
end
