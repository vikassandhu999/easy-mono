defmodule EasyWeb.OpenApi.Schemas.BillingEvent do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "BillingEvent",
      type: :object,
      additionalProperties: false,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        kind: %Schema{
          type: :string,
          enum: [
            "seats_added",
            "seats_removed",
            "payment_succeeded",
            "payment_failed",
            "cancellation_scheduled",
            "subscription_cancelled"
          ],
          example: "seats_added"
        },
        seat_delta: %Schema{type: :integer, nullable: true, example: 3},
        amount_paid: %Schema{type: :integer, nullable: true, description: "INR (rupees)", example: 1497},
        currency: %Schema{type: :string, nullable: true, example: "INR"},
        occurred_at: %Schema{type: :string, format: :"date-time"}
      },
      required: [:id, :kind, :occurred_at]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.BillingSummary do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.BillingEvent

  OpenApiSpex.schema(
    %{
      title: "BillingSummary",
      type: :object,
      additionalProperties: false,
      properties: %{
        status: %Schema{
          type: :string,
          enum: ["free", "active", "past_due", "cancel_at_period_end", "cancelled"],
          example: "free"
        },
        free_seats: %Schema{type: :integer, example: 2},
        paid_seats: %Schema{type: :integer, example: 3},
        seat_limit: %Schema{type: :integer, example: 5},
        used_seats: %Schema{type: :integer, description: "active clients + pending invites", example: 4},
        available_seats: %Schema{type: :integer, example: 1},
        awaiting_seat_count: %Schema{type: :integer, example: 0},
        monthly_seat_price_inr: %Schema{type: :integer, example: 499},
        current_period_end: %Schema{type: :string, format: :"date-time", nullable: true},
        is_owner: %Schema{type: :boolean},
        recent_events: %Schema{type: :array, items: BillingEvent, nullable: true}
      },
      required: [
        :status,
        :free_seats,
        :paid_seats,
        :seat_limit,
        :used_seats,
        :available_seats,
        :awaiting_seat_count,
        :monthly_seat_price_inr,
        :current_period_end,
        :is_owner,
        :recent_events
      ]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.BillingCheckoutRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "BillingCheckoutRequest",
      type: :object,
      additionalProperties: false,
      properties: %{seats_to_add: %Schema{type: :integer, minimum: 1, example: 3}},
      required: [:seats_to_add]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.BillingCheckoutPayload do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "BillingCheckoutPayload",
      type: :object,
      additionalProperties: false,
      properties: %{
        key_id: %Schema{type: :string, example: "rzp_test_key"},
        subscription_id: %Schema{type: :string, example: "sub_123"}
      },
      required: [:key_id, :subscription_id]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.BillingCheckoutResult do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{BillingCheckoutPayload, BillingSummary}

  OpenApiSpex.schema(
    %{
      title: "BillingCheckoutResult",
      type: :object,
      additionalProperties: false,
      properties: %{
        action: %Schema{type: :string, enum: ["checkout", "updated"], example: "checkout"},
        checkout: %Schema{allOf: [BillingCheckoutPayload], nullable: true},
        billing: BillingSummary
      },
      required: [:action, :checkout, :billing]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.BillingResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{BillingSummary, Shared}

  OpenApiSpex.schema(Shared.data_response(BillingSummary, "BillingResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.BillingCheckoutResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{BillingCheckoutResult, Shared}

  OpenApiSpex.schema(Shared.data_response(BillingCheckoutResult, "BillingCheckoutResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.SeatLimitError do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.BillingSummary

  OpenApiSpex.schema(
    %{
      title: "SeatLimitError",
      type: :object,
      additionalProperties: true,
      properties: %{
        error_code: %Schema{type: :string, example: "seat_limit_reached"},
        error_message: %Schema{type: :string, example: "No seats available"},
        error_detail: %Schema{type: :object, additionalProperties: true},
        seat_summary: BillingSummary
      },
      required: [:error_code, :error_message, :seat_summary]
    },
    struct?: false
  )
end
