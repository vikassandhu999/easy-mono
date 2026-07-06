defmodule EasyWeb.FallbackController do
  use Phoenix.Controller, formats: [:json]
  require Logger

  def call(conn, {:error, %Easy.Error{} = error}) do
    http_status = Plug.Conn.Status.code(error.status)

    conn
    |> put_status(error.status)
    |> put_view(json: EasyWeb.ErrorJSON)
    |> render(:"#{http_status}", %{app_error: Easy.Error.to_map(error)})
    |> halt()
  end

  def call(conn, {:error, :not_found}) do
    call(conn, {:error, Easy.Error.not_found()})
  end

  def call(conn, {:error, :unauthorized}) do
    call(conn, {:error, Easy.Error.unauthorized()})
  end

  def call(conn, {:error, :not_owner}) do
    call(conn, {:error, Easy.Error.unauthorized("Only the business owner can manage billing.")})
  end

  def call(conn, {:error, :no_subscription}) do
    call(
      conn,
      {:error, Easy.Error.unprocessable(%{fields: %{subscription: ["there is no active subscription to cancel"]}})}
    )
  end

  def call(conn, {:error, :razorpay_error}) do
    call(
      conn,
      {:error,
       Easy.Error.new(
         :razorpay_error,
         "The payment provider request failed. Please try again.",
         %{},
         :bad_gateway
       )}
    )
  end

  def call(conn, {:error, :seat_limit_reached}) do
    seat_summary = Easy.Billing.seat_summary(conn.assigns.ctx)

    conn
    |> put_status(:conflict)
    |> json(%{
      error_code: "seat_limit_reached",
      error_message: "No seats available",
      error_detail: %{},
      seat_summary: seat_summary
    })
    |> halt()
  end

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    call(conn, {:error, Easy.Error.unprocessable(changeset)})
  end

  def call(conn, {:error, :invalid_day}) do
    call(conn, {:error, Easy.Error.unprocessable(%{fields: %{day: ["is invalid"]}})})
  end

  def call(conn, {:error, :invalid_element_ids}) do
    call(
      conn,
      {:error, Easy.Error.unprocessable(%{fields: %{element_ids: ["must be exactly the workout's elements"]}})}
    )
  end

  def call(conn, {:error, :too_many_programs}) do
    call(
      conn,
      {:error, Easy.Error.unprocessable(%{fields: %{programs: ["a page can have at most 3 programs"]}})}
    )
  end

  def call(conn, {:error, :last_day}) do
    conn
    |> put_status(:conflict)
    |> json(%{
      error_code: "last_day",
      error_message: "A plan must keep at least one day.",
      error_detail: %{}
    })
    |> halt()
  end

  def call(conn, {:error, :max_options}) do
    conn
    |> put_status(:conflict)
    |> json(%{
      error_code: "max_options",
      error_message: "A meal slot can hold at most 3 options.",
      error_detail: %{}
    })
    |> halt()
  end

  def call(conn, {:error, :read_only_source}) do
    call(
      conn,
      {:error,
       Easy.Error.unprocessable(%{
         fields: %{source: ["system and imported foods are read-only; use the copy endpoint"]}
       })}
    )
  end

  def call(conn, {:error, reason}) do
    Logger.error("Unhandled error in FallbackController: #{inspect(reason)}")

    call(
      conn,
      {:error, Easy.Error.new(:internal_error, "An internal error occurred", %{}, :internal_server_error)}
    )
  end

  def send_unauthorized_response(
        conn,
        message \\ "Insufficient permissions to perform this action."
      ) do
    call(conn, {:error, Easy.Error.unauthorized(message)})
  end

  def send_unauthenticated_response(
        conn,
        message \\ "You must be authenticated to access this resource."
      ) do
    call(conn, {:error, Easy.Error.unauthorized(message)})
  end
end
