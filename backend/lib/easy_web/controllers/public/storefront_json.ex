defmodule EasyWeb.Public.StorefrontJSON do
  alias Easy.Clients.Client
  alias Easy.Storefront.{Offer, StoreProfile, Testimonial}

  def show(%{profile: profile, offers: offers, testimonials: testimonials}) do
    %{
      data: %{
        profile: profile_data(profile),
        offers: Enum.map(offers, &offer_data/1),
        testimonials: Enum.map(testimonials, &testimonial_data/1)
      }
    }
  end

  def inquiry(%{client: %Client{} = client}) do
    %{
      data: %{
        id: client.id,
        first_name: client.first_name,
        email: client.email,
        status: client.status
      }
    }
  end

  defp profile_data(%StoreProfile{} = p) do
    %{
      slug: p.slug,
      display_name: p.display_name,
      bio: p.bio,
      photo_url: p.photo_url,
      cover_image_url: p.cover_image_url,
      social_links: p.social_links,
      theme_color: p.theme_color,
      intake_questions: p.intake_questions,
      headline: p.headline,
      trust_stats: p.trust_stats,
      faq_items: p.faq_items,
      whatsapp_cta_enabled: p.whatsapp_cta_enabled,
      whatsapp_cta_message: p.whatsapp_cta_message
    }
  end

  defp offer_data(%Offer{} = o) do
    %{
      id: o.id,
      name: o.name,
      slug: o.slug,
      description: o.description,
      type: o.type,
      duration_text: o.duration_text,
      price: o.price,
      currency: o.currency,
      price_display: o.price_display,
      features: o.features,
      is_featured: o.is_featured,
      cta_text: o.cta_text
    }
  end

  defp testimonial_data(%Testimonial{} = t) do
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
      is_featured: t.is_featured
    }
  end
end
