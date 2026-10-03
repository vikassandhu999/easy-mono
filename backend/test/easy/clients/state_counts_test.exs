defmodule Easy.Clients.StateCountsTest do
  use Easy.DataCase, async: true

  alias Easy.Clients

  for {mode, opts} <- [offset: [], cursor: [cursor: "start"]] do
    test "#{mode} list filters and one summary query agree for every state" do
      coach = insert(:coach, business: insert(:business, timezone: "Etc/UTC"))
      today = Date.utc_today()
      insert(:client, business: coach.business, coach: coach)
      insert(:client, business: coach.business, coach: coach, user: nil)
      insert(:client, business: coach.business, coach: coach, terms: [])
      ending_term = build(:coaching_term, starts_on: today, ends_on: today)
      insert(:client, business: coach.business, coach: coach, terms: [ending_term])
      ended_term = build(:coaching_term, starts_on: Date.add(today, -30), ends_on: Date.add(today, -1))
      insert(:client, business: coach.business, coach: coach, terms: [ended_term])
      insert(:client)
      ctx = trainer_ctx(coach)

      handler = {__MODULE__, self()}
      :telemetry.attach(handler, [:easy, :repo, :query], &__MODULE__.capture_query/4, self())

      try do
        assert {:ok, %{summary: summary, data: clients}} = Clients.list_client_page(ctx, Keyword.put(unquote(opts), :state, :ending_soon))
        assert summary == %{active: 1, ending_soon: 1, invited: 1, joined: 1, ended: 1}
        assert Enum.map(clients, & &1.state) == [:ending_soon]
        queries = receive_queries([])
        assert Enum.count(queries, &String.contains?(&1, "FILTER")) == 1
        assert Enum.count(queries, &String.contains?(&1, "count(")) == 2
      after
        :telemetry.detach(handler)
      end
    end
  end

  @spec capture_query(list(), map(), map(), pid()) :: :ok
  def capture_query(_event, _measurements, metadata, pid) do
    if self() == pid, do: send(pid, {:query, metadata.query})
    :ok
  end

  defp receive_queries(queries) do
    receive do
      {:query, query} -> receive_queries([query | queries])
    after
      0 -> queries
    end
  end
end
