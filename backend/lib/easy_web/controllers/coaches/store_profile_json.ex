defmodule EasyWeb.Coaches.StoreProfileJSON do
  alias Easy.Storefront.StoreProfile

  def show(%{profile: nil}) do
    %{data: nil}
  end

  def show(%{profile: profile}) do
    %{data: data(profile)}
  end

  defp data(%StoreProfile{} = profile) do
    %{
      id: profile.id,
      slug: profile.slug,
      display_name: profile.display_name,
      bio: profile.bio,
      photo_url: profile.photo_url,
      cover_image_url: profile.cover_image_url,
      social_links: profile.social_links,
      theme_color: profile.theme_color,
      is_published: profile.is_published,
      intake_questions: profile.intake_questions,
      headline: profile.headline,
      trust_stats: profile.trust_stats,
      faq_items: profile.faq_items,
      whatsapp_cta_enabled: profile.whatsapp_cta_enabled,
      whatsapp_cta_message: profile.whatsapp_cta_message,
      inserted_at: profile.inserted_at,
      updated_at: profile.updated_at
    }
  end
end
