defmodule Easy.PlanCoverage do
  import Ecto.Query
  alias Easy.Repo

  @spec in_force(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def in_force(query, date) do
    from(plan in query,
      where:
        fragment(
          "plan_period_covers(?, ?, ?, ?, ?)",
          plan.client_id,
          plan.start_date,
          plan.end_date,
          plan.created_local_date,
          type(^date, :date)
        )
    )
  end

  @spec lifecycle(map(), Date.t()) :: :upcoming | :ended | :current | :waiting
  def lifecycle(plan, date) do
    cond do
      ended_before?(effective_end(plan), date) -> :ended
      Date.after?(plan.start_date, date) -> :upcoming
      covers?(plan, date) -> :current
      true -> :waiting
    end
  end

  @spec stopped_on(map(), Date.t()) :: Date.t() | nil
  def stopped_on(%{kind: :template}, _date), do: nil
  def stopped_on(%{start_date: nil}, _date), do: nil

  def stopped_on(plan, date) do
    stopped = coverage_end(plan, nil)
    if ended_before?(stopped, date) and (is_nil(plan.end_date) or Date.before?(stopped, plan.end_date)), do: stopped
  end

  @spec effective_end(map()) :: Date.t() | nil
  def effective_end(plan), do: coverage_end(plan, plan.end_date)

  defp coverage_end(plan, ending) do
    [[date]] =
      Repo.query!("SELECT plan_coverage_end($1,$2,$3)", [
        Ecto.UUID.dump!(plan.client_id),
        plan.created_local_date,
        ending
      ]).rows

    date
  end

  defp covers?(plan, date) do
    Repo.query!("SELECT plan_period_covers($1,$2,$3,$4,$5)", [
      Ecto.UUID.dump!(plan.client_id),
      plan.start_date,
      plan.end_date,
      plan.created_local_date,
      date
    ]).rows == [[true]]
  end

  defp ended_before?(nil, _date), do: false
  defp ended_before?(ending, date), do: Date.before?(ending, date)
end
