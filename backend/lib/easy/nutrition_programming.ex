defmodule Easy.Nutrition.Programming do
  alias Easy.Clients
  alias Easy.CopyName
  alias Easy.Ctx
  alias Easy.Nutrition.{DayPattern, Plan, WeekSchedule}
  alias Easy.Orgs.Business
  alias Easy.Repo
  alias Easy.Utils

  import Ecto.Changeset
  import Ecto.Query

  @everyday "Everyday"

  @spec create_template(Ctx.t(), map()) :: {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_template(%Ctx{} = ctx, attrs) do
    with :ok <- ensure_coach(ctx) do
      result =
        Repo.transaction(fn ->
          with {:ok, plan} <- ctx.business_id |> Plan.insert_changeset(ctx.user_id, attrs) |> Repo.insert(),
               {:ok, pattern} <- insert_everyday_pattern(plan),
               :ok <- assign_everyday_week(plan, pattern) do
            plan
          else
            {:error, reason} -> Repo.rollback(reason)
          end
        end)

      preload_created(result, ctx.business_id)
    end
  end

  @spec list_templates(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), templates: [Plan.t()]}} | {:error, :not_found}
  def list_templates(%Ctx{} = ctx, opts \\ []) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = opts |> Keyword.get(:limit, 20) |> max(1) |> min(100)
    search = opts |> Keyword.get(:search, "") |> to_string() |> String.trim()
    archived = Keyword.get(opts, :archived)

    with :ok <- ensure_coach(ctx) do
      query =
        ctx
        |> template_query()
        |> Plan.for_archived(archived)
        |> Plan.for_search(search)

      templates =
        query
        |> Plan.newest()
        |> Utils.paginate(offset, limit)
        |> Plan.join_assigned_client_count(ctx.business_id)
        |> Plan.include_menu(ctx.business_id)
        |> Repo.all()

      {:ok, %{count: Repo.aggregate(query, :count, :id), templates: templates}}
    end
  end

  @spec list_plans_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [Plan.t()]}} | {:error, :not_found}
  def list_plans_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = opts |> Keyword.get(:limit, 20) |> max(1) |> min(100)
    archived = Keyword.get(opts, :archived)

    with :ok <- ensure_coach(ctx),
         {:ok, _client} <- Clients.authorize_client(ctx, client_id) do
      query =
        Plan
        |> Plan.for_kind(:client_plan)
        |> Plan.for_client(ctx.business_id, client_id)
        |> Plan.for_archived(archived)

      plans =
        query
        |> Plan.newest()
        |> Utils.paginate(offset, limit)
        |> Plan.include_menu(ctx.business_id)
        |> Plan.include_client(ctx.business_id)
        |> Repo.all()

      {:ok, %{count: Repo.aggregate(query, :count, :id), plans: plans}}
    end
  end

  @spec list_client_plans(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [Plan.t()]}} | {:error, :not_found}
  def list_client_plans(%Ctx{} = ctx, opts \\ []) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = opts |> Keyword.get(:limit, 20) |> max(1) |> min(100)
    archived = Keyword.get(opts, :archived)

    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      query =
        ctx
        |> client_plan_query(client_id)
        |> Plan.for_archived(archived)

      plans =
        query
        |> Plan.newest()
        |> Utils.paginate(offset, limit)
        |> Plan.include_menu(ctx.business_id)
        |> Repo.all()

      {:ok, %{count: Repo.aggregate(query, :count, :id), plans: plans}}
    end
  end

  @spec get_client_plan(Ctx.t(), String.t()) :: {:ok, Plan.t()} | {:error, :not_found}
  def get_client_plan(%Ctx{} = ctx, plan_id) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      ctx
      |> client_plan_query(client_id)
      |> Plan.include_menu(ctx.business_id)
      |> Repo.get(plan_id)
      |> ok_or_not_found()
    end
  end

  @spec get_template(Ctx.t(), String.t()) :: {:ok, Plan.t()} | {:error, :not_found}
  def get_template(%Ctx{} = ctx, template_id) do
    with :ok <- ensure_coach(ctx) do
      ctx
      |> template_query()
      |> Plan.join_assigned_client_count(ctx.business_id)
      |> Plan.include_menu(ctx.business_id)
      |> Repo.get(template_id)
      |> ok_or_not_found()
    end
  end

  @spec get_plan(Ctx.t(), String.t()) :: {:ok, Plan.t()} | {:error, :not_found}
  def get_plan(%Ctx{} = ctx, plan_id) do
    with :ok <- ensure_coach(ctx),
         {:ok, plan} <-
           ctx
           |> plan_query()
           |> Plan.join_assigned_client_count(ctx.business_id)
           |> Plan.include_menu(ctx.business_id)
           |> Plan.include_client(ctx.business_id)
           |> Repo.get(plan_id)
           |> ok_or_not_found(),
         :ok <- authorize_plan(ctx, plan) do
      {:ok, plan}
    end
  end

  @spec update_template(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_template(%Ctx{} = ctx, template_id, expected_revision, attrs) do
    mutate_template(ctx, template_id, expected_revision, &update_active(&1, attrs))
  end

  @spec update_plan(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_plan(%Ctx{} = ctx, plan_id, expected_revision, attrs) do
    mutate_plan(ctx, plan_id, expected_revision, &update_active(&1, attrs))
  end

  @spec archive_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def archive_template(%Ctx{} = ctx, template_id, expected_revision) do
    mutate_template(ctx, template_id, expected_revision, &archive/1)
  end

  @spec archive_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def archive_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &archive/1)
  end

  @spec restore_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def restore_template(%Ctx{} = ctx, template_id, expected_revision) do
    mutate_template(ctx, template_id, expected_revision, &restore/1)
  end

  @spec restore_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def restore_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &restore/1)
  end

  @spec delete_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_template(%Ctx{} = ctx, template_id, expected_revision) do
    mutate_template(ctx, template_id, expected_revision, &Repo.delete/1, reload?: false)
  end

  @spec delete_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &Repo.delete/1, reload?: false)
  end

  @spec duplicate_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_template(%Ctx{} = ctx, template_id, expected_revision) do
    with :ok <- ensure_coach(ctx) do
      result =
        Repo.transaction(fn ->
          lock_business_for_duplicate_name(ctx.business_id)
          duplicate_locked_template(ctx, template_id, expected_revision)
        end)

      finalize_template_mutation(result, ctx, true)
    end
  end

  defp insert_everyday_pattern(plan) do
    DayPattern.insert_changeset(plan.business_id, plan.id, %{name: @everyday, position: 0})
    |> Repo.insert()
  end

  defp assign_everyday_week(plan, pattern) do
    Enum.reduce_while(WeekSchedule.weekdays(), :ok, fn weekday, :ok ->
      case WeekSchedule.insert_changeset(plan.business_id, plan.id, pattern.id, %{weekday: weekday})
           |> Repo.insert() do
        {:ok, _row} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp update_active(%Plan{archived_at: archived_at} = plan, _attrs) when not is_nil(archived_at) do
    {:error, archived_changeset(plan)}
  end

  defp update_active(plan, attrs) do
    plan
    |> Plan.update_changeset(attrs)
    |> put_change(:revision, plan.revision + 1)
    |> Repo.update()
  end

  defp archive(%Plan{archived_at: archived_at} = plan) when not is_nil(archived_at), do: {:ok, plan}

  defp archive(plan) do
    plan
    |> Plan.lifecycle_changeset(%{archived_at: DateTime.utc_now(:second), revision: plan.revision + 1})
    |> Repo.update()
  end

  defp restore(%Plan{archived_at: nil} = plan), do: {:ok, plan}

  defp restore(plan) do
    plan
    |> Plan.lifecycle_changeset(%{archived_at: nil, revision: plan.revision + 1})
    |> Repo.update()
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

  defp duplicate_locked_template(ctx, template_id, expected_revision) do
    template =
      ctx
      |> template_query()
      |> Plan.for_archived(false)
      |> lock("FOR UPDATE")
      |> Repo.get(template_id)

    template
    |> mutate_revisioned(expected_revision, fn locked ->
      locked
      |> preload_duplicate_source()
      |> then(&duplicate_template_rows(ctx, &1))
    end)
  end

  defp preload_duplicate_source(template) do
    Plan
    |> Plan.for_business(template.business_id)
    |> Plan.include_menu(template.business_id)
    |> Repo.get(template.id)
  end

  defp duplicate_template_rows(ctx, template) do
    attrs = %{
      name: duplicate_template_name(template.name, ctx.business_id),
      description: template.description,
      target_calories: template.target_calories,
      target_protein_g: template.target_protein_g,
      target_carbs_g: template.target_carbs_g,
      target_fat_g: template.target_fat_g,
      target_fiber_g: template.target_fiber_g
    }

    with {:ok, copy} <- Plan.insert_changeset(ctx.business_id, ctx.user_id, attrs) |> Repo.insert(),
         {:ok, pattern_ids} <- duplicate_day_pattern_rows(template.day_patterns, copy),
         :ok <- duplicate_schedule_rows(template.week_schedule, copy, pattern_ids) do
      {:ok, copy}
    end
  end

  defp duplicate_day_pattern_rows(patterns, copy) do
    Enum.reduce_while(patterns, {:ok, %{}}, fn pattern, {:ok, ids} ->
      attrs = %{name: pattern.name, position: pattern.position}

      case DayPattern.insert_changeset(copy.business_id, copy.id, attrs) |> Repo.insert() do
        {:ok, copied} -> {:cont, {:ok, Map.put(ids, pattern.id, copied.id)}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp duplicate_schedule_rows(schedule, copy, pattern_ids) do
    Enum.reduce_while(schedule, :ok, fn row, :ok ->
      copied_pattern_id = Map.fetch!(pattern_ids, row.nutrition_day_pattern_id)

      case WeekSchedule.insert_changeset(copy.business_id, copy.id, copied_pattern_id, %{weekday: row.weekday})
           |> Repo.insert() do
        {:ok, _row} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp duplicate_template_name(original_name, business_id) do
    existing_names =
      Plan
      |> Plan.for_business(business_id)
      |> Plan.templates()
      |> select([template], template.name)
      |> Repo.all()

    CopyName.next(original_name, existing_names)
  end

  defp lock_business_for_duplicate_name(business_id) do
    Business
    |> where([business], business.id == ^business_id)
    |> select([business], business.id)
    |> lock("FOR UPDATE")
    |> Repo.one()
  end

  defp mutate_revisioned(nil, _expected_revision, _mutation), do: Repo.rollback(:not_found)

  defp mutate_revisioned(%Plan{revision: revision} = plan, expected_revision, _mutation)
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

  defp preload_created({:ok, plan}, business_id) do
    {:ok,
     Plan
     |> Plan.for_business(business_id)
     |> Plan.join_assigned_client_count(business_id)
     |> Plan.include_menu(business_id)
     |> Repo.get(plan.id)}
  end

  defp preload_created(error, _business_id), do: error

  defp authorize_locked_plan(_ctx, nil), do: :error
  defp authorize_locked_plan(ctx, plan), do: if(authorize_plan(ctx, plan) == :ok, do: :ok, else: :error)

  defp authorize_plan(_ctx, %Plan{kind: :template}), do: :ok
  defp authorize_plan(ctx, %Plan{kind: :client_plan, client_id: client_id}), do: Clients.authorize_client_id(ctx, client_id)

  defp stale_revision_changeset(plan) do
    plan
    |> change()
    |> add_error(:revision, "is stale")
    |> Map.put(:action, :stale_revision)
  end

  defp archived_changeset(plan) do
    plan
    |> change()
    |> add_error(:archived_at, "is read-only")
  end

  defp template_query(%Ctx{} = ctx) do
    Plan
    |> Plan.for_business(ctx.business_id)
    |> Plan.templates()
  end

  defp client_plan_query(%Ctx{} = ctx, client_id) do
    Plan
    |> Plan.for_kind(:client_plan)
    |> Plan.for_client(ctx.business_id, client_id)
  end

  defp plan_query(%Ctx{} = ctx), do: Plan.for_business(Plan, ctx.business_id)

  defp ensure_coach(%Ctx{coach_id: coach_id}) when not is_nil(coach_id), do: :ok
  defp ensure_coach(%Ctx{}), do: {:error, :not_found}

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(value), do: {:ok, value}
end
