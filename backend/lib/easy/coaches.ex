defmodule Easy.Coaches do
  alias Ecto.Changeset
  alias Easy.Identity.User
  alias Easy.Orgs.Coach
  alias Easy.Orgs.Business
  alias Easy.Repo

  @spec create(User.t(), Business.t()) :: {:ok, Coach.t()} | {:error, any()}
  def create(user, business) do
    %{first_name: user.first_name, last_name: user.last_name}
    |> Coach.insert_changeset()
    |> Changeset.put_assoc(:user, user)
    |> Changeset.put_assoc(:business, business)
    |> Repo.insert()
  end

  @spec get_by_user_id(String.t(), String.t()) :: {:ok, Coach.t()} | {:error, Easy.Error.t()}
  def get_by_user_id(user_id, business_id) do
    Coach.get_for_user(business_id, user_id)
  end

  @spec update(Coach.t(), map()) :: {:ok, Coach.t()} | {:error, Ecto.Changeset.t()}
  def update(coach, attrs) do
    coach
    |> Coach.update_changeset(attrs)
    |> Repo.update()
  end
end
