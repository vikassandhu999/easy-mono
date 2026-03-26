defmodule EasyWeb.Coaches.TestimonialController do
  use EasyWeb, :controller

  alias Easy.Repo
  alias Easy.Storefront.Testimonial

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

  def create(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, testimonial} <- Testimonial.create(params, business_id) do
      conn
      |> put_status(:created)
      |> render(:show, testimonial: testimonial)
    end
  end

  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Testimonial |> Testimonial.for_business(business_id) |> Repo.get(id) do
      nil -> {:error, :not_found}
      testimonial -> render(conn, :show, testimonial: testimonial)
    end
  end

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
