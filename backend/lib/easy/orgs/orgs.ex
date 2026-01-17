defmodule Easy.Orgs do
  alias Easy.Organizations.Business
  alias Easy.Orgs.Coaches
  alias Easy.Identity.User
  alias Easy.Orgs.Business
  alias Easy.Repo
  alias Easy.Orgs.Businesses

  # TODO: Add subscriptions and billing later.
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

  @spec get_business_for_coach(User.t()) :: Business.t() | nil
  def get_business_for_coach(user) do
    Businesses.get_one_for_coach(user)
  end

  def get_business(business_id) do
    Businesses.get_one(business_id)
  end

  def update_business(business_id, attrs) when is_map(attrs) do
    with {:ok, business} <- Businesses.get_one(business_id),
         {:ok, updated_business} <- Businesses.update(business, attrs) do
      {:ok, updated_business}
    end
  end

  def get_coach(coach_id) do
    Coaches.get_one(coach_id)
  end

  def update_coach(coach, attrs) when is_map(attrs) do
    with {:ok, updated_coach} <- Coaches.update(coach, attrs) do
      {:ok, updated_coach}
    end
  end
end
