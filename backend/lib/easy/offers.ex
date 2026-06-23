defmodule Easy.Offers do
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Storefront.Offer
  alias Easy.Utils

  @spec list_offers(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), offers: [Offer.t()]}}
  def list_offers(%Ctx{} = ctx, opts \\ []) do
    offset = Keyword.get(opts, :offset, 0)
    limit = Keyword.get(opts, :limit, 50)

    base = Offer |> Offer.for_business(ctx.business_id)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       offers: base |> Offer.by_position() |> Utils.paginate(offset, limit) |> Repo.all()
     }}
  end

  @spec get_offer(Ctx.t(), String.t()) :: {:ok, Offer.t()} | {:error, :not_found}
  def get_offer(%Ctx{} = ctx, id) do
    Offer
    |> Offer.for_business(ctx.business_id)
    |> Repo.get(id)
    |> ok_or_not_found()
  end

  @spec create_offer(Ctx.t(), map()) :: {:ok, Offer.t()} | {:error, Ecto.Changeset.t()}
  def create_offer(%Ctx{} = ctx, attrs) do
    ctx.business_id
    |> Offer.insert_changeset(attrs)
    |> Repo.insert()
  end

  @spec update_offer(Ctx.t(), String.t(), map()) ::
          {:ok, Offer.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_offer(%Ctx{} = ctx, id, attrs) do
    with {:ok, offer} <- get_offer(ctx, id) do
      offer
      |> Offer.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec delete_offer(Ctx.t(), String.t()) ::
          {:ok, Offer.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_offer(%Ctx{} = ctx, id) do
    with {:ok, offer} <- get_offer(ctx, id) do
      Repo.delete(offer)
    end
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
