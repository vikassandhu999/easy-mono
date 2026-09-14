defmodule Easy.Nutrition.LibraryUsage do
  alias Easy.Clients.Client
  alias Easy.{Ctx, CursorPage, Repo, Search}
  alias Easy.Nutrition.{Food, Plan, PlanReader, Recipe}

  import Ecto.Query

  @spec page(Ctx.t(), :food | :recipe, String.t(), keyword()) ::
          {:ok, map()} | {:error, :not_found | :invalid_cursor | :conflict}
  def page(%Ctx{} = ctx, kind, id, opts) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Repo.snapshot(fn -> load_page(ctx, kind, id, opts) end)
    end
  end

  defp load_page(ctx, kind, id, opts) do
    with {:ok, item} <- item(ctx, kind, id) do
      queries = usage_queries(ctx, kind, id)
      category = category(Keyword.get(opts, :kind))
      query = queries |> Map.fetch!(category) |> search(Keyword.get(opts, :search))
      limit = CursorPage.limit(opts)

      with {:ok, page_query} <- CursorPage.query(query, Keyword.get(opts, :cursor) || "start", limit) do
        page = CursorPage.finish(Repo.all(page_query), limit, Repo.aggregate(query, :count, :id))
        counts = count_queries(queries)

        {:ok,
         Map.merge(page, %{
           item: item,
           counts: counts,
           delete_blocked_reason: delete_blocked_reason(ctx, kind, id, item, counts)
         })}
      end
    end
  end

  defp count_queries(queries) do
    Map.new(queries, fn {key, query} -> {key, Repo.aggregate(query, :count, :id)} end)
  end

  defp item(ctx, :food, id) do
    Food.for_business_or_system(ctx.business_id)
    |> select([food], %{id: food.id, name: food.name, read_only: food.source == :system})
    |> Repo.get(id)
    |> found()
  end

  defp item(ctx, :recipe, id) do
    Recipe.for_business(ctx.business_id)
    |> select([recipe], %{id: recipe.id, name: recipe.name, read_only: false})
    |> Repo.get(id)
    |> found()
  end

  defp found(nil), do: {:error, :not_found}
  defp found(item), do: {:ok, item}

  defp usage_queries(ctx, kind, id) do
    plans = Plan.for_business(ctx.business_id) |> Plan.for_menu_item(kind, id)
    clients = Client.for_business(ctx.business_id) |> Client.visible_to(ctx) |> select([client], client.id)

    %{
      recipes: recipe_query(ctx.business_id, kind, id),
      templates: plans |> Plan.templates() |> plan_projection(),
      client_plans:
        plans
        |> Plan.for_kind(:client_plan)
        |> where([plan], plan.client_id in subquery(clients))
        |> plan_projection()
    }
  end

  defp recipe_query(business_id, :food, id) do
    Recipe.using_food(business_id, id)
    |> select([recipe], %{id: recipe.id, name: recipe.name, client_id: nil, kind: "recipe", inserted_at: recipe.inserted_at})
  end

  defp recipe_query(business_id, :recipe, _id) do
    Recipe.for_business(business_id)
    |> where(false)
    |> select([recipe], %{id: recipe.id, name: recipe.name, client_id: nil, kind: "recipe", inserted_at: recipe.inserted_at})
  end

  defp plan_projection(query) do
    select(query, [plan], %{
      id: plan.id,
      name: plan.name,
      client_id: plan.client_id,
      kind: plan.kind,
      inserted_at: plan.inserted_at
    })
  end

  defp search(query, value) when value in [nil, ""], do: query
  defp search(query, value), do: where(query, [item], ilike(item.name, ^Search.like_pattern(String.trim(value))))

  defp category(value) when value in ["recipes", :recipes], do: :recipes
  defp category(value) when value in ["client_plans", :client_plans], do: :client_plans
  defp category(_value), do: :templates

  defp delete_blocked_reason(_ctx, _kind, _id, %{read_only: true}, _counts), do: :shared_food

  defp delete_blocked_reason(ctx, kind, id, _item, counts) do
    if counts.recipes > 0 or PlanReader.library_item_used?(ctx, kind, id), do: :in_use, else: nil
  end
end
