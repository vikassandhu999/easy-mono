defmodule EasyWeb.Coaches.BillingController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Billing

  alias EasyWeb.OpenApi.Schemas.{
    BillingCheckoutRequest,
    BillingCheckoutResponse,
    BillingResponse,
    ErrorResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:checkout]

  tags ["coach billing"]

  operation :show,
    summary: "Get billing and seat summary",
    description: "Loads the seat summary and recent billing events for the authenticated business.",
    operation_id: "getBilling",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Billing", "application/json", BillingResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    ctx = conn.assigns.ctx
    summary = Map.put(Billing.seat_summary(ctx), :recent_events, Billing.recent_events(ctx))

    json(conn, %{data: render_summary(summary)})
  end

  operation :checkout,
    summary: "Buy seats",
    description: "Owner-only: starts or updates a Razorpay subscription for additional seats.",
    operation_id: "checkoutBilling",
    security: [%{"bearerAuth" => []}],
    request_body: {"Checkout request", "application/json", BillingCheckoutRequest, required: true},
    responses: [
      ok: {"Checkout result", "application/json", BillingCheckoutResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse},
      bad_gateway: {"Payment provider error", "application/json", ErrorResponse}
    ]

  @spec checkout(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def checkout(conn, _params) do
    %{seats_to_add: seats_to_add} = conn.body_params

    with {:ok, result} <- Billing.checkout(conn.assigns.ctx, seats_to_add) do
      json(conn, %{
        data: %{
          action: to_string(result.action),
          checkout: Map.get(result, :checkout),
          billing: render_summary(result.billing)
        }
      })
    end
  end

  operation :cancel,
    summary: "Schedule cancellation",
    description: "Owner-only: schedules the subscription to cancel at the end of the current period.",
    operation_id: "cancelBilling",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Billing", "application/json", BillingResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse},
      bad_gateway: {"Payment provider error", "application/json", ErrorResponse}
    ]

  @spec cancel(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def cancel(conn, _params) do
    with {:ok, summary} <- Billing.cancel(conn.assigns.ctx) do
      json(conn, %{data: render_summary(summary)})
    end
  end

  defp render_summary(summary) do
    case Map.get(summary, :recent_events) do
      nil -> Map.put(summary, :recent_events, nil)
      events -> Map.put(summary, :recent_events, Enum.map(events, &render_event/1))
    end
  end

  defp render_event(event) do
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
