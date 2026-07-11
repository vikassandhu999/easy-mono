defmodule EasyWeb.Coaches.TeamController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Coaches
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    TeamMemberResponse,
    TeamResponse,
    TrainerInviteRequest
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true]
       when action in [:invite, :resend_invite, :revoke_invite, :deactivate]

  tags ["coach team"]

  operation :index,
    summary: "List team",
    description: "Owner-only: lists every trainer on the authenticated business, invited or active.",
    operation_id: "getTeam",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Team", "application/json", TeamResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      forbidden: {"Not the business owner", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :invite,
    summary: "Invite trainer",
    description: "Owner-only: invites a trainer to join the authenticated business.",
    operation_id: "inviteTrainer",
    security: [%{"bearerAuth" => []}],
    request_body: {"Trainer invite request", "application/json", TrainerInviteRequest, required: true},
    responses: [
      ok: {"Trainer invited", "application/json", TeamMemberResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      forbidden: {"Not the business owner", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :resend_invite,
    summary: "Resend trainer invitation",
    description: "Owner-only: refreshes and resends a pending trainer invitation.",
    operation_id: "resendTrainerInvite",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Coach id")
    ],
    responses: [
      ok: {"Trainer", "application/json", TeamMemberResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      forbidden: {"Not the business owner", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :revoke_invite,
    summary: "Revoke trainer invitation",
    description: "Owner-only: deletes a pending trainer invitation.",
    operation_id: "revokeTrainerInvite",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Coach id")
    ],
    responses: [
      ok: {"Trainer invitation revoked", "application/json", TeamMemberResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      forbidden: {"Not the business owner", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :deactivate,
    summary: "Deactivate trainer",
    description: "Owner-only: deactivates an active trainer and reassigns their clients to the owner.",
    operation_id: "deactivateTrainer",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Coach id")
    ],
    responses: [
      ok: {"Trainer deactivated", "application/json", TeamMemberResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      forbidden: {"Not the business owner", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, %{coaches: coaches, owner_id: owner_id}} <- Coaches.list_team(conn.assigns.ctx) do
      render(conn, :index, coaches: coaches, owner_id: owner_id)
    end
  end

  @spec invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def invite(conn, _params) do
    with {:ok, coach} <- Coaches.invite_trainer(conn.assigns.ctx, conn.body_params) do
      render(conn, :show, coach: coach)
    end
  end

  @spec resend_invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def resend_invite(conn, _params) do
    coach_id = conn.path_params["id"]

    with {:ok, coach} <- Coaches.resend_invite(conn.assigns.ctx, coach_id) do
      render(conn, :show, coach: coach)
    end
  end

  @spec revoke_invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def revoke_invite(conn, _params) do
    coach_id = conn.path_params["id"]

    with {:ok, coach} <- Coaches.revoke_invite(conn.assigns.ctx, coach_id) do
      render(conn, :show, coach: coach)
    end
  end

  @spec deactivate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def deactivate(conn, _params) do
    coach_id = conn.path_params["id"]

    with {:ok, coach} <- Coaches.deactivate_trainer(conn.assigns.ctx, coach_id) do
      render(conn, :show, coach: coach)
    end
  end
end
