defmodule Easy.Training.Programming do
  alias Easy.Clients
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Training.TrainingPlan
  alias Easy.Utils

  import Ecto.Changeset
  import Ecto.Query

  @spec create_template(Ctx.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_template(%Ctx{} = ctx, attrs) do
    with :ok <- ensure_coach(ctx) do
      ctx.business_id
      |> TrainingPlan.insert_changeset(ctx.user_id, attrs)
      |> Repo.insert()
      |> preload_template(ctx.business_id)
    end
  end

  @spec list_templates(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), templates: [TrainingPlan.t()]}} | {:error, :not_found}
  def list_templates(%Ctx{} = ctx, opts \\ []) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = opts |> Keyword.get(:limit, 20) |> max(1) |> min(100)
    search = opts |> Keyword.get(:search, "") |> to_string() |> String.trim()
    archived = Keyword.get(opts, :archived)

    with :ok <- ensure_coach(ctx) do
      query =
        ctx
        |> template_query()
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
  end

  @spec get_template(Ctx.t(), String.t()) :: {:ok, TrainingPlan.t()} | {:error, :not_found}
  def get_template(%Ctx{} = ctx, template_id) do
    with :ok <- ensure_coach(ctx) do
      ctx
      |> template_query()
      |> TrainingPlan.include_workouts(ctx.business_id)
      |> Repo.get(template_id)
      |> ok_or_not_found()
    end
  end

  @spec get_plan(Ctx.t(), String.t()) :: {:ok, TrainingPlan.t()} | {:error, :not_found}
  def get_plan(%Ctx{} = ctx, plan_id) do
    with :ok <- ensure_coach(ctx),
         {:ok, plan} <-
           ctx
           |> plan_query()
           |> TrainingPlan.include_workouts(ctx.business_id)
           |> TrainingPlan.include_client(ctx.business_id)
           |> Repo.get(plan_id)
           |> ok_or_not_found(),
         :ok <- authorize_plan(ctx, plan) do
      {:ok, plan}
    end
  end

  @spec update_template(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, TrainingPlan.t()}
          | {:error, :not_found | Ecto.Changeset.t()}
  def update_template(%Ctx{} = ctx, template_id, expected_revision, attrs) do
    mutate_template(ctx, template_id, expected_revision, fn template ->
      template
      |> TrainingPlan.update_changeset(attrs)
      |> put_change(:revision, template.revision + 1)
      |> Repo.update()
    end)
  end

  @spec update_plan(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_plan(%Ctx{} = ctx, plan_id, expected_revision, attrs) do
    mutate_plan(ctx, plan_id, expected_revision, fn plan ->
      plan
      |> TrainingPlan.update_changeset(attrs)
      |> put_change(:revision, plan.revision + 1)
      |> Repo.update()
    end)
  end

  @spec archive_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def archive_template(%Ctx{} = ctx, template_id, expected_revision) do
    mutate_template(ctx, template_id, expected_revision, &archive/1)
  end

  @spec archive_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def archive_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &archive/1)
  end

  @spec restore_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def restore_template(%Ctx{} = ctx, template_id, expected_revision) do
    mutate_template(ctx, template_id, expected_revision, &restore/1)
  end

  @spec restore_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def restore_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &restore/1)
  end

  @spec delete_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_template(%Ctx{} = ctx, template_id, expected_revision) do
    mutate_template(ctx, template_id, expected_revision, &Repo.delete/1, reload?: false)
  end

  @spec delete_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &Repo.delete/1, reload?: false)
  end

  defp mutate_template(ctx, template_id, expected_revision, mutation, opts \\ []) do
    with :ok <- ensure_coach(ctx) do
      result = Repo.transaction(fn -> mutate_locked_template(ctx, template_id, expected_revision, mutation) end)
      finalize_template_mutation(result, ctx, Keyword.get(opts, :reload?, true))
    end
  end

  defp mutate_plan(ctx, plan_id, expected_revision, mutation, opts \\ []) do
    with :ok <- ensure_coach(ctx) do
      result = Repo.transaction(fn -> mutate_locked_plan(ctx, plan_id, expected_revision, mutation) end)
      finalize_plan_mutation(result, ctx, Keyword.get(opts, :reload?, true))
    end
  end

  defp mutate_locked_template(ctx, template_id, expected_revision, mutation) do
    template = ctx |> template_query() |> lock("FOR UPDATE") |> Repo.get(template_id)
    mutate_revisioned(template, expected_revision, mutation)
  end

  defp mutate_locked_plan(ctx, plan_id, expected_revision, mutation) do
    plan = ctx |> plan_query() |> lock("FOR UPDATE") |> Repo.get(plan_id)

    case authorize_locked_plan(ctx, plan) do
      :ok -> mutate_revisioned(plan, expected_revision, mutation)
      :error -> Repo.rollback(:not_found)
    end
  end

  defp authorize_locked_plan(_ctx, nil), do: :error
  defp authorize_locked_plan(ctx, plan), do: if(authorize_plan(ctx, plan) == :ok, do: :ok, else: :error)

  defp mutate_revisioned(nil, _expected_revision, _mutation), do: Repo.rollback(:not_found)

  defp mutate_revisioned(%TrainingPlan{revision: revision} = plan, expected_revision, _mutation)
       when revision != expected_revision,
       do: Repo.rollback(stale_revision_changeset(plan))

  defp mutate_revisioned(plan, _expected_revision, mutation) do
    case mutation.(plan) do
      {:ok, changed} -> changed
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp finalize_template_mutation({:ok, template}, ctx, true), do: get_template(ctx, template.id)
  defp finalize_template_mutation({:ok, template}, _ctx, false), do: {:ok, template}
  defp finalize_template_mutation({:error, reason}, _ctx, _reload?), do: {:error, reason}

  defp finalize_plan_mutation({:ok, plan}, ctx, true), do: get_plan(ctx, plan.id)
  defp finalize_plan_mutation({:ok, plan}, _ctx, false), do: {:ok, plan}
  defp finalize_plan_mutation({:error, reason}, _ctx, _reload?), do: {:error, reason}

  defp archive(plan) do
    if plan.archived_at do
      {:ok, plan}
    else
      plan
      |> TrainingPlan.lifecycle_changeset(%{
        archived_at: DateTime.utc_now(:second),
        revision: plan.revision + 1
      })
      |> Repo.update()
    end
  end

  defp restore(plan) do
    if plan.archived_at do
      plan
      |> TrainingPlan.lifecycle_changeset(%{archived_at: nil, revision: plan.revision + 1})
      |> Repo.update()
    else
      {:ok, plan}
    end
  end

  defp template_query(%Ctx{} = ctx) do
    TrainingPlan
    |> TrainingPlan.for_business(ctx.business_id)
    |> TrainingPlan.templates()
  end

  defp plan_query(%Ctx{} = ctx), do: TrainingPlan.for_business(TrainingPlan, ctx.business_id)

  defp authorize_plan(_ctx, %TrainingPlan{kind: :template}), do: :ok

  defp authorize_plan(ctx, %TrainingPlan{kind: :client_plan, client_id: client_id}),
    do: Clients.authorize_client_id(ctx, client_id)

  defp stale_revision_changeset(plan) do
    plan
    |> change()
    |> add_error(:revision, "is stale")
    |> Map.put(:action, :stale_revision)
  end

  defp ensure_coach(%Ctx{coach_id: coach_id}) when not is_nil(coach_id), do: :ok
  defp ensure_coach(%Ctx{}), do: {:error, :not_found}

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(value), do: {:ok, value}

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
