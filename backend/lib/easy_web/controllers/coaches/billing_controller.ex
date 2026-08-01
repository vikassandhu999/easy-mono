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

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true] when action in [:checkout, :cancel, :sync]

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
    with {:ok, summary} <- Billing.get_billing(conn.assigns.ctx) do
      render(conn, :show, summary: summary)
    end
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
      forbidden: {"Not the business owner", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse},
      bad_gateway: {"Payment provider error", "application/json", ErrorResponse}
    ]

  @spec checkout(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def checkout(conn, _params) do
    %{seats_to_add: seats_to_add} = conn.body_params

    with {:ok, result} <- Billing.checkout(conn.assigns.ctx, seats_to_add) do
      render(conn, :checkout, result: result)
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
      forbidden: {"Not the business owner", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse},
      bad_gateway: {"Payment provider error", "application/json", ErrorResponse}
    ]

  @spec cancel(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def cancel(conn, _params) do
    with {:ok, summary} <- Billing.cancel(conn.assigns.ctx) do
      render(conn, :show, summary: summary)
    end
  end

  operation :sync,
    summary: "Reconcile billing with Razorpay",
    description: "Owner-only: fetches the subscription from Razorpay and applies the same transition the webhook would.",
    operation_id: "syncBilling",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Billing", "application/json", BillingResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      forbidden: {"Not the business owner", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse},
      bad_gateway: {"Payment provider error", "application/json", ErrorResponse}
    ]

  @spec sync(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def sync(conn, _params) do
    with {:ok, summary} <- Billing.sync_billing(conn.assigns.ctx) do
      render(conn, :show, summary: summary)
    end
  end
end
