defmodule Easy.PlanOverlap do
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.PlanCoverage
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @spec validate(Ctx.t(), Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate(%Ctx{} = ctx, %{valid?: true} = changeset) do
    case apply_changes(changeset) do
      %{kind: :client_plan, start_date: %Date{}, archived_at: nil} = plan -> validate_scheduled(ctx, changeset, plan)
      _plan -> changeset
    end
  end

  def validate(%Ctx{}, changeset), do: changeset

  defp validate_scheduled(ctx, changeset, plan) do
    now = DateTime.utc_now(:second)
    changeset = if plan.inserted_at, do: changeset, else: put_change(changeset, :inserted_at, now)
    client = lock_client(ctx, plan.client_id, now)
    candidate = %{apply_changes(changeset) | client: client}

    others =
      Repo.all(
        from(p in plan.__struct__,
          where: p.business_id == ^ctx.business_id and p.client_id == ^plan.client_id,
          where: p.kind == :client_plan and is_nil(p.archived_at) and not is_nil(p.start_date)
        )
      )

    if Enum.any?(others, &(&1.id != plan.id and overlaps?(candidate, %{&1 | client: client}))) do
      add_error(changeset, :start_date, overlap_message(plan))
    else
      changeset
    end
  end

  defp lock_client(ctx, client_id, now) do
    client =
      Client
      |> Client.for_business(ctx.business_id)
      |> lock("FOR UPDATE")
      |> Repo.get(client_id)
      |> Repo.preload([:business, :terms])

    today = Client.local_date(client, now)
    %{client | terms: Enum.filter(client.terms, &(&1.ends_on && Date.before?(&1.ends_on, today)))}
  end

  defp overlaps?(left, right) do
    left_end = PlanCoverage.effective_end(left)
    right_end = PlanCoverage.effective_end(right)

    not before?(left_end, left.start_date) and not before?(right_end, right.start_date) and
      not before?(left_end, right.start_date) and not before?(right_end, left.start_date)
  end

  defp before?(nil, _date), do: false
  defp before?(ending, date), do: Date.before?(ending, date)

  defp overlap_message(%Easy.Training.TrainingPlan{}),
    do: "overlaps an existing training plan; choose dates outside its period"

  defp overlap_message(%Easy.Nutrition.Plan{}), do: "overlaps another Client Plan's Coverage"
end
