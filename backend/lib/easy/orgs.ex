defmodule Easy.Orgs do
  import Ecto.Query
  alias Easy.Billing.BusinessBilling
  alias Easy.CoachingTerms
  alias Easy.Ctx
  alias Easy.Identity.Users
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.Repo

  # pre-auth onboarding: no ctx yet — runs during signup before a tenant ctx is established
  @spec create_business(Ctx.t(), map()) ::
          {:ok, Business.t()} | {:error, :user_not_found | Ecto.Changeset.t()}
  def create_business(%Ctx{} = ctx, attrs) do
    with {:ok, user} <- Users.get_by_id(ctx.user_id) do
      Repo.transact(fn -> create_business_transaction(user, attrs) end)
    end
  end

  defp create_business_transaction(user, attrs) do
    with {:ok, business} <- user.id |> Business.insert_changeset(attrs) |> Repo.insert(),
         {:ok, billing} <- business.id |> BusinessBilling.insert_changeset() |> Repo.insert(),
         {:ok, _coach} <- business.id |> Coach.insert_changeset(user.id, attrs) |> Repo.insert() do
      {:ok, %{business | owner: user, billing: billing}}
    end
  end

  @spec get_business(Ctx.t()) :: {:ok, Business.t()} | {:error, :not_found}
  def get_business(%Ctx{} = ctx) do
    Business
    |> Repo.get(ctx.business_id)
    |> with_seats(ctx)
  end

  @spec update_business(Ctx.t(), map()) :: {:ok, Business.t()} | {:error, :not_owner | :not_found | Ecto.Changeset.t()}
  def update_business(%Ctx{owner?: false}, _attrs), do: {:error, :not_owner}

  def update_business(%Ctx{} = ctx, attrs) when is_map(attrs) do
    with {:ok, business} <- get_business(ctx) do
      business
      |> Business.update_changeset(attrs)
      |> Repo.update()
      |> case do
        {:ok, updated} -> with_seats(updated, ctx)
        error -> error
      end
    end
  end

  @spec handle_availability(Ctx.t(), String.t()) :: {:ok, %{available: boolean()}}
  def handle_availability(%Ctx{} = ctx, handle) do
    taken = Repo.exists?(from b in Business, where: fragment("lower(?)", b.handle) == ^String.downcase(handle) and b.id != ^(ctx.business_id || Ecto.UUID.generate()))
    {:ok, %{available: Business.valid_handle?(handle) and not taken}}
  end

  defp with_seats(nil, _ctx), do: {:error, :not_found}

  defp with_seats(business, ctx) do
    {:ok, used} = CoachingTerms.used_seats(ctx)
    {:ok, %{Repo.preload(business, :billing) | seats_used: used}}
  end
end
