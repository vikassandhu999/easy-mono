defmodule Easy.Training.Programming do
  alias Easy.ClientAccess
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Revision
  alias Easy.Training.{PlanCopy, PlanReader, PrescriptionWriter, TrainingPlan}

  import Ecto.Query

  @spec create_template(Ctx.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_template(%Ctx{} = ctx, attrs) do
    with :ok <- Ctx.ensure_coach(ctx) do
      ctx.business_id
      |> TrainingPlan.insert_changeset(ctx.user_id, attrs)
      |> Repo.insert()
      |> finalize_mutation(&PlanReader.get_template(ctx, &1))
    end
  end

  @spec duplicate_template(Ctx.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_template(%Ctx{} = ctx, template_id) do
    finalize_mutation(PlanCopy.duplicate_template(ctx, template_id), &PlanReader.get_template(ctx, &1))
  end

  @spec assign_template_to_client(Ctx.t(), String.t(), String.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def assign_template_to_client(%Ctx{} = ctx, client_id, template_id, attrs) do
    ctx
    |> PlanCopy.assign_template_to_client(client_id, template_id, attrs)
    |> finalize_mutation(&PlanReader.get_plan(ctx, &1))
  end

  @spec update_plan(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_plan(%Ctx{} = ctx, plan_id, expected_revision, attrs) do
    mutate_plan(ctx, plan_id, expected_revision, fn plan ->
      plan
      |> TrainingPlan.update_changeset(attrs)
      |> Repo.update()
    end)
  end

  @spec replace_prescription(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def replace_prescription(%Ctx{} = ctx, plan_id, expected_revision, attrs) do
    mutate_plan(ctx, plan_id, expected_revision, fn plan ->
      PrescriptionWriter.replace(ctx, plan, attrs)
    end)
  end

  @spec archive_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def archive_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &archive/1)
  end

  @spec restore_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def restore_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &restore/1)
  end

  @spec delete_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &Repo.delete/1, reload?: false)
  end

  defp mutate_plan(ctx, plan_id, expected_revision, mutation, opts \\ []) do
    with :ok <- Ctx.ensure_coach(ctx) do
      result = Repo.transact(fn -> mutate_locked_plan(ctx, plan_id, expected_revision, mutation) end)
      finalize_mutation(result, if(Keyword.get(opts, :reload?, true), do: &PlanReader.get_plan(ctx, &1)))
    end
  end

  defp mutate_locked_plan(ctx, plan_id, expected_revision, mutation) do
    plan =
      TrainingPlan
      |> TrainingPlan.for_business(ctx.business_id)
      |> lock("FOR UPDATE")
      |> Repo.get(plan_id)

    with :ok <- authorize_plan(ctx, plan),
         :ok <- Revision.check(plan, expected_revision) do
      mutation.(plan)
    end
  end

  defp finalize_mutation({:ok, plan}, nil), do: {:ok, plan}
  defp finalize_mutation({:ok, plan}, reload), do: reload.(plan.id)
  defp finalize_mutation({:error, reason}, _reload), do: {:error, reason}

  defp archive(%TrainingPlan{archived_at: archived_at} = plan) when not is_nil(archived_at),
    do: {:ok, plan}

  defp archive(plan) do
    plan
    |> TrainingPlan.lifecycle_changeset(DateTime.utc_now(:second))
    |> Repo.update()
  end

  defp restore(%TrainingPlan{archived_at: nil} = plan), do: {:ok, plan}

  defp restore(plan) do
    plan
    |> TrainingPlan.lifecycle_changeset(nil)
    |> Repo.update()
  end

  defp authorize_plan(_ctx, nil), do: {:error, :not_found}
  defp authorize_plan(_ctx, %TrainingPlan{kind: :template}), do: :ok

  defp authorize_plan(ctx, %TrainingPlan{kind: :client_plan, client_id: client_id}),
    do: ClientAccess.authorize_client_id(ctx, client_id)
end
