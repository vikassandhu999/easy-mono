defmodule Easy.Training.Programming do
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Training.TrainingPlan
  alias Easy.Utils

  @spec create_template(Ctx.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, Ecto.Changeset.t()}
  def create_template(%Ctx{} = ctx, attrs) do
    ctx.business_id
    |> TrainingPlan.insert_changeset(ctx.user_id, attrs)
    |> Repo.insert()
    |> preload_template(ctx.business_id)
  end

  @spec list_templates(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), templates: [TrainingPlan.t()]}}
  def list_templates(%Ctx{} = ctx, opts \\ []) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = opts |> Keyword.get(:limit, 20) |> max(1) |> min(100)
    search = opts |> Keyword.get(:search, "") |> to_string() |> String.trim()
    archived = Keyword.get(opts, :archived)

    query =
      TrainingPlan
      |> TrainingPlan.for_business(ctx.business_id)
      |> TrainingPlan.for_kind(:template)
      |> TrainingPlan.for_archived(archived)
      |> TrainingPlan.for_search(search)

    templates =
      query
      |> TrainingPlan.newest()
      |> Utils.paginate(offset, limit)
      |> TrainingPlan.include_workouts(ctx.business_id)
      |> Repo.all()

    {:ok, %{count: Repo.aggregate(query, :count, :id), templates: templates}}
  end

  defp preload_template({:ok, template}, business_id) do
    template =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.include_workouts(business_id)
      |> Repo.get(template.id)

    {:ok, template}
  end

  defp preload_template(error, _business_id), do: error
end
