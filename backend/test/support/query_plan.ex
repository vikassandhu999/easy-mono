defmodule Easy.QueryPlan do
  @moduledoc false

  alias Easy.Repo

  @type captured_query :: %{params: list(), sql: String.t()}

  @spec capture((-> result)) :: {result, [captured_query()]} when result: var
  def capture(fun) when is_function(fun, 0) do
    parent = self()
    handler_id = {__MODULE__, make_ref()}

    :telemetry.attach(
      handler_id,
      [:easy, :repo, :query],
      fn _event, _measurements, metadata, _config ->
        if self() == parent and String.starts_with?(metadata.query, "SELECT") do
          send(parent, {:query_plan_query, %{sql: metadata.query, params: metadata.params}})
        end
      end,
      nil
    )

    try do
      {fun.(), received_queries()}
    after
      :telemetry.detach(handler_id)
    end
  end

  @spec explain([captured_query()]) :: [map()]
  def explain(queries) do
    Enum.map(queries, fn query ->
      result =
        Repo.query!(
          "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " <> query.sql,
          query.params,
          log: false
        )

      unwrap_plan(result.rows)
    end)
  end

  @spec summarize(map()) :: map()
  def summarize(%{"Plan" => root} = document) do
    nodes = flatten_nodes(root)

    %{
      actual_rows: root["Actual Rows"],
      execution_time_ms: document["Execution Time"],
      indexes:
        nodes
        |> Enum.map(& &1["Index Name"])
        |> Enum.reject(&is_nil/1)
        |> Enum.uniq()
        |> Enum.sort(),
      planning_time_ms: document["Planning Time"],
      sequential_scans:
        for %{"Node Type" => "Seq Scan", "Relation Name" => relation} = node <- nodes do
          %{
            actual_rows: node["Actual Rows"],
            relation: relation,
            rows_removed: node["Rows Removed by Filter"] || 0
          }
        end,
      top_node: root["Node Type"]
    }
  end

  defp received_queries(queries \\ []) do
    receive do
      {:query_plan_query, query} -> received_queries([query | queries])
    after
      0 -> Enum.reverse(queries)
    end
  end

  defp unwrap_plan([[[plan]]]) when is_map(plan), do: plan

  defp flatten_nodes(node) do
    [node | Enum.flat_map(Map.get(node, "Plans", []), &flatten_nodes/1)]
  end
end
