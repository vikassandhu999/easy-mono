defmodule Easy.Nutrition.LibraryUsage do
  alias Easy.Ctx
  alias Easy.CursorPage
  alias Easy.Nutrition.Library
  alias Easy.Nutrition.Recipe
  alias Easy.Plans.Plan
  alias Easy.Plans.Revision
  alias Easy.Plans.Template
  alias Easy.Repo
  import Ecto.Query

  @spec page(Ctx.t(), atom(), String.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def page(ctx, kind, id, opts) do
    with {:ok, item} <- item(ctx, kind, id),
         query <- references(ctx, kind, id),
         filtered <- filter(query, opts),
         {:ok, paged} <- CursorPage.query(filtered, opts[:cursor] || "start", CursorPage.limit(opts)) do
      counts = Repo.all(from(r in query, group_by: r.kind, select: {r.kind, count(r.id)})) |> Map.new()
      result = CursorPage.finish(Repo.all(paged), CursorPage.limit(opts), Repo.aggregate(filtered, :count))

      {:ok,
       Map.merge(result, %{
         item: %{id: id, name: item.name, read_only: Map.get(item, :source) == :system},
         counts: %{
           recipes: Map.get(counts, "recipe", 0),
           templates: Map.get(counts, "template", 0),
           client_plans: Map.get(counts, "client_plan", 0)
         },
         delete_blocked_reason: if(Map.get(item, :source) == :system, do: :shared_food, else: nil)
       })}
    end
  end

  @spec impact(Ctx.t(), atom(), String.t()) :: {:ok, map()} | {:error, term()}
  def impact(ctx, kind, id) do
    with {:ok, _} <- item(ctx, kind, id) do
      rows = Repo.all(references(ctx, kind, id))

      {:ok,
       %{
         recipes: select_refs(rows, "recipe", [:id, :name]),
         templates: select_refs(rows, "template", [:id, :name, :client_id]),
         client_plans: select_refs(rows, "client_plan", [:id, :name, :client_id])
       }}
    end
  end

  defp select_refs(rows, kind, fields), do: rows |> Enum.filter(&(&1.kind == kind)) |> Enum.map(&Map.take(&1, fields))
  defp item(ctx, :food, id), do: Library.get_food(ctx, id)
  defp item(ctx, :recipe, id), do: Library.get_recipe(ctx, id)

  defp filter(query, opts) do
    kind =
      case opts[:kind] do
        value when value in [:recipes, "recipes"] -> "recipe"
        value when value in [:templates, "templates"] -> "template"
        value when value in [:client_plans, "client_plans"] -> "client_plan"
        _ -> nil
      end

    query = if kind, do: where(query, [r], r.kind == ^kind), else: query

    if opts[:search] in [nil, ""],
      do: query,
      else: where(query, [r], ilike(r.name, ^Easy.Search.like_pattern(opts[:search])))
  end

  defp references(ctx, kind, id) do
    needle = %{"meals" => [%{"items" => [%{"source" => %{"type" => to_string(kind), "id" => id}}]}]}

    templates =
      from(t in Template,
        where: t.business_id == ^ctx.business_id and t.domain == :nutrition and fragment("? @> ?::jsonb", t.content, ^needle),
        select: %{
          id: t.id,
          name: t.name,
          inserted_at: t.inserted_at,
          kind: "template",
          client_id: type(fragment("NULL"), :binary_id)
        }
      )

    plans =
      from(p in Plan,
        join: r in Revision,
        on: r.plan_id == p.id,
        where: p.business_id == ^ctx.business_id and p.domain == :nutrition and fragment("? @> ?::jsonb", r.content, ^needle),
        distinct: true,
        select: %{id: p.id, name: p.name, inserted_at: p.inserted_at, kind: "client_plan", client_id: p.client_id}
      )

    recipes =
      from(r in Recipe,
        where:
          r.business_id == ^ctx.business_id and ^(kind == :food) and
            fragment("to_jsonb(?) @> ?::jsonb", r.ingredients, ^[%{"food_id" => id}]),
        select: %{
          id: r.id,
          name: r.name,
          inserted_at: r.inserted_at,
          kind: "recipe",
          client_id: type(fragment("NULL"), :binary_id)
        }
      )

    from(r in subquery(templates |> union_all(^plans) |> union_all(^recipes)))
  end
end
