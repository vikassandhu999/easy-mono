defmodule Easy.Storefront do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Storefront.{Offer, StoreProfile, Testimonial}

  @spec get_store_profile(Ctx.t()) :: {:ok, StoreProfile.t()} | {:error, :not_found}
  def get_store_profile(%Ctx{} = ctx) do
    StoreProfile
    |> StoreProfile.for_business(ctx.business_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  @spec upsert_store_profile(Ctx.t(), map()) ::
          {:ok, StoreProfile.t(), :created | :updated} | {:error, Ecto.Changeset.t()}
  def upsert_store_profile(%Ctx{} = ctx, attrs) do
    case StoreProfile |> StoreProfile.for_business(ctx.business_id) |> Repo.one() do
      nil ->
        attrs
        |> StoreProfile.insert_changeset(ctx.business_id)
        |> Repo.insert()
        |> case do
          {:ok, profile} -> {:ok, profile, :created}
          {:error, cs} -> {:error, cs}
        end

      profile ->
        profile
        |> StoreProfile.update_changeset(attrs)
        |> Repo.update()
        |> case do
          {:ok, updated} -> {:ok, updated, :updated}
          {:error, cs} -> {:error, cs}
        end
    end
  end

  @spec get_public_profile(String.t()) ::
          {:ok, %{profile: StoreProfile.t(), offers: [Offer.t()], testimonials: [Testimonial.t()]}}
          | {:error, :not_found}
  def get_public_profile(slug) do
    with {:ok, profile} <- get_published_profile(slug) do
      {:ok,
       %{
         profile: profile,
         offers: active_offers(profile.business_id),
         testimonials: active_testimonials(profile.business_id)
       }}
    end
  end

  # Documented exception: public inquiry — no ctx, uses slug to resolve business
  @spec create_inquiry(String.t(), map()) ::
          {:ok, Client.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_inquiry(slug, params) do
    with {:ok, profile} <- get_published_profile(slug) do
      Clients.create_inquiry(%Ctx{business_id: profile.business_id, user_id: nil}, inquiry_params(params))
    end
  end

  defp get_published_profile(slug) do
    case StoreProfile |> StoreProfile.by_slug(slug) |> StoreProfile.published() |> Repo.one() do
      nil -> {:error, :not_found}
      profile -> {:ok, profile}
    end
  end

  defp active_offers(business_id) do
    Offer
    |> Offer.for_business(business_id)
    |> Offer.active()
    |> Offer.by_position()
    |> Repo.all()
  end

  defp active_testimonials(business_id) do
    Testimonial
    |> Testimonial.for_business(business_id)
    |> Testimonial.active()
    |> Testimonial.by_position()
    |> Repo.all()
  end

  @spec check_slug_available(Ctx.t(), String.t()) :: boolean()
  def check_slug_available(%Ctx{} = ctx, slug) do
    import Ecto.Query

    query = StoreProfile |> StoreProfile.by_slug(slug)
    query = from(sp in query, where: sp.business_id != ^ctx.business_id)
    not Repo.exists?(query)
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}

  defp inquiry_params(%{"name" => name} = params) when is_binary(name) do
    {first_name, last_name} =
      case String.split(name, " ", parts: 2) do
        [first, last] -> {first, last}
        [first] -> {first, nil}
      end

    params
    |> Map.put_new("first_name", first_name)
    |> Map.put_new("last_name", last_name)
    |> Map.delete("name")
  end

  defp inquiry_params(params), do: params
end
