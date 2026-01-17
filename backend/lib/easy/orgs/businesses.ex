defmodule Easy.Orgs.Businesses do
  alias Easy.Identity
  alias Easy.Orgs
  alias Easy.Repo
  import Ecto.Query

  @spec create(Identity.User.t(), map()) ::
          {:ok, Orgs.Business.t()} | {:error, Ecto.Changeset.t()}
  def create(user, attrs) do
    attrs
    |> Orgs.Business.create_changeset(user)
    |> Repo.insert()
  end

  @spec get_one_for_coach(Identity.User.t()) ::
          Orgs.Business.t()
  def get_one_for_coach(user) do
    Easy.Repo.one(
      from(
        b in Orgs.Business,
        join: c in Orgs.Coach,
        on: c.business_id == b.id,
        where: c.user_id == ^user.id,
        limit: 1
      )
    )
  end

  @spec get_one_for_coach(Identity.User.t(), String.t()) ::
          Orgs.Business.t()
  def get_one_for_coach(user, business_id) do
    Easy.Repo.one(
      from(
        b in Orgs.Business,
        join: c in Orgs.Coach,
        on: c.business_id == b.id,
        where: c.user_id == ^user.id and c.business_id == ^business_id,
        limit: 1
      )
    )
  end

  def get_one(business_id) do
    case Repo.get(Orgs.Business, business_id) do
      nil -> {:error, Easy.Error.not_found("Business not found")}
      business -> {:ok, business}
    end
  end

  def update(business, attrs) do
    business
    |> Orgs.Business.update_changeset(attrs)
    |> Repo.update()
  end
end
