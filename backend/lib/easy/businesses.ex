defmodule Easy.Businesses do
  alias Easy.Identity
  alias Easy.Orgs
  alias Easy.Repo

  @spec create(Identity.User.t(), map()) ::
          {:ok, Orgs.Business.t()} | {:error, Ecto.Changeset.t()}
  def create(user, attrs) do
    attrs
    |> Orgs.Business.insert_changeset(user)
    |> Repo.insert()
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
