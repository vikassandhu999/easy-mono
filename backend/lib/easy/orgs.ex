defmodule Easy.Orgs do
  alias Easy.Ctx
  alias Easy.Orgs.Business
  alias Easy.Coaches
  alias Easy.Identity.User
  alias Easy.Repo
  alias Easy.Businesses

  # TODO: Add subscriptions and billing later.

  # pre-auth onboarding: no ctx yet — runs during signup before a tenant ctx is established
  @spec create_business(User.t(), map()) :: {:ok, Business.t()} | {:error, Ecto.Changeset.t()}
  def create_business(user, attrs) do
    Repo.transaction(fn ->
      with {:ok, business} <- Businesses.create(user, attrs),
           {:ok, _} <- Coaches.create(user, business) do
        business
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  # pre-auth onboarding: no ctx yet — used during session creation to resolve the tenant
  @spec get_business_for_coach(User.t()) :: Business.t() | nil
  def get_business_for_coach(user) do
    Businesses.get_one_for_coach(user)
  end

  @spec get_business(Ctx.t()) :: {:ok, Business.t()} | {:error, Easy.Error.t()}
  def get_business(%Ctx{} = ctx) do
    Businesses.get_one(ctx.business_id)
  end

  @spec update_business(Ctx.t(), map()) :: {:ok, Business.t()} | {:error, any()}
  def update_business(%Ctx{} = ctx, attrs) when is_map(attrs) do
    with {:ok, business} <- Businesses.get_one(ctx.business_id),
         {:ok, updated_business} <- Businesses.update(business, attrs) do
      {:ok, updated_business}
    end
  end
end
