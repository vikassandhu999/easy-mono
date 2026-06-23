defmodule Easy.Testimonials do
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Storefront.Testimonial
  alias Easy.Utils

  @spec list_testimonials(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), testimonials: [Testimonial.t()]}}
  def list_testimonials(%Ctx{} = ctx, opts \\ []) do
    offset = Keyword.get(opts, :offset, 0)
    limit = Keyword.get(opts, :limit, 50)

    base = Testimonial |> Testimonial.for_business(ctx.business_id)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       testimonials: base |> Testimonial.by_position() |> Utils.paginate(offset, limit) |> Repo.all()
     }}
  end

  @spec get_testimonial(Ctx.t(), String.t()) :: {:ok, Testimonial.t()} | {:error, :not_found}
  def get_testimonial(%Ctx{} = ctx, id) do
    Testimonial
    |> Testimonial.for_business(ctx.business_id)
    |> Repo.get(id)
    |> ok_or_not_found()
  end

  @spec create_testimonial(Ctx.t(), map()) :: {:ok, Testimonial.t()} | {:error, Ecto.Changeset.t()}
  def create_testimonial(%Ctx{} = ctx, attrs) do
    ctx.business_id
    |> Testimonial.insert_changeset(attrs)
    |> Repo.insert()
  end

  @spec update_testimonial(Ctx.t(), String.t(), map()) ::
          {:ok, Testimonial.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_testimonial(%Ctx{} = ctx, id, attrs) do
    with {:ok, testimonial} <- get_testimonial(ctx, id) do
      testimonial
      |> Testimonial.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec delete_testimonial(Ctx.t(), String.t()) ::
          {:ok, Testimonial.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_testimonial(%Ctx{} = ctx, id) do
    with {:ok, testimonial} <- get_testimonial(ctx, id) do
      Repo.delete(testimonial)
    end
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
