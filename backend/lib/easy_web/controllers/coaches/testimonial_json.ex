defmodule EasyWeb.Coaches.TestimonialJSON do
  alias Easy.Storefront.Testimonial

  def show(%{testimonial: testimonial}) do
    %{data: data(testimonial)}
  end

  def index(%{testimonials: testimonials, count: count}) do
    %{data: Enum.map(testimonials, &data/1), count: count}
  end

  defp data(%Testimonial{} = t) do
    %{
      id: t.id,
      client_name: t.client_name,
      client_handle: t.client_handle,
      quote: t.quote,
      rating: t.rating,
      result_tag: t.result_tag,
      program_name: t.program_name,
      duration_text: t.duration_text,
      before_image_url: t.before_image_url,
      after_image_url: t.after_image_url,
      before_weight: t.before_weight,
      after_weight: t.after_weight,
      is_featured: t.is_featured,
      status: t.status,
      position: t.position,
      inserted_at: t.inserted_at,
      updated_at: t.updated_at
    }
  end
end
