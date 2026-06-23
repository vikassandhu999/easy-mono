defmodule EasyWeb.Coaches.TestimonialController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Testimonials
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    TestimonialListResponse,
    TestimonialRequest,
    TestimonialResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true]
       when action in [:create, :update]

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
    opts = [
      offset: parse_integer(params, "offset", 0),
      limit: parse_integer(params, "limit", 50)
    ]

    with {:ok, res} <- Testimonials.list_testimonials(conn.assigns.ctx, opts) do
      render(conn, :index, testimonials: res.testimonials, count: res.count)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, testimonial} <- Testimonials.create_testimonial(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, testimonial: testimonial)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, testimonial} <- Testimonials.get_testimonial(conn.assigns.ctx, id) do
      render(conn, :show, testimonial: testimonial)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, updated} <- Testimonials.update_testimonial(conn.assigns.ctx, id, conn.body_params) do
      render(conn, :show, testimonial: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, _deleted} <- Testimonials.delete_testimonial(conn.assigns.ctx, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
