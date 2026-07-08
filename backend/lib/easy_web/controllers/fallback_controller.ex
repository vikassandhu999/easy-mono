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
    call(conn, {:error, Easy.Error.unauthorized("Only the business owner can do this.")})
  end

  def call(conn, {:error, :coach_not_active}) do
    call(
      conn,
      {:error, Easy.Error.unprocessable("The selected trainer is not active on this team.")}
    )
  end

  def call(conn, {:error, :already_on_team}) do
    call(
      conn,
      {:error, Easy.Error.unprocessable(%{fields: %{email: ["is already on this team"]}})}
    )
  end

  def call(conn, {:error, :cannot_deactivate_owner}) do
    call(
      conn,
      {:error, Easy.Error.unprocessable(%{fields: %{coach: ["the owner cannot be deactivated"]}})}
    )
  end

  # Bare invitation-resolution atoms only ever reach the fallback via
  # Coaches.invitation_preview/1 (the public trainer-invitation preview), which does
  # NOT fold them into a %{state: ...} body the way Clients.invitation_preview/1 does.
  # Reuse Identity.Errors so both invitation flows render identical error semantics.
  def call(conn, {:error, :invalid}) do
    call(conn, {:error, Easy.Identity.Errors.invitation_invalid()})
  end

  def call(conn, {:error, :used}) do
    call(conn, {:error, Easy.Identity.Errors.invitation_used()})
  end

  def call(conn, {:error, :expired}) do
    call(conn, {:error, Easy.Identity.Errors.invitation_expired()})
  end

  def call(conn, {:error, :no_subscription}) do
    call(
      conn,
      {:error, Easy.Error.unprocessable(%{fields: %{subscription: ["there is no active subscription"]}})}
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
