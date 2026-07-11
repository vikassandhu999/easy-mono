defmodule EasyWeb.AuthController do
  alias Easy.Clients
  alias Easy.Coaches
  alias Easy.Identity
  alias Easy.Identity.Invitations
  alias Easy.Identity.OneTimeTokens
  alias Easy.Utils
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    AcceptInviteRequest,
    AcceptInviteVerifyRequest,
    AuthTokenResponse,
    ErrorResponse,
    InvitationPreviewResponse,
    MessageResponse,
    OtpRequest,
    SignupRequest,
    SignupResponse,
    TokenRequest,
    TrainerAcceptInviteRequest,
    TrainerAcceptInviteVerifyRequest,
    TrainerInvitationPreviewResponse,
    VerifyRequest
  }

  @allowed_roles ["owner", "coach", "client", "guest"]

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true]
       when action in [
              :signup,
              :accept_invite,
              :accept_invite_verify,
              :trainer_accept_invite,
              :trainer_accept_invite_verify,
              :otp,
              :verify,
              :token
            ]

  tags ["auth"]

  operation :signup,
    summary: "Sign up",
    description: "Creates a user and sends an email confirmation OTP.",
    operation_id: "signup",
    request_body: {"Signup request", "application/json", SignupRequest, required: true},
    responses: [
      created: {"Signup", "application/json", SignupResponse},
      conflict: {"Conflict", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show_invitation,
    summary: "Preview invitation",
    description: "Returns invitation state and prefill details for an invitation token.",
    operation_id: "showInvitation",
    parameters: [
      Operation.parameter(:token, :path, :string, "Invitation token")
    ],
    responses: [
      ok: {"Invitation preview", "application/json", InvitationPreviewResponse}
    ]

  operation :accept_invite,
    summary: "Accept invitation",
    description: "Starts invitation acceptance by sending an OTP to the invited email.",
    operation_id: "acceptInvite",
    request_body: {"Accept invite request", "application/json", AcceptInviteRequest, required: true},
    responses: [
      ok: {"OTP sent", "application/json", MessageResponse},
      gone: {"Invitation unavailable", "application/json", ErrorResponse},
      not_found: {"Invitation not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :accept_invite_verify,
    summary: "Verify invitation OTP",
    description: "Verifies an invitation OTP, links or creates the user, and returns auth tokens.",
    operation_id: "verifyInvitation",
    request_body: {"Accept invite verification request", "application/json", AcceptInviteVerifyRequest, required: true},
    responses: [
      ok: {"Auth token", "application/json", AuthTokenResponse},
      conflict: {"Already active elsewhere", "application/json", ErrorResponse},
      bad_request: {"Invalid OTP", "application/json", ErrorResponse},
      gone: {"Invitation or OTP expired", "application/json", ErrorResponse},
      not_found: {"Invitation not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show_trainer_invitation,
    summary: "Preview trainer invitation",
    description: "Returns invitation state and prefill details for a trainer invitation token.",
    operation_id: "showTrainerInvitation",
    parameters: [
      Operation.parameter(:token, :path, :string, "Trainer invitation token")
    ],
    responses: [
      ok: {"Trainer invitation preview", "application/json", TrainerInvitationPreviewResponse},
      not_found: {"Invitation not found", "application/json", ErrorResponse},
      gone: {"Invitation unavailable", "application/json", ErrorResponse}
    ]

  operation :trainer_accept_invite,
    summary: "Accept trainer invitation",
    description: "Starts trainer invitation acceptance by sending an OTP to the invited email.",
    operation_id: "trainerAcceptInvite",
    request_body: {"Trainer accept invite request", "application/json", TrainerAcceptInviteRequest, required: true},
    responses: [
      ok: {"OTP sent", "application/json", MessageResponse},
      gone: {"Invitation unavailable", "application/json", ErrorResponse},
      not_found: {"Invitation not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :trainer_accept_invite_verify,
    summary: "Verify trainer invitation OTP",
    description: "Verifies a trainer invitation OTP, links or creates the user, and returns auth tokens.",
    operation_id: "trainerAcceptInviteVerify",
    request_body: {"Trainer accept invite verification request", "application/json", TrainerAcceptInviteVerifyRequest, required: true},
    responses: [
      ok: {"Auth token", "application/json", AuthTokenResponse},
      conflict: {"Already a coach elsewhere", "application/json", ErrorResponse},
      bad_request: {"Invalid OTP", "application/json", ErrorResponse},
      gone: {"Invitation or OTP expired", "application/json", ErrorResponse},
      not_found: {"Invitation not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :otp,
    summary: "Send OTP",
    description: "Sends an OTP for email confirmation or authentication.",
    operation_id: "sendOtp",
    request_body: {"OTP request", "application/json", OtpRequest, required: true},
    responses: [
      ok: {"OTP sent", "application/json", MessageResponse},
      not_found: {"User not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :verify,
    summary: "Verify email or OTP",
    description: "Verifies an email confirmation token or email OTP and returns auth tokens.",
    operation_id: "verifyAuth",
    request_body: {"Verify request", "application/json", VerifyRequest, required: true},
    responses: [
      ok: {"Auth token", "application/json", AuthTokenResponse},
      bad_request: {"Invalid token or OTP", "application/json", ErrorResponse},
      gone: {"Token expired", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :token,
    summary: "Create auth token",
    description: "Creates auth tokens from a refresh token or an OTP grant.",
    operation_id: "createAuthToken",
    request_body: {"Token request", "application/json", TokenRequest, required: true},
    responses: [
      ok: {"Auth token", "application/json", AuthTokenResponse},
      unauthorized: {"Invalid grant", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec signup(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def signup(conn, _params) do
    params = stringify_keys(conn.body_params)

    with {:ok, user} <- Easy.Identity.signup(params) do
      conn
      |> put_status(201)
      |> json(%{
        id: user.id,
        email: user.email,
        confirmation_sent_at: user.confirmation_sent_at,
        inserted_at: user.inserted_at,
        updated_at: user.updated_at
      })
    end
  end

  @spec accept_invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def accept_invite(conn, _params) do
    params = stringify_keys(conn.body_params)

    with {:ok, :otp_sent} <- Identity.accept_invite(params) do
      conn
      |> put_status(200)
      |> json(%{message: "OTP sent to the provided email."})
    end
  end

  @spec accept_invite_verify(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def accept_invite_verify(conn, _params) do
    params = stringify_keys(conn.body_params)
    ip = conn.remote_ip |> Tuple.to_list() |> Enum.join(".")
    user_agent = get_req_header(conn, "user-agent") |> List.first() || "unknown"

    with {:ok, auth_token} <-
           Identity.verify_accept_invite(params, %{ip: ip, user_agent: user_agent}) do
      conn
      |> put_status(200)
      |> json(auth_token)
    end
  end

  @spec show_invitation(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show_invitation(conn, %{"token" => token}) do
    with {:ok, body} <- Clients.invitation_preview(token) do
      conn |> put_status(200) |> json(%{data: body})
    end
  end

  @spec show_trainer_invitation(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show_trainer_invitation(conn, %{"token" => token}) do
    with {:ok, body} <- Coaches.invitation_preview(token) do
      conn |> put_status(200) |> json(%{data: body})
    end
  end

  @spec trainer_accept_invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def trainer_accept_invite(conn, _params) do
    params = stringify_keys(conn.body_params)

    with {:ok, :otp_sent} <- Invitations.accept_trainer_invite(params) do
      conn
      |> put_status(200)
      |> json(%{message: "OTP sent to the provided email."})
    end
  end

  @spec trainer_accept_invite_verify(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def trainer_accept_invite_verify(conn, _params) do
    params = stringify_keys(conn.body_params)
    ip = conn.remote_ip |> Tuple.to_list() |> Enum.join(".")
    user_agent = get_req_header(conn, "user-agent") |> List.first() || "unknown"

    with {:ok, auth_token} <-
           Invitations.verify_accept_trainer_invite(params, %{ip: ip, user_agent: user_agent}) do
      conn
      |> put_status(200)
      |> json(auth_token)
    end
  end

  @spec verify(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def verify(conn, _params) do
    case stringify_keys(conn.body_params) do
      %{"token" => token_hash} -> verify_token(conn, token_hash)
      %{"email" => email, "otp" => otp} -> verify_otp(conn, email, otp)
    end
  end

  defp verify_token(conn, token_hash) do
    ip = conn.remote_ip |> Tuple.to_list() |> Enum.join(".")
    user_agent = get_req_header(conn, "user-agent") |> List.first() || "unknown"

    case Easy.Identity.verify(token_hash, %{ip: ip, user_agent: user_agent, role: :guest}) do
      {:ok, token} -> conn |> put_status(200) |> json(token)
      {:error, :token_invalid} -> {:error, :token_invalid}
      {:error, :token_expired} -> {:error, :token_expired}
    end
  end

  defp verify_otp(conn, email, otp) do
    ip = conn.remote_ip |> Tuple.to_list() |> Enum.join(".")
    user_agent = get_req_header(conn, "user-agent") |> List.first() || "unknown"

    token_hash = OneTimeTokens.generate_token_hash(email <> otp)

    case Easy.Identity.verify(token_hash, %{ip: ip, user_agent: user_agent, role: :guest}) do
      {:ok, token} -> conn |> put_status(200) |> json(token)
      {:error, :token_invalid} -> {:error, :invalid_otp}
      {:error, :token_expired} -> {:error, :otp_expired}
    end
  end

  @spec otp(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def otp(conn, _params) do
    %{"email" => email, "type" => type} = stringify_keys(conn.body_params)

    with {:ok, _} <- Easy.Identity.send_otp(email, type) do
      conn
      |> put_status(200)
      |> json(%{message: "OTP sent successfully"})
    end
  end

  @spec token(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def token(conn, _params) do
    case stringify_keys(conn.body_params) do
      %{"grant_type" => "refresh_token", "refresh_token" => refresh_token} = params ->
        refresh_token(conn, refresh_token, params)

      %{"grant_type" => "otp", "email" => email, "otp" => otp, "role" => role} ->
        otp_token(conn, email, otp, role)
    end
  end

  defp refresh_token(conn, refresh_token, params) do
    ip = conn.remote_ip |> Tuple.to_list() |> Enum.join(".")
    user_agent = get_req_header(conn, "user-agent") |> List.first() || "unknown"

    opts = %{
      refresh_token: refresh_token,
      ip: ip,
      user_agent: user_agent,
      role: Utils.safe_to_atom(params["role"], @allowed_roles)
    }

    with {:ok, auth_token} <- Identity.token(:refresh_token, opts) do
      conn
      |> put_status(200)
      |> json(auth_token)
    end
  end

  defp otp_token(conn, email, otp, role) do
    ip = conn.remote_ip |> Tuple.to_list() |> Enum.join(".")
    user_agent = get_req_header(conn, "user-agent") |> List.first() || "unknown"

    token_hash = OneTimeTokens.generate_token_hash(email <> otp)

    opts = %{
      token_hash: token_hash,
      ip: ip,
      user_agent: user_agent,
      role: Utils.safe_to_atom(role, @allowed_roles)
    }

    with {:ok, auth_token} <- Identity.token(:otp, opts) do
      conn
      |> put_status(200)
      |> json(auth_token)
    end
  end

  defp stringify_keys(params) do
    Map.new(params, fn {key, value} -> {to_string(key), value} end)
  end
end
