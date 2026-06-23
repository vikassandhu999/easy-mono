defmodule EasyWeb.OpenApi.Schemas.StoreProfileRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "StoreProfileRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        slug: %Schema{type: :string},
        display_name: %Schema{type: :string},
        bio: %Schema{type: :string, nullable: true},
        photo_url: %Schema{type: :string, nullable: true},
        cover_image_url: %Schema{type: :string, nullable: true},
        social_links: %Schema{type: :object, additionalProperties: true},
        theme_color: %Schema{type: :string, nullable: true},
        is_published: %Schema{type: :boolean},
        intake_questions: %Schema{type: :array, items: %Schema{type: :object, additionalProperties: true}},
        headline: %Schema{type: :string, nullable: true},
        trust_stats: %Schema{type: :array, items: %Schema{type: :object, additionalProperties: true}},
        faq_items: %Schema{type: :array, items: %Schema{type: :object, additionalProperties: true}},
        whatsapp_cta_enabled: %Schema{type: :boolean},
        whatsapp_cta_message: %Schema{type: :string, nullable: true}
      },
      example: %{"slug" => "strong-coaching", "display_name" => "Strong Coaching"}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.StoreProfile do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Shared

  OpenApiSpex.schema(%{
    title: "StoreProfile",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          slug: %Schema{type: :string},
          display_name: %Schema{type: :string},
          bio: %Schema{type: :string, nullable: true},
          photo_url: %Schema{type: :string, nullable: true},
          cover_image_url: %Schema{type: :string, nullable: true},
          social_links: %Schema{type: :object, additionalProperties: true},
          theme_color: %Schema{type: :string, nullable: true},
          is_published: %Schema{type: :boolean},
          intake_questions: %Schema{type: :array, items: %Schema{type: :object, additionalProperties: true}},
          headline: %Schema{type: :string, nullable: true},
          trust_stats: %Schema{type: :array, items: %Schema{type: :object, additionalProperties: true}},
          faq_items: %Schema{type: :array, items: %Schema{type: :object, additionalProperties: true}},
          whatsapp_cta_enabled: %Schema{type: :boolean},
          whatsapp_cta_message: %Schema{type: :string, nullable: true}
        },
        Shared.timestamps()
      )
  })
end

defmodule EasyWeb.OpenApi.Schemas.StoreProfileResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.StoreProfile

  OpenApiSpex.schema(%{
    title: "StoreProfileResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: %Schema{allOf: [StoreProfile], nullable: true}},
    required: [:data]
  })
end

defmodule EasyWeb.OpenApi.Schemas.SlugCheckRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "SlugCheckRequest",
      type: :object,
      additionalProperties: false,
      properties: %{slug: %Schema{type: :string}},
      required: [:slug]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.SlugCheckResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "SlugCheckResponse",
    type: :object,
    additionalProperties: false,
    properties: %{available: %Schema{type: :boolean}},
    required: [:available]
  })
end

defmodule EasyWeb.OpenApi.Schemas.OfferRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "OfferRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string},
        slug: %Schema{type: :string},
        description: %Schema{type: :string, nullable: true},
        type: %Schema{type: :string},
        duration_text: %Schema{type: :string, nullable: true},
        price: %Schema{type: :integer, nullable: true},
        currency: %Schema{type: :string, nullable: true},
        price_display: %Schema{type: :string, nullable: true},
        features: %Schema{type: :array, items: %Schema{type: :string}},
        is_featured: %Schema{type: :boolean},
        status: %Schema{type: :string},
        position: %Schema{type: :integer},
        cta_text: %Schema{type: :string, nullable: true}
      },
      required: [:name],
      example: %{"name" => "12 Week Transformation", "type" => "coaching"}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.Offer do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Shared

  OpenApiSpex.schema(%{
    title: "Offer",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          name: %Schema{type: :string},
          slug: %Schema{type: :string},
          description: %Schema{type: :string, nullable: true},
          type: %Schema{type: :string},
          duration_text: %Schema{type: :string, nullable: true},
          price: %Schema{type: :number, nullable: true},
          currency: %Schema{type: :string, nullable: true},
          price_display: %Schema{type: :string, nullable: true},
          features: %Schema{type: :array, items: %Schema{type: :string}},
          is_featured: %Schema{type: :boolean},
          status: %Schema{type: :string},
          position: %Schema{type: :integer},
          cta_text: %Schema{type: :string, nullable: true}
        },
        Shared.timestamps()
      )
  })
end

defmodule EasyWeb.OpenApi.Schemas.OfferResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Offer, Shared}

  OpenApiSpex.schema(Shared.data_response(Offer, "OfferResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.OfferListResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Offer

  OpenApiSpex.schema(%{
    title: "OfferListResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: %Schema{type: :array, items: Offer}, count: %Schema{type: :integer}},
    required: [:data, :count]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TestimonialRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TestimonialRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        client_name: %Schema{type: :string},
        client_handle: %Schema{type: :string, nullable: true},
        quote: %Schema{type: :string, nullable: true},
        rating: %Schema{type: :integer, nullable: true},
        result_tag: %Schema{type: :string, nullable: true},
        program_name: %Schema{type: :string, nullable: true},
        duration_text: %Schema{type: :string, nullable: true},
        before_image_url: %Schema{type: :string, nullable: true},
        after_image_url: %Schema{type: :string, nullable: true},
        before_weight: %Schema{type: :string, nullable: true},
        after_weight: %Schema{type: :string, nullable: true},
        is_featured: %Schema{type: :boolean},
        status: %Schema{type: :string},
        position: %Schema{type: :integer}
      },
      required: [:client_name],
      example: %{"client_name" => "Jamie", "quote" => "I feel stronger every week."}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.Testimonial do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "Testimonial",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      client_name: %Schema{type: :string},
      client_handle: %Schema{type: :string, nullable: true},
      quote: %Schema{type: :string, nullable: true},
      rating: %Schema{type: :integer, nullable: true},
      result_tag: %Schema{type: :string, nullable: true},
      program_name: %Schema{type: :string, nullable: true},
      duration_text: %Schema{type: :string, nullable: true},
      before_image_url: %Schema{type: :string, nullable: true},
      after_image_url: %Schema{type: :string, nullable: true},
      before_weight: %Schema{type: :string, nullable: true},
      after_weight: %Schema{type: :string, nullable: true},
      is_featured: %Schema{type: :boolean},
      status: %Schema{type: :string},
      position: %Schema{type: :integer},
      inserted_at: %Schema{type: :string, format: :"date-time"},
      updated_at: %Schema{type: :string, format: :"date-time"}
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.TestimonialResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Testimonial, Shared}

  OpenApiSpex.schema(Shared.data_response(Testimonial, "TestimonialResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.TestimonialListResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Testimonial

  OpenApiSpex.schema(%{
    title: "TestimonialListResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: %Schema{type: :array, items: Testimonial}, count: %Schema{type: :integer}},
    required: [:data, :count]
  })
end

defmodule EasyWeb.OpenApi.Schemas.PublicStorefrontResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "PublicStorefrontResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: %Schema{type: :object, additionalProperties: true}},
    required: [:data]
  })
end

defmodule EasyWeb.OpenApi.Schemas.StorefrontInquiryRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "StorefrontInquiryRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        first_name: %Schema{type: :string},
        last_name: %Schema{type: :string, nullable: true},
        email: %Schema{type: :string, format: :email},
        phone: %Schema{type: :string}
      },
      required: [:first_name, :email, :phone],
      example: %{"first_name" => "Jamie", "email" => "jamie@example.com", "phone" => "+15551234567"}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.StorefrontInquiryResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "StorefrontInquiryResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: %Schema{type: :object, additionalProperties: true}},
    required: [:data]
  })
end
