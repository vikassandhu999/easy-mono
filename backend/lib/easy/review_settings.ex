defmodule Easy.Reviews.Settings do
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs.Business
  alias Easy.Repo
  import Ecto.Query
  import Ecto.Changeset

  @spec get(Ctx.t()) :: {:ok, map()} | {:error, atom()}
  def get(ctx) do
    with :ok <- Ctx.ensure_coach(ctx) do
      case Repo.get(Business, ctx.business_id) do
        nil -> {:error, :not_found}
        business -> {:ok, %{default_review_frequency_days: business.default_review_frequency_days}}
      end
    end
  end

  @spec update(Ctx.t(), map()) :: {:ok, map()} | {:error, term()}
  def update(%Ctx{owner?: false}, _), do: {:error, :not_owner}

  def update(ctx, attrs) do
    with :ok <- Ctx.ensure_coach(ctx), do: Repo.transact(fn -> update_locked(ctx, attrs) end)
  end

  defp update_locked(ctx, attrs) do
    business = Repo.one(from(b in Business, where: b.id == ^ctx.business_id, lock: "FOR UPDATE"))

    changeset =
      business
      |> cast(attrs, [:default_review_frequency_days])
      |> validate_required([:default_review_frequency_days])
      |> validate_inclusion(:default_review_frequency_days, [1, 3, 7, 14, 28])
      |> check_constraint(:default_review_frequency_days, name: :businesses_review_frequency_check)

    with {:ok, updated} <- Repo.update(changeset) do
      if Map.get(attrs, :apply_to_existing, Map.get(attrs, "apply_to_existing", false)) do
        Client.for_business(ctx.business_id)
        |> Repo.update_all(set: [review_frequency_days: updated.default_review_frequency_days])
      end

      {:ok, %{default_review_frequency_days: updated.default_review_frequency_days}}
    end
  end
end
