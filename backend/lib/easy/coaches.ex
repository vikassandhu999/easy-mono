defmodule Easy.Coaches do
  alias Ecto.Changeset
  alias Easy.Ctx
  alias Easy.Identity.User
  alias Easy.Orgs.Coach
  alias Easy.Orgs.Business
  alias Easy.Repo

  # pre-auth onboarding: no ctx yet — runs during signup alongside create_business
  @spec create(User.t(), Business.t()) :: {:ok, Coach.t()} | {:error, any()}
  def create(user, business) do
    %{first_name: user.first_name, last_name: user.last_name}
    |> Coach.insert_changeset()
    |> Changeset.put_assoc(:user, user)
    |> Changeset.put_assoc(:business, business)
    |> Repo.insert()
  end

  @spec get_coach(Ctx.t()) :: {:ok, Coach.t()} | {:error, Easy.Error.t()}
  def get_coach(%Ctx{} = ctx) do
    Coach.fetch(ctx.business_id, ctx.user_id)
  end

  # pre-auth login gate: no ctx yet — resolves ONLY the active coach row for a user
  @spec get_active_coach_for_user(String.t()) :: Coach.t() | nil
  def get_active_coach_for_user(user_id) do
    Coach.for_user(user_id) |> Coach.active() |> Repo.one()
  end

  @spec update(Coach.t(), map()) :: {:ok, Coach.t()} | {:error, Ecto.Changeset.t()}
  def update(coach, attrs) do
    coach
    |> Coach.update_changeset(attrs)
    |> Repo.update()
  end
end
