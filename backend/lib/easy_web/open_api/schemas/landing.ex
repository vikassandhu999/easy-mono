defmodule EasyWeb.OpenApi.Schemas.Landing.Common do
  alias OpenApiSpex.Schema

  def templates, do: ~w(proof_first problem_fit coach_story)
  def page_statuses, do: ~w(draft published)
  def question_types, do: ~w(short_text long_text single_select)
  def prospect_statuses, do: ~w(new reviewing won lost)

  def proof_point,
    do: %Schema{
      type: :object,
      additionalProperties: false,
      properties: %{label: %Schema{type: :string}, value: %Schema{type: :string}}
    }

  def question,
    do: %Schema{
      type: :object,
      additionalProperties: false,
      properties: %{
        id: %Schema{type: :string},
        label: %Schema{type: :string},
        type: %Schema{type: :string, enum: question_types()},
        options: %Schema{type: :array, items: %Schema{type: :string}}
      }
    }

  def program_entity,
    do: %{
      id: %Schema{type: :string, format: :uuid},
      name: %Schema{type: :string},
      audience: %Schema{type: :string, nullable: true},
      promise: %Schema{type: :string, nullable: true},
      description: %Schema{type: :string, nullable: true},
      price_display: %Schema{type: :string, nullable: true},
      position: %Schema{type: :integer}
    }
end

# ── Coach: requests ──────────────────────────────────────────────────────────

defmodule EasyWeb.OpenApi.Schemas.LandingProgramInput do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "LandingProgramInput",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string},
        audience: %Schema{type: :string, nullable: true},
        promise: %Schema{type: :string, nullable: true},
        description: %Schema{type: :string, nullable: true},
        price_display: %Schema{type: :string, nullable: true}
      },
      required: [:name]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.LandingPageUpsertRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{Landing.Common, LandingProgramInput}

  OpenApiSpex.schema(
    %{
      title: "LandingPageUpsertRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        slug: %Schema{type: :string},
        template: %Schema{type: :string, enum: Common.templates()},
        headline: %Schema{type: :string},
        subheadline: %Schema{type: :string, nullable: true},
        eyebrow: %Schema{type: :string, nullable: true},
        coach_intro: %Schema{type: :string, nullable: true},
        hero_image_url: %Schema{type: :string, nullable: true},
        proof_points: %Schema{type: :array, items: Common.proof_point()},
        fit_points: %Schema{type: :array, items: %Schema{type: :string}},
        application_questions: %Schema{type: :array, items: Common.question(), maxItems: 5},
        status: %Schema{type: :string, enum: Common.page_statuses()},
        programs: %Schema{type: :array, items: LandingProgramInput, maxItems: 3}
      },
      required: [:slug, :template, :headline, :status],
      example: %{
        "slug" => "kavya-strength",
        "template" => "proof_first",
        "headline" => "Build strength without guessing what to do next.",
        "subheadline" => "Personal coaching for people who train hard but need structure.",
        "status" => "published",
        "proof_points" => [%{"label" => "clients coached", "value" => "220+"}],
        "application_questions" => [
          %{"id" => "goal", "label" => "What is your main goal?", "type" => "long_text", "options" => []}
        ],
        "programs" => [%{"name" => "Fat loss coaching", "audience" => "For busy professionals"}]
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ProspectUpdateRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Landing.Common

  OpenApiSpex.schema(
    %{
      title: "ProspectUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        status: %Schema{type: :string, enum: Common.prospect_statuses()},
        notes: %Schema{type: :string, nullable: true}
      },
      required: [:status],
      example: %{"status" => "reviewing", "notes" => "Followed up on WhatsApp."}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ProspectEnrollRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ProspectEnrollRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        first_name: %Schema{type: :string, nullable: true},
        last_name: %Schema{type: :string, nullable: true},
        email: %Schema{type: :string, nullable: true},
        phone: %Schema{type: :string, nullable: true}
      },
      example: %{"first_name" => "Priya", "last_name" => "Sharma", "email" => "priya@example.com"}
    },
    struct?: false
  )
end

# ── Coach: entities + responses ──────────────────────────────────────────────

defmodule EasyWeb.OpenApi.Schemas.LandingProgram do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.Landing.Common

  OpenApiSpex.schema(%{
    title: "LandingProgram",
    type: :object,
    additionalProperties: false,
    properties: Common.program_entity(),
    required: [:id, :name, :position]
  })
end

defmodule EasyWeb.OpenApi.Schemas.LandingPage do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{Landing.Common, LandingProgram, Shared}

  OpenApiSpex.schema(%{
    title: "LandingPage",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(Shared.timestamps(), %{
        id: %Schema{type: :string, format: :uuid},
        slug: %Schema{type: :string},
        template: %Schema{type: :string, enum: Common.templates()},
        headline: %Schema{type: :string},
        subheadline: %Schema{type: :string, nullable: true},
        eyebrow: %Schema{type: :string, nullable: true},
        coach_intro: %Schema{type: :string, nullable: true},
        hero_image_url: %Schema{type: :string, nullable: true},
        proof_points: %Schema{type: :array, items: Common.proof_point()},
        fit_points: %Schema{type: :array, items: %Schema{type: :string}},
        application_questions: %Schema{type: :array, items: Common.question()},
        status: %Schema{type: :string, enum: Common.page_statuses()},
        programs: %Schema{type: :array, items: LandingProgram}
      }),
    required: [:id, :slug, :template, :headline, :status, :programs]
  })
end

defmodule EasyWeb.OpenApi.Schemas.LandingPageResponse do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.LandingPage

  # `data` is null until the coach first saves a page.
  OpenApiSpex.schema(%{
    title: "LandingPageResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: %Schema{nullable: true, allOf: [LandingPage]}},
    required: [:data]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ProspectClient do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ProspectClient",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      first_name: %Schema{type: :string, nullable: true},
      last_name: %Schema{type: :string, nullable: true},
      status: %Schema{type: :string}
    },
    required: [:id, :status]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ProspectProgram do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ProspectProgram",
    type: :object,
    additionalProperties: false,
    properties: %{id: %Schema{type: :string, format: :uuid}, name: %Schema{type: :string}},
    required: [:id, :name]
  })
end

defmodule EasyWeb.OpenApi.Schemas.Prospect do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{Landing.Common, ProspectClient, ProspectProgram, Shared}

  OpenApiSpex.schema(%{
    title: "Prospect",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(Shared.timestamps(), %{
        id: %Schema{type: :string, format: :uuid},
        name: %Schema{type: :string},
        phone: %Schema{type: :string, nullable: true},
        email: %Schema{type: :string, nullable: true},
        instagram: %Schema{type: :string, nullable: true},
        answers: %Schema{type: :object, additionalProperties: true},
        status: %Schema{type: :string, enum: Common.prospect_statuses()},
        notes: %Schema{type: :string, nullable: true},
        landing_page_slug: %Schema{type: :string, nullable: true},
        program: %Schema{nullable: true, allOf: [ProspectProgram]},
        client: %Schema{nullable: true, allOf: [ProspectClient]}
      }),
    required: [:id, :name, :status, :answers]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ProspectResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Prospect, Shared}

  OpenApiSpex.schema(Shared.data_response(Prospect, "ProspectResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ProspectListResponse do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Prospect

  OpenApiSpex.schema(%{
    title: "ProspectListResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      data: %Schema{type: :array, items: Prospect},
      count: %Schema{type: :integer, minimum: 0},
      summary: %Schema{
        type: :object,
        additionalProperties: false,
        properties: %{
          new: %Schema{type: :integer},
          reviewing: %Schema{type: :integer},
          won: %Schema{type: :integer},
          lost: %Schema{type: :integer}
        }
      }
    },
    required: [:data, :count, :summary]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ProspectEnrollResponse do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Prospect

  OpenApiSpex.schema(%{
    title: "ProspectEnrollResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      data: %Schema{
        type: :object,
        additionalProperties: false,
        properties: %{
          prospect: Prospect,
          already_enrolled: %Schema{type: :boolean}
        },
        required: [:prospect, :already_enrolled]
      }
    },
    required: [:data]
  })
end

# ── Public: render + apply ───────────────────────────────────────────────────

defmodule EasyWeb.OpenApi.Schemas.PublicLandingPage do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{Landing.Common, LandingProgram}

  OpenApiSpex.schema(%{
    title: "PublicLandingPage",
    type: :object,
    additionalProperties: false,
    properties: %{
      slug: %Schema{type: :string},
      template: %Schema{type: :string, enum: Common.templates()},
      headline: %Schema{type: :string},
      subheadline: %Schema{type: :string, nullable: true},
      eyebrow: %Schema{type: :string, nullable: true},
      coach_intro: %Schema{type: :string, nullable: true},
      hero_image_url: %Schema{type: :string, nullable: true},
      proof_points: %Schema{type: :array, items: Common.proof_point()},
      fit_points: %Schema{type: :array, items: %Schema{type: :string}},
      application_questions: %Schema{type: :array, items: Common.question()},
      programs: %Schema{type: :array, items: LandingProgram},
      business_name: %Schema{type: :string},
      whatsapp_number: %Schema{type: :string, nullable: true}
    },
    required: [:slug, :template, :headline, :programs, :application_questions, :business_name]
  })
end

defmodule EasyWeb.OpenApi.Schemas.PublicLandingPageResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{PublicLandingPage, Shared}

  OpenApiSpex.schema(Shared.data_response(PublicLandingPage, "PublicLandingPageResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.PublicApplicationRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "PublicApplicationRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string},
        phone: %Schema{type: :string, nullable: true},
        email: %Schema{type: :string, nullable: true},
        instagram: %Schema{type: :string, nullable: true},
        landing_program_id: %Schema{type: :string, format: :uuid, nullable: true},
        answers: %Schema{type: :object, additionalProperties: true}
      },
      required: [:name],
      example: %{
        "name" => "Priya Sharma",
        "email" => "priya@example.com",
        "landing_program_id" => "00000000-0000-0000-0000-000000000000",
        "answers" => %{"goal" => "Lose 8 kg and build a routine."}
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.PublicApplicationResponse do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "PublicApplicationResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      data: %Schema{
        type: :object,
        additionalProperties: false,
        properties: %{
          id: %Schema{type: :string, format: :uuid},
          name: %Schema{type: :string},
          program_name: %Schema{type: :string, nullable: true},
          business_name: %Schema{type: :string},
          whatsapp_number: %Schema{type: :string, nullable: true}
        },
        required: [:id, :name, :business_name]
      }
    },
    required: [:data]
  })
end
