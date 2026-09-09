defmodule Easy.Coaches do
  alias Easy.Clients
  alias Easy.Ctx
  alias Easy.Identity.User
  alias Easy.Identity.UserSessions
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Ecto.Changeset

  # pre-auth onboarding: no ctx yet — runs during signup alongside create_business
  @spec create(User.t(), Business.t()) :: {:ok, Coach.t()} | {:error, Ecto.Changeset.t()}
  def create(user, business) do
    changeset = Coach.insert_changeset(business.id, user.id, %{first_name: user.first_name, last_name: user.last_name})

    with {:ok, coach} <- Repo.insert(changeset) do
      {:ok, %{coach | user: user, business: business}}
    end
  end

  @spec get_membership(Ctx.t()) :: {:ok, Coach.t()} | {:error, :not_found}
  def get_membership(%Ctx{} = ctx) do
    Coach
    |> Coach.for_business(ctx.business_id)
    |> Coach.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  @spec get_coach(Ctx.t()) :: {:ok, Coach.t()} | {:error, :not_found}
  def get_coach(%Ctx{} = ctx) do
    Coach
    |> Coach.for_business(ctx.business_id)
    |> Coach.for_user(ctx.user_id)
    |> Coach.include_preloads(ctx.business_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  @spec get_coach(Ctx.t(), String.t()) :: {:ok, Coach.t()} | {:error, :not_found}
  def get_coach(%Ctx{} = ctx, coach_id) do
    Coach
    |> Coach.for_business(ctx.business_id)
    |> Coach.include_preloads(ctx.business_id)
    |> Repo.get(coach_id)
    |> ok_or_not_found()
  end

  @spec get_active_coach(Ctx.t(), String.t()) :: {:ok, Coach.t()} | {:error, :not_found}
  def get_active_coach(%Ctx{} = ctx, coach_id) do
    Coach
    |> Coach.for_business(ctx.business_id)
    |> Coach.active()
    |> Repo.get(coach_id)
    |> ok_or_not_found()
  end

  @spec update_profile(Ctx.t(), map()) :: {:ok, Coach.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_profile(%Ctx{} = ctx, attrs) do
    with {:ok, coach} <- get_coach(ctx) do
      Repo.transact(fn -> persist_profile(coach, attrs) end)
    end
  end

  # pre-auth login gate: no ctx yet — resolves ONLY the active coach row for a user
  @spec get_active_coach_by_user_id(String.t()) :: {:ok, Coach.t()} | {:error, :not_found}
  def get_active_coach_by_user_id(user_id) do
    Coach.for_user(user_id) |> Coach.active() |> Repo.one() |> ok_or_not_found()
  end

  @spec list_team(Ctx.t()) ::
          {:ok, %{coaches: [Coach.t()], owner_id: String.t()}} | {:error, :not_owner}
  def list_team(%Ctx{} = ctx) do
    with :ok <- ensure_owner(ctx) do
      {:ok,
       %{
         coaches: Coach |> Coach.for_business(ctx.business_id) |> Coach.newest() |> Repo.all(),
         owner_id: ctx.user_id
       }}
    end
  end

  @spec deactivate_trainer(Ctx.t(), String.t()) ::
          {:ok, Coach.t()} | {:error, :not_owner | :not_found | :cannot_deactivate_owner | Changeset.t()}
  def deactivate_trainer(%Ctx{} = ctx, coach_id) do
    with :ok <- ensure_owner(ctx),
         {:ok, coach} <- get_deactivatable_coach(ctx, coach_id) do
      Repo.transact(fn -> deactivate_coach(ctx, coach) end)
    end
  end

  @spec reactivate_trainer(Ctx.t(), String.t()) ::
          {:ok, Coach.t()} | {:error, :not_owner | :not_found | Changeset.t()}
  def reactivate_trainer(%Ctx{} = ctx, coach_id) do
    with :ok <- ensure_owner(ctx),
         {:ok, coach} <- get_reactivatable_coach(ctx.business_id, coach_id) do
      coach
      |> Coach.status_changeset(:active)
      |> Repo.update()
    end
  end

  defp persist_profile(coach, attrs) do
    changeset = Coach.update_changeset(coach, attrs)
    business_attrs = take_present(changeset.params, business_name: :name, whatsapp_number: :whatsapp_number)

    with {:ok, updated_coach} <- Repo.update(changeset),
         {:ok, updated_business} <- update_business(coach.business, business_attrs) do
      {:ok, %{updated_coach | business: updated_business, user: coach.user}}
    end
  end

  defp deactivate_coach(ctx, coach) do
    with {:ok, updated} <- coach |> Coach.status_changeset(:inactive) |> Repo.update(),
         {:ok, _} <- revoke_sessions(coach),
         {:ok, _} <- Clients.reassign_clients_to_owner(ctx, coach.id) do
      {:ok, updated}
    end
  end

  defp revoke_sessions(%Coach{user_id: nil}), do: {:ok, 0}
  defp revoke_sessions(%Coach{user_id: user_id}), do: UserSessions.revoke_user_sessions(user_id)

  defp ensure_owner(%Ctx{owner?: true}), do: :ok
  defp ensure_owner(%Ctx{}), do: {:error, :not_owner}

  defp get_deactivatable_coach(%Ctx{} = ctx, coach_id) do
    with {:ok, coach} <- get_active_coach(ctx, coach_id) do
      if coach.id == ctx.coach_id, do: {:error, :cannot_deactivate_owner}, else: {:ok, coach}
    end
  end

  defp get_reactivatable_coach(business_id, coach_id) do
    Coach
    |> Coach.for_business(business_id)
    |> Coach.inactive()
    |> Repo.get(coach_id)
    |> ok_or_not_found()
  end

  defp update_business(business, attrs) when attrs == %{}, do: {:ok, business}

  defp update_business(business, attrs) do
    business
    |> Business.update_changeset(attrs)
    |> Repo.update()
  end

  defp take_present(params, mapping) do
    Enum.reduce(mapping, %{}, fn {param_key, column}, acc ->
      param_key = Atom.to_string(param_key)

      if Map.has_key?(params, param_key) do
        Map.put(acc, column, params[param_key])
      else
        acc
      end
    end)
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(value), do: {:ok, value}
end
