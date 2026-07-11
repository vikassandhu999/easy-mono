defmodule EasyWeb.WebhookController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias OpenApiSpex.Schema

  plug OpenApiSpex.Plug.CastAndValidate, json_render_error_v2: true

  tags ["billing"]

  operation :razorpay,
    summary: "Razorpay webhook",
    description: "Receives Razorpay subscription/payment webhook events. Verified by HMAC signature over the raw request body. No authentication.",
    operation_id: "razorpayWebhook",
    responses: [
      ok: {"Acknowledged", "text/plain", %Schema{type: :string}},
      unauthorized: {"Invalid signature", "text/plain", %Schema{type: :string}}
    ]

  @spec razorpay(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def razorpay(conn, _params) do
    signature = conn |> get_req_header("x-razorpay-signature") |> List.first()
    event_id = conn |> get_req_header("x-razorpay-event-id") |> List.first()

    case Easy.Billing.handle_razorpay_webhook(conn.assigns[:raw_body], signature, event_id) do
      :ok -> send_resp(conn, 200, "ok")
      # duplicates are acked so Razorpay stops retrying
      {:error, :duplicate_webhook} -> send_resp(conn, 200, "ok")
      {:error, :invalid_webhook_signature} -> send_resp(conn, 401, "invalid signature")
    end
  end
end
