defmodule Easy.Nutrition.Programming do
  alias Easy.ClientAccess
  alias Easy.Ctx
  alias Easy.PlanOverlap

  alias Easy.Nutrition.{ItemResolver, Menu, Plan, PlanCopy, PlanReader}

  alias Easy.Repo
  alias Easy.Revision

  import Ecto.Changeset
  import Ecto.Query

  # Plan CRUD and lifecycle

  @spec create_template(Ctx.t(), map()) ::
          {:ok, Plan.t()} | {:error, PlanReader.read_error() | Ecto.Changeset.t()}
  def create_template(%Ctx{} = ctx, attrs) do
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, plan} <- ctx.business_id |> Plan.insert_changeset(ctx.user_id, attrs) |> Repo.insert() do
      PlanReader.get_template(ctx, plan.id)
    end
  end

  @spec update_plan(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Plan.t()} | {:error, PlanReader.read_error() | Ecto.Changeset.t()}
  def update_plan(%Ctx{} = ctx, plan_id, expected_revision, attrs) do
    mutate_plan(ctx, plan_id, expected_revision, &update_active(ctx, &1, attrs))
  end

  @spec archive_plan(Ctx.t(), String.t(), pos_integer() | :any) ::
          {:ok, Plan.t()} | {:error, PlanReader.read_error() | Ecto.Changeset.t()}
  def archive_plan(%Ctx{} = ctx, plan_id, expected_revision \\ :any) do
    mutate_plan(ctx, plan_id, expected_revision, &archive/1)
  end

  @spec restore_plan(Ctx.t(), String.t(), pos_integer() | :any) ::
          {:ok, Plan.t()} | {:error, PlanReader.read_error() | Ecto.Changeset.t()}
  def restore_plan(%Ctx{} = ctx, plan_id, expected_revision \\ :any) do
    mutate_plan(ctx, plan_id, expected_revision, &restore(ctx, &1))
  end

  @spec delete_plan(Ctx.t(), String.t(), pos_integer() | :any) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_plan(%Ctx{} = ctx, plan_id, expected_revision \\ :any) do
    mutate_plan(ctx, plan_id, expected_revision, &Repo.delete/1, reload?: false)
  end

  # Menu replacement

  @spec replace_menu(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Plan.t()} | {:error, PlanReader.read_error() | Ecto.Changeset.t()}
  def replace_menu(%Ctx{} = ctx, plan_id, expected_revision, attrs) do
    mutate_plan(ctx, plan_id, expected_revision, fn plan ->
      save_menu(ctx, plan, attrs)
    end)
  end

  @spec preview_menu(Ctx.t(), map()) :: {:ok, Menu.formatted()} | {:error, PlanReader.read_error() | Ecto.Changeset.t()}
  def preview_menu(%Ctx{} = ctx, attrs) do
    Repo.snapshot(fn ->
      with :ok <- Ctx.ensure_coach(ctx),
           {:ok, menu} <- Menu.cast(attrs),
           {:ok, resolved} <- ItemResolver.resolve(ctx, Menu.references(menu)) do
        {:ok, menu |> Menu.resolve(resolved) |> Menu.format()}
      end
    end)
  end

  # Assignment and duplication

  @spec duplicate_template(Ctx.t(), String.t()) ::
          {:ok, Plan.t()} | {:error, PlanReader.read_error() | Ecto.Changeset.t()}
  def duplicate_template(%Ctx{} = ctx, template_id) do
    finalize(PlanCopy.duplicate_template(ctx, template_id), &PlanReader.get_template(ctx, &1))
  end

  @spec assign_template_to_client(Ctx.t(), String.t(), String.t(), map()) ::
          {:ok, Plan.t()} | {:error, PlanReader.read_error() | Ecto.Changeset.t()}
  def assign_template_to_client(%Ctx{} = ctx, client_id, template_id, attrs) do
    finalize(PlanCopy.assign_template_to_client(ctx, client_id, template_id, attrs), &PlanReader.get_plan(ctx, &1))
  end

  # Plan lifecycle helpers

  defp save_menu(_ctx, %Plan{archived_at: archived_at} = plan, _attrs) when not is_nil(archived_at),
    do: {:error, archived_changeset(plan)}

  defp save_menu(ctx, plan, attrs) do
    with {:ok, menu} <- Menu.cast(attrs),
         {:ok, _resolved} <- ItemResolver.resolve_for_write(ctx, Menu.references(menu)) do
      plan
      |> Plan.menu_changeset(menu)
      |> Repo.update()
    else
      {:error, :invalid_portion} -> {:error, add_error(change(plan), :menu, "contains an invalid Portion")}
      {:error, reason} -> {:error, reason}
    end
  end

  defp update_active(_ctx, %Plan{archived_at: archived_at} = plan, _attrs)
       when not is_nil(archived_at) do
    {:error, archived_changeset(plan)}
  end

  defp update_active(ctx, plan, attrs) do
    plan
    |> Plan.update_changeset(attrs)
    |> then(&PlanOverlap.validate(ctx, &1))
    |> Repo.update()
  end

  defp archive(%Plan{archived_at: archived_at} = plan) when not is_nil(archived_at),
    do: {:ok, plan}

  defp archive(plan) do
    plan
    |> Plan.lifecycle_changeset(DateTime.utc_now(:second))
    |> Repo.update()
  end

  defp restore(_ctx, %Plan{archived_at: nil} = plan), do: {:ok, plan}

  defp restore(ctx, plan) do
    plan
    |> Plan.lifecycle_changeset(nil)
    |> then(&PlanOverlap.validate(ctx, &1))
    |> Repo.update()
  end

  # Shared plan plumbing

  defp mutate_plan(ctx, plan_id, expected_revision, mutation, opts \\ []) do
    with :ok <- Ctx.ensure_coach(ctx) do
      result =
        Repo.transact(fn -> mutate_locked_plan(ctx, plan_id, expected_revision, mutation) end)

      finalize(result, if(Keyword.get(opts, :reload?, true), do: &PlanReader.get_plan(ctx, &1)))
    end
  end

  defp mutate_locked_plan(ctx, plan_id, expected_revision, mutation) do
    plan =
      Plan
      |> Plan.for_business(ctx.business_id)
      |> Plan.include_client(ctx.business_id)
      |> lock("FOR UPDATE")
      |> Repo.get(plan_id)

    with :ok <- authorize_plan(ctx, plan),
         :ok <- Revision.check(plan, expected_revision) do
      mutation.(plan)
    end
  end

  defp finalize({:ok, plan}, nil), do: {:ok, plan}
  defp finalize({:ok, plan}, reload), do: reload.(plan.id)
  defp finalize({:error, reason}, _reload), do: {:error, reason}

  defp authorize_plan(_ctx, nil), do: {:error, :not_found}
  defp authorize_plan(_ctx, %Plan{kind: :template}), do: :ok

  defp authorize_plan(ctx, %Plan{kind: :client_plan, client_id: client_id}),
    do: ClientAccess.authorize_client_id(ctx, client_id)

  defp archived_changeset(plan) do
    plan
    |> change()
    |> add_error(:archived_at, "is read-only")
  end
end
