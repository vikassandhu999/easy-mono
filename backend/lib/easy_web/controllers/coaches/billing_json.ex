defmodule EasyWeb.Coaches.BillingJSON do
  @spec show(map()) :: map()
  def show(%{summary: summary}), do: %{data: summary_data(summary)}

  @spec checkout(map()) :: map()
  def checkout(%{result: result}) do
    %{
      data: %{
        action: to_string(result.action),
        checkout: Map.get(result, :checkout),
        billing: summary_data(result.billing)
      }
    }
  end

  defp summary_data(summary) do
    case Map.get(summary, :recent_events) do
      nil -> Map.put(summary, :recent_events, nil)
      events -> Map.put(summary, :recent_events, Enum.map(events, &event_data/1))
    end
  end

  defp event_data(event) do
    %{
      id: event.id,
      kind: event.kind,
      seat_delta: event.seat_delta,
      amount_paid: event.amount_paid,
      currency: event.currency,
      occurred_at: event.occurred_at
    }
  end
end
