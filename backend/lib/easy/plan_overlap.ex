defmodule Easy.PlanOverlap do
  import Ecto.Changeset
  import Ecto.Query
  alias Easy.Clients.Client
  alias Easy.{Ctx, Repo}

  @spec validate(Ctx.t(), Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate(%Ctx{} = ctx, %{valid?: true} = cs) do
    case apply_changes(cs) do
      %{client_id: id} when not is_nil(id) -> validate_client_plan(ctx, cs)
      _ -> cs
    end
  end

  def validate(%Ctx{}, cs), do: cs

  defp validate_client_plan(ctx, cs) do
    plan = apply_changes(cs)

    client =
      Repo.one(from(c in Client, where: c.id == ^plan.client_id and c.business_id == ^ctx.business_id, lock: "FOR UPDATE"))
      |> Repo.preload(:business)

    cs =
      if plan.created_local_date,
        do: cs,
        else: put_change(cs, :created_local_date, Client.local_date(client, DateTime.utc_now()))

    candidate = apply_changes(cs)

    if candidate.start_date && active_candidate?(candidate) && overlaps?(ctx, candidate),
      do: add_error(cs, :start_date, "overlaps another Client Plan's Coverage"),
      else: cs
  end

  defp active_candidate?(_), do: true

  defp overlaps?(ctx, plan) do
    table = plan.__struct__.__schema__(:source)
    id = if plan.id, do: Ecto.UUID.dump!(plan.id)

    result =
      Repo.query!(
        """
        SELECT EXISTS(SELECT 1 FROM #{table} other WHERE other.client_id=$1 AND other.business_id=$2 AND ($3::uuid IS NULL OR other.id<>$3)
        AND (other.archived_at IS NULL OR $7)
        #{if table == "plans", do: "AND other.domain = $8", else: ""}
        AND plan_coverage_range(other.client_id,other.start_date,other.end_date,other.created_local_date)
        && plan_coverage_range($1,$4,$5,$6))
        """,
        [
          Ecto.UUID.dump!(plan.client_id),
          Ecto.UUID.dump!(ctx.business_id),
          id,
          plan.start_date,
          plan.end_date,
          plan.created_local_date,
          table == "plans"
        ] ++ if(table == "plans", do: [to_string(plan.domain)], else: [])
      )

    result.rows == [[true]]
  end
end
