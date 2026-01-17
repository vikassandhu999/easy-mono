defmodule Easy.Orgs.Coaches do
  alias Ecto.Changeset
  alias Easy.Identity.User
  alias Easy.Orgs.Coach
  alias Easy.Orgs.Business
  alias Easy.Repo

  import Ecto.Query

  @spec create(User.t(), Business.t()) ::
          {:ok, Coach.t()} | {:error, any()}
  def create(user, business) do
    %Coach{}
    |> Changeset.cast(
      %{
        name: User.full_name(user)
      },
      [:name]
    )
    |> Changeset.put_assoc(:user, user)
    |> Changeset.put_assoc(:business, business)
    |> Repo.insert()
  end

  def get_one(coach_id) do
    case Repo.get(Coach, coach_id) do
      nil -> {:error, Easy.Error.not_found("Coach not found")}
      coach -> {:ok, coach}
    end
  end

  def get_by_user_id(user_id, business_id) do
    case Repo.one(
           from c in Coach,
             where: c.user_id == ^user_id and c.business_id == ^business_id,
             limit: 1
         ) do
      nil -> {:error, Easy.Error.not_found("Coach not found")}
      coach -> {:ok, coach}
    end
  end

  def update(coach, attrs) do
    coach
    |> Coach.update_changeset(attrs)
    |> Repo.update()
  end
end
