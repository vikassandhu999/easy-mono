defmodule EasyWeb.Coaches.TestimonialController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Repo
  alias Easy.Storefront.Testimonial
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    TestimonialListResponse,
    TestimonialRequest,
    TestimonialResponse
  }

  tags ["coach testimonials"]

  operation :index,
    summary: "List testimonials",
    operation_id: "listTestimonials",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of testimonials to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum testimonials to return", required: false)
    ],
    responses: [ok: {"Testimonials", "application/json", TestimonialListResponse}, unauthorized: {"Unauthorized", "application/json", ErrorResponse}]

  operation :create,
    summary: "Create testimonial",
    operation_id: "createTestimonial",
    security: [%{"bearerAuth" => []}],
    request_body: {"Testimonial request", "application/json", TestimonialRequest, required: true},
    responses: [
      created: {"Testimonial created", "application/json", TestimonialResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get testimonial",
    operation_id: "getTestimonial",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Testimonial id")],
    responses: [
      ok: {"Testimonial", "application/json", TestimonialResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update testimonial",
    operation_id: "updateTestimonial",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Testimonial id")],
    request_body: {"Testimonial request", "application/json", TestimonialRequest, required: true},
    responses: [
      ok: {"Testimonial updated", "application/json", TestimonialResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete testimonial",
    operation_id: "deleteTestimonial",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Testimonial id")],
    responses: [no_content: "Testimonial deleted", unauthorized: {"Unauthorized", "application/json", ErrorResponse}, not_found: {"Not found", "application/json", ErrorResponse}]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)

    base = Testimonial |> Testimonial.for_business(business_id)
    count = Repo.aggregate(base, :count, :id)

    testimonials =
      base
      |> Testimonial.ordered()
      |> Easy.Utils.paginate(offset, limit)
      |> Repo.all()

    render(conn, :index, testimonials: testimonials, count: count)
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, testimonial} <- Testimonial.create(params, business_id) do
      conn
      |> put_status(:created)
      |> render(:show, testimonial: testimonial)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Testimonial |> Testimonial.for_business(business_id) |> Repo.get(id) do
      nil -> {:error, :not_found}
      testimonial -> render(conn, :show, testimonial: testimonial)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Testimonial |> Testimonial.for_business(business_id) |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      testimonial ->
        with {:ok, updated} <- Testimonial.update(testimonial, conn.body_params) do
          render(conn, :show, testimonial: updated)
        end
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Testimonial |> Testimonial.for_business(business_id) |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      testimonial ->
        with {:ok, _deleted} <- Testimonial.delete(testimonial) do
          send_resp(conn, :no_content, "")
        end
    end
  end
end
