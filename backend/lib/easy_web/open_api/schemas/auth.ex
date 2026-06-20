defmodule EasyWeb.OpenApi.Schemas.SignupRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "SignupRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        email: %Schema{type: :string, format: :email},
        first_name: %Schema{type: :string, maxLength: 255},
        last_name: %Schema{type: :string, maxLength: 255}
      },
      required: [:email],
      example: %{
        "email" => "coach@example.com",
        "first_name" => "Alex",
        "last_name" => "Coach"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.SignupResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.Shared
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "SignupResponse",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          email: %Schema{type: :string, format: :email},
          confirmation_sent_at: %Schema{type: :string, format: :"date-time", nullable: true}
        },
        Shared.timestamps()
      ),
    required: [:id, :email, :confirmation_sent_at, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.InvitationPreviewResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.Shared
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    Shared.data_response(
      %Schema{
        type: :object,
        additionalProperties: false,
        properties: %{
          state: %Schema{type: :string, enum: ["pending", "used", "expired", "invalid"]},
          business_name: %Schema{type: :string, nullable: true},
          coach_first_name: %Schema{type: :string, nullable: true},
          prefill_email: %Schema{type: :string, format: :email, nullable: true},
          expires_at: %Schema{type: :string, format: :"date-time", nullable: true}
        },
        required: [:state]
      },
      "InvitationPreviewResponse"
    )
  )
end

defmodule EasyWeb.OpenApi.Schemas.AcceptInviteRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "AcceptInviteRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        invitation_token: %Schema{type: :string},
        email: %Schema{type: :string, format: :email}
      },
      required: [:invitation_token, :email],
      example: %{
        "invitation_token" => "invite-token",
        "email" => "client@example.com"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.AcceptInviteVerifyRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "AcceptInviteVerifyRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        invitation_token: %Schema{type: :string},
        email: %Schema{type: :string, format: :email},
        otp: %Schema{type: :string}
      },
      required: [:invitation_token, :email, :otp],
      example: %{
        "invitation_token" => "invite-token",
        "email" => "client@example.com",
        "otp" => "123456"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.MessageResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "MessageResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      message: %Schema{type: :string}
    },
    required: [:message]
  })
end

defmodule EasyWeb.OpenApi.Schemas.OtpRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "OtpRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        email: %Schema{type: :string, format: :email},
        type: %Schema{type: :string, enum: ["email_confirmation", "authentication"]}
      },
      required: [:email, :type],
      example: %{
        "email" => "coach@example.com",
        "type" => "authentication"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.VerifyRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "VerifyRequest",
      type: :object,
      additionalProperties: false,
      oneOf: [
        %Schema{required: [:token]},
        %Schema{required: [:email, :otp]}
      ],
      properties: %{
        token: %Schema{type: :string},
        email: %Schema{type: :string, format: :email},
        otp: %Schema{type: :string}
      },
      example: %{
        "email" => "coach@example.com",
        "otp" => "123456"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TokenRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TokenRequest",
      type: :object,
      additionalProperties: false,
      oneOf: [
        %Schema{required: [:grant_type, :refresh_token]},
        %Schema{required: [:grant_type, :email, :otp, :role]}
      ],
      properties: %{
        grant_type: %Schema{type: :string, enum: ["refresh_token", "otp"]},
        refresh_token: %Schema{type: :string},
        email: %Schema{type: :string, format: :email},
        otp: %Schema{type: :string},
        role: %Schema{type: :string, enum: ["owner", "coach", "client", "guest"]}
      },
      example: %{
        "grant_type" => "otp",
        "email" => "coach@example.com",
        "otp" => "123456",
        "role" => "coach"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.AuthTokenResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "AuthTokenResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      access_token: %Schema{type: :string},
      token_type: %Schema{type: :string, example: "Bearer"},
      expires_in: %Schema{type: :integer, example: 300},
      refresh_token: %Schema{type: :string},
      scope: %Schema{type: :string}
    },
    required: [:access_token, :token_type, :expires_in, :refresh_token, :scope]
  })
end
