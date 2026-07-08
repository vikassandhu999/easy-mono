defmodule EasyWeb.OpenApi.Schemas.TeamMember do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TeamMember",
      type: :object,
      additionalProperties: false,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        first_name: %Schema{type: :string, nullable: true},
        last_name: %Schema{type: :string, nullable: true},
        email: %Schema{type: :string, format: :email, nullable: true},
        status: %Schema{type: :string, enum: ["invited", "active", "inactive"]},
        is_owner: %Schema{type: :boolean},
        invitation_sent_at: %Schema{type: :string, format: :"date-time", nullable: true}
      },
      required: [:id, :first_name, :last_name, :email, :status, :is_owner, :invitation_sent_at]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TeamResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TeamMember}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(Shared.data_response(%Schema{type: :array, items: TeamMember}, "TeamResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.TeamMemberResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TeamMember}

  OpenApiSpex.schema(Shared.data_response(TeamMember, "TeamMemberResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.TrainerInviteRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainerInviteRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        email: %Schema{type: :string, format: :email},
        first_name: %Schema{type: :string, nullable: true},
        last_name: %Schema{type: :string, nullable: true}
      },
      required: [:email],
      example: %{
        "email" => "trainer@example.com",
        "first_name" => "Tara",
        "last_name" => "Trainer"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ReassignClientRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ReassignClientRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        coach_id: %Schema{type: :string, format: :uuid}
      },
      required: [:coach_id],
      example: %{"coach_id" => "b2d2b1b0-1234-4a2b-9c3d-abcdef123456"}
    },
    struct?: false
  )
end
