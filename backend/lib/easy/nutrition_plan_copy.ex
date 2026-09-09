defmodule Easy.Nutrition.PlanCopy do
  alias Easy.ClientAccess
  alias Easy.Clients
  alias Easy.CopyName
  alias Easy.Ctx
  alias Easy.Nutrition.Plan
  alias Easy.Orgs.Business
  alias Easy.Repo

  import Ecto.Query

  @spec duplicate_template(Ctx.t(), String.t()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_template(%Ctx{} = ctx, template_id) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Repo.transact(fn ->
        lock_business_for_copy_name(ctx.business_id)
        duplicate_locked_template(ctx, template_id)
      end)
    end
  end

  @spec assign_template_to_client(Ctx.t(), String.t(), String.t(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def assign_template_to_client(%Ctx{} = ctx, client_id, template_id, attrs) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Repo.transact(fn -> assign_visible_template(ctx, client_id, template_id, attrs) end)
    end
  end

  defp duplicate_locked_template(ctx, template_id) do
    with {:ok, template} <- get_locked_active_template(ctx, template_id) do
      copy_template(ctx, template)
    end
  end

  defp assign_visible_template(ctx, client_id, template_id, attrs) do
    with :ok <- ClientAccess.authorize_client_id(ctx, client_id),
         {:ok, template} <- get_locked_active_template(ctx, template_id) do
      copy_template_to_client(ctx, client_id, template, attrs)
    end
  end

  defp get_locked_active_template(ctx, template_id) do
    template =
      ctx
      |> template_query()
      |> Plan.for_archived(false)
      |> lock("FOR UPDATE")
      |> Repo.get(template_id)

    if template, do: {:ok, template}, else: {:error, :not_found}
  end

  defp copy_template(ctx, template) do
    names = Repo.all(from(p in template_query(ctx), select: p.name))
    name = CopyName.next(template.name, names)

    ctx.business_id
    |> Plan.copy_changeset(ctx.user_id, template, name)
    |> Repo.insert()
  end

  defp copy_template_to_client(ctx, client_id, template, attrs) do
    with {:ok, copy} <-
           Plan.assign_changeset(ctx.business_id, ctx.user_id, client_id, template, attrs)
           |> Repo.insert(),
         {:ok, _count} <- Clients.advance_stage_to_coaching(ctx, client_id) do
      {:ok, copy}
    end
  end

  # The business row serializes "(Copy)" name generation across concurrent
  # duplicates.
  defp lock_business_for_copy_name(business_id) do
    Business
    |> where([business], business.id == ^business_id)
    |> select([business], business.id)
    |> lock("FOR UPDATE")
    |> Repo.one()
  end

  defp template_query(%Ctx{} = ctx) do
    Plan
    |> Plan.for_business(ctx.business_id)
    |> Plan.templates()
  end
end
