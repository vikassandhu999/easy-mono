defmodule Easy.PlanCoverage do
  import Ecto.Query
  alias Easy.Clients.Client

  @spec in_force(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def in_force(query, date) do
    from(plan in query,
      where: plan.start_date <= ^date and (is_nil(plan.end_date) or plan.end_date >= ^date),
      where:
        fragment(
          """
          EXISTS (
            SELECT 1 FROM clients c JOIN businesses b ON b.id = c.business_id
            WHERE c.id = ? AND c.business_id = ?
            AND EXISTS (SELECT 1 FROM coaching_terms t WHERE t.client_id = c.id
              AND t.starts_on <= ? AND (t.ends_on IS NULL OR t.ends_on >= ?))
            AND NOT EXISTS (SELECT 1 FROM coaching_terms t WHERE t.client_id = c.id
              AND t.ends_on >= ((? AT TIME ZONE 'UTC') AT TIME ZONE COALESCE(NULLIF(c.timezone, ''), b.timezone))::date
              AND t.ends_on < ?)
          )
          """,
          plan.client_id,
          plan.business_id,
          type(^date, :date),
          type(^date, :date),
          plan.inserted_at,
          type(^date, :date)
        )
    )
  end

  @spec lifecycle(map(), Date.t()) :: :upcoming | :ended | :current | :waiting
  def lifecycle(plan, date) do
    cond do
      ended_before?(effective_end(plan), date) -> :ended
      Date.after?(plan.start_date, date) -> :upcoming
      covered?(plan.client.terms, date) -> :current
      true -> :waiting
    end
  end

  @spec stopped_on(map(), Date.t()) :: Date.t() | nil
  def stopped_on(%{kind: :template}, _date), do: nil
  def stopped_on(%{start_date: nil}, _date), do: nil

  def stopped_on(plan, date) do
    ended = term_end(plan)

    if ended_before?(ended, date) and (is_nil(plan.end_date) or Date.before?(ended, plan.end_date)),
      do: ended
  end

  @spec effective_end(map()) :: Date.t() | nil
  def effective_end(plan) do
    [plan.end_date, term_end(plan)] |> Enum.reject(&is_nil/1) |> Enum.min(Date, fn -> nil end)
  end

  defp term_end(%{inserted_at: inserted_at, client: %{terms: terms} = client}) when is_list(terms) do
    created_on = Client.local_date(client, inserted_at)

    terms
    |> Enum.map(& &1.ends_on)
    |> Enum.filter(&(not is_nil(&1) and not Date.before?(&1, created_on)))
    |> Enum.min(Date, fn -> nil end)
  end

  defp covered?(terms, date) do
    Enum.any?(terms, fn term ->
      not Date.after?(term.starts_on, date) and not ended_before?(term.ends_on, date)
    end)
  end

  defp ended_before?(nil, _date), do: false
  defp ended_before?(ending, date), do: Date.before?(ending, date)
end
