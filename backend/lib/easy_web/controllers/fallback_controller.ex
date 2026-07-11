defmodule EasyWeb.FallbackController do
  use Phoenix.Controller, formats: [:json]
  require Logger

  alias Easy.Error
  alias EasyWeb.ErrorJSON
  alias Plug.Conn.Status

  def call(conn, {:error, %Error{} = error}) do
    http_status = Status.code(error.status)

    conn
    |> put_status(error.status)
    |> put_view(json: ErrorJSON)
    |> render(:"#{http_status}", %{app_error: Error.to_map(error)})
    |> halt()
  end

  def call(conn, {:error, :not_found}) do
    call(conn, {:error, Error.not_found()})
  end

  def call(conn, {:error, :unauthorized}) do
    call(conn, {:error, Error.unauthorized()})
  end

  def call(conn, {:error, :not_owner}) do
    call(conn, {:error, Error.unauthorized("Only the business owner can do this.")})
  end

  def call(conn, {:error, :coach_not_active}) do
    call(
      conn,
      {:error, Error.unprocessable("The selected trainer is not active on this team.")}
    )
  end

  def call(conn, {:error, :already_on_team}) do
    call(
      conn,
      {:error, Error.unprocessable(%{fields: %{email: ["is already on this team"]}})}
    )
  end

  def call(conn, {:error, :cannot_deactivate_owner}) do
    call(
      conn,
      {:error, Error.unprocessable(%{fields: %{coach: ["the owner cannot be deactivated"]}})}
    )
  end

  def call(conn, {:error, :invalid}) do
    call(conn, {:error, invitation_invalid_error()})
  end

  def call(conn, {:error, :used}) do
    call(conn, {:error, invitation_used_error()})
  end

  def call(conn, {:error, :expired}) do
    call(conn, {:error, invitation_expired_error()})
  end

  def call(conn, {:error, :invitation_invalid}), do: call(conn, {:error, invitation_invalid_error()})
  def call(conn, {:error, :invitation_used}), do: call(conn, {:error, invitation_used_error()})
  def call(conn, {:error, :invitation_expired}), do: call(conn, {:error, invitation_expired_error()})

  def call(conn, {:error, :already_active_client}) do
    call(
      conn,
      {:error,
       Error.new(
         :already_active_client,
         "This email is already an active client of another business.",
         %{},
         :conflict
       )}
    )
  end

  def call(conn, {:error, :already_a_coach}) do
    call(
      conn,
      {:error,
       Error.new(
         :already_a_coach,
         "This email is already associated with a coach account on another team.",
         %{},
         :conflict
       )}
    )
  end

  def call(conn, {:error, :invalid_otp}) do
    call(conn, {:error, Error.new(:invalid_otp, "Invalid code. Please check and try again.", %{}, :bad_request)})
  end

  def call(conn, {:error, :otp_expired}) do
    call(conn, {:error, Error.new(:otp_expired, "This code has expired. Request a new one.", %{}, :gone)})
  end

  def call(conn, {:error, :email_already_exists}) do
    call(
      conn,
      {:error, Error.new(:email_already_exists, "An account with this email already exists", %{}, :conflict)}
    )
  end

  def call(conn, {:error, :email_already_confirmed}) do
    call(conn, {:error, Error.new(:email_already_confirmed, "The email address is already confirmed")})
  end

  def call(conn, {:error, :email_not_confirmed}) do
    call(
      conn,
      {:error,
       Error.new(
         :email_not_confirmed,
         "The email address is not confirmed, please confirm your email first"
       )}
    )
  end

  def call(conn, {:error, :session_not_found}) do
    call(conn, {:error, Error.new(:session_not_found, "Session not found")})
  end

  def call(conn, {:error, :session_expired}) do
    call(conn, {:error, Error.new(:session_expired, "The session has expired")})
  end

  def call(conn, {:error, :session_revoked}) do
    call(conn, {:error, Error.new(:session_revoked, "The session has been revoked")})
  end

  def call(conn, {:error, :user_not_found}) do
    call(conn, {:error, Error.not_found("User not found")})
  end

  def call(conn, {:error, reason}) when reason in [:coach_membership_not_found, :client_membership_not_found] do
    call(conn, {:error, Error.unauthorized("No active account found for the requested role")})
  end

  def call(conn, {:error, :token_invalid}) do
    call(
      conn,
      {:error,
       Error.new(
         :token_invalid,
         "The provided token is invalid, please check and try again",
         %{},
         :bad_request
       )}
    )
  end

  def call(conn, {:error, :token_expired}) do
    call(
      conn,
      {:error,
       Error.new(
         :token_expired,
         "The provided token has expired, please request a new one",
         %{},
         :gone
       )}
    )
  end

  def call(conn, {:error, :invalid_profile_filter}) do
    call(conn, {:error, Error.unprocessable(%{fields: %{profile_filter: ["is invalid"]}})})
  end

  def call(conn, {:error, :self_invite}) do
    call(conn, {:error, Error.unprocessable(%{email: ["you can't invite yourself as a client"]})})
  end

  def call(conn, {:error, :client_email_taken}) do
    call(
      conn,
      {:error, Error.unprocessable(%{email: ["is already an active client of another business"]})}
    )
  end

  def call(conn, {:error, :invitation_email_missing}) do
    call(conn, {:error, Error.unprocessable(%{email: ["client has no email address"]})})
  end

  def call(conn, {:error, :invitation_not_pending}) do
    call(
      conn,
      {:error,
       Error.unprocessable(%{
         status: ["only pending invitations can be changed"]
       })}
    )
  end

  def call(conn, {:error, :form_template_assigned}) do
    call(conn, {:error, Error.unprocessable(%{fields: %{form_template_id: ["has assignments"]}})})
  end

  def call(conn, {:error, :invalid_answers}) do
    call(conn, {:error, Error.unprocessable(%{fields: %{answers: ["is invalid"]}})})
  end

  def call(conn, {:error, :unknown_answer_keys}) do
    call(conn, {:error, Error.unprocessable(%{fields: %{answers: ["reference unknown questions"]}})})
  end

  def call(conn, {:error, :missing_required_answers}) do
    call(conn, {:error, Error.unprocessable(%{fields: %{answers: ["required questions are missing answers"]}})})
  end

  def call(conn, {:error, :invalid_answer_values}) do
    call(conn, {:error, Error.unprocessable(%{fields: %{answers: ["contain invalid values"]}})})
  end

  def call(conn, {:error, :answers_required}) do
    call(conn, {:error, Error.unprocessable(%{fields: %{answers: ["can't be blank"]}})})
  end

  def call(conn, {:error, :assignment_not_submittable}) do
    call(conn, {:error, Error.unprocessable(%{fields: %{status: ["cannot be submitted"]}})})
  end

  def call(conn, {:error, :invalid_profile_mapping}) do
    call(conn, {:error, Error.unprocessable(%{fields: %{profile_mapping: ["is invalid"]}})})
  end

  def call(conn, {:error, :active_session_exists}) do
    call(
      conn,
      {:error,
       Error.unprocessable(%{
         session: ["you already have an active workout session — finish or discard it first"]
       })}
    )
  end

  def call(conn, {:error, :invalid_since}) do
    call(conn, {:error, Error.unprocessable(%{fields: %{since: ["is invalid"]}})})
  end

  def call(conn, {:error, :date_required}) do
    call(conn, {:error, Error.unprocessable(%{fields: %{date: ["can't be blank"]}})})
  end

  def call(conn, {:error, :invalid_date}) do
    call(conn, {:error, Error.unprocessable(%{fields: %{date: ["is invalid"]}})})
  end

  def call(conn, {:error, :future_date}) do
    call(conn, {:error, Error.unprocessable(%{fields: %{date: ["cannot be in the future"]}})})
  end

  def call(conn, {:error, :no_subscription}) do
    call(
      conn,
      {:error, Error.unprocessable(%{fields: %{subscription: ["there is no active subscription"]}})}
    )
  end

  def call(conn, {:error, :razorpay_error}) do
    call(
      conn,
      {:error,
       Error.new(
         :razorpay_error,
         "The payment provider request failed. Please try again.",
         %{},
         :bad_gateway
       )}
    )
  end

  def call(conn, {:error, :seat_limit_reached}) do
    {:ok, seat_summary} = Easy.Billing.get_billing(conn.assigns.ctx)
    seat_summary = Map.delete(seat_summary, :recent_events)

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
    call(conn, {:error, Error.unprocessable(changeset)})
  end

  def call(conn, {:error, :invalid_day}) do
    call(conn, {:error, Error.unprocessable(%{fields: %{day: ["is invalid"]}})})
  end

  def call(conn, {:error, :invalid_element_ids}) do
    call(
      conn,
      {:error, Error.unprocessable(%{fields: %{element_ids: ["must be exactly the workout's elements"]}})}
    )
  end

  def call(conn, {:error, :too_many_programs}) do
    call(
      conn,
      {:error, Error.unprocessable(%{fields: %{programs: ["a page can have at most 3 programs"]}})}
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
       Error.unprocessable(%{
         fields: %{source: ["system and imported foods are read-only; use the copy endpoint"]}
       })}
    )
  end

  def call(conn, {:error, reason}) do
    Logger.error("Unhandled error in FallbackController: #{inspect(reason)}")

    call(
      conn,
      {:error, Error.new(:internal_error, "An internal error occurred", %{}, :internal_server_error)}
    )
  end

  def send_unauthorized_response(
        conn,
        message \\ "Insufficient permissions to perform this action."
      ) do
    call(conn, {:error, Error.unauthorized(message)})
  end

  def send_unauthenticated_response(
        conn,
        message \\ "You must be authenticated to access this resource."
      ) do
    call(conn, {:error, Error.unauthorized(message)})
  end

  defp invitation_invalid_error do
    Error.new(:invitation_invalid, "This invitation is no longer valid.", %{}, :not_found)
  end

  defp invitation_used_error do
    Error.new(:invitation_used, "This invitation has already been accepted.", %{}, :gone)
  end

  defp invitation_expired_error do
    Error.new(
      :invitation_expired,
      "This invitation has expired. Ask your coach to send a new one.",
      %{},
      :gone
    )
  end
end
