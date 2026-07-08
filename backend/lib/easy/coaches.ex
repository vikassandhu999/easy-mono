defmodule Easy.Coaches do
  import Ecto.Query

  alias Ecto.Changeset
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Identity.User
  alias Easy.Identity.UserSessions
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

  @spec list_team(Ctx.t()) :: {:ok, [Coach.t()]} | {:error, :not_owner}
  def list_team(%Ctx{} = ctx) do
    with :ok <- ensure_owner(ctx) do
      {:ok, Coach |> Coach.for_business(ctx.business_id) |> Coach.newest() |> Repo.all()}
    end
  end

  @spec invite_trainer(Ctx.t(), map()) ::
          {:ok, Coach.t()} | {:error, :not_owner | :already_on_team | Ecto.Changeset.t()}
  def invite_trainer(%Ctx{} = ctx, attrs) do
    with :ok <- ensure_owner(ctx) do
      email = attrs |> Map.get(:email) |> normalize_email()
      do_invite_trainer(ctx, attrs, email)
    end
  end

  defp do_invite_trainer(ctx, attrs, email) do
    if inviting_own_email?(ctx, email) do
      {:error, :already_on_team}
    else
      match_existing_invite(ctx, attrs, find_coach_by_email(ctx.business_id, email))
    end
  end

  defp match_existing_invite(_ctx, _attrs, %Coach{status: :invited} = coach), do: rotate_and_resend(coach)

  defp match_existing_invite(_ctx, _attrs, %Coach{status: status}) when status in [:active, :inactive],
    do: {:error, :already_on_team}

  defp match_existing_invite(ctx, attrs, nil), do: create_invite(ctx, attrs)

  @spec resend_invite(Ctx.t(), String.t()) :: {:ok, Coach.t()} | {:error, :not_owner | :not_found}
  def resend_invite(%Ctx{} = ctx, coach_id) do
    with :ok <- ensure_owner(ctx),
         {:ok, coach} <- get_invited_coach(ctx.business_id, coach_id) do
      rotate_and_resend(coach)
    end
  end

  @spec revoke_invite(Ctx.t(), String.t()) :: {:ok, Coach.t()} | {:error, :not_owner | :not_found}
  def revoke_invite(%Ctx{} = ctx, coach_id) do
    with :ok <- ensure_owner(ctx),
         {:ok, coach} <- get_invited_coach(ctx.business_id, coach_id) do
      Repo.delete(coach)
    end
  end

  @spec deactivate_trainer(Ctx.t(), String.t()) ::
          {:ok, Coach.t()} | {:error, :not_owner | :not_found | :cannot_deactivate_owner}
  def deactivate_trainer(%Ctx{} = ctx, coach_id) do
    with :ok <- ensure_owner(ctx),
         {:ok, coach} <- get_deactivatable_coach(ctx, coach_id) do
      Repo.transaction(fn ->
        updated = update_or_rollback(Changeset.change(coach, status: :inactive))

        if coach.user_id, do: UserSessions.revoke_all_for_user(coach.user_id)

        reassign_clients_to_owner(ctx, coach.id)

        updated
      end)
    end
  end

  @spec resolve_invitation_token(String.t()) ::
          {:ok, Coach.t()} | {:error, :used | :expired | :invalid}
  def resolve_invitation_token(token) when is_binary(token) and token != "" do
    case Coach |> where([c], c.invitation_token == ^token) |> Repo.one() do
      nil -> {:error, :invalid}
      %Coach{status: :invited} = coach -> check_expiry(coach)
      %Coach{} -> {:error, :used}
    end
  end

  def resolve_invitation_token(_), do: {:error, :invalid}

  @spec accept_invite(Coach.t(), String.t()) ::
          {:ok, Coach.t()} | {:error, :race_lost | :already_a_coach}
  def accept_invite(%Coach{} = coach, user_id) do
    if Repo.exists?(Coach.for_user(user_id)) do
      {:error, :already_a_coach}
    else
      do_atomic_accept(coach.id, user_id)
    end
  rescue
    e in Postgrex.Error ->
      if unique_violation?(e, "coaches_user_id_index") do
        {:error, :already_a_coach}
      else
        reraise(e, __STACKTRACE__)
      end
  end

  @spec invitation_preview(String.t()) ::
          {:ok, %{business_name: String.t(), email: String.t() | nil, first_name: String.t() | nil}}
          | {:error, :used | :expired | :invalid}
  def invitation_preview(token) do
    with {:ok, coach} <- resolve_invitation_token(token) do
      coach = Repo.preload(coach, :business)

      {:ok,
       %{
         business_name: coach.business.name,
         email: coach.email,
         first_name: coach.first_name
       }}
    end
  end

  defp ensure_owner(%Ctx{owner?: true}), do: :ok
  defp ensure_owner(%Ctx{}), do: {:error, :not_owner}

  defp normalize_email(nil), do: nil

  defp normalize_email(email) when is_binary(email) do
    case String.trim(email) do
      "" -> nil
      trimmed -> String.downcase(trimmed)
    end
  end

  defp normalize_email(_email), do: nil

  defp inviting_own_email?(_ctx, nil), do: false

  defp inviting_own_email?(%Ctx{user_id: user_id}, email) do
    case Repo.get(User, user_id) do
      %User{email: owner_email} when is_binary(owner_email) -> normalize_email(owner_email) == email
      _ -> false
    end
  end

  defp find_coach_by_email(_business_id, nil), do: nil

  defp find_coach_by_email(business_id, email) do
    Coach
    |> Coach.for_business(business_id)
    |> where([c], fragment("lower(?)", c.email) == ^email)
    |> Repo.one()
  end

  defp create_invite(%Ctx{} = ctx, attrs) do
    ctx.business_id
    |> Coach.invite_changeset(ctx.coach_id, attrs)
    |> Repo.insert()
    |> case do
      {:ok, coach} ->
        send_invite_email(coach)
        {:ok, coach}

      error ->
        error
    end
  end

  defp rotate_and_resend(coach) do
    coach
    |> Coach.resend_invite_changeset()
    |> Repo.update()
    |> case do
      {:ok, updated} ->
        send_invite_email(updated)
        {:ok, updated}

      error ->
        error
    end
  end

  defp get_invited_coach(business_id, coach_id) do
    Coach
    |> Coach.for_business(business_id)
    |> Repo.get(coach_id)
    |> case do
      %Coach{status: :invited} = coach -> {:ok, coach}
      _ -> {:error, :not_found}
    end
  end

  defp get_deactivatable_coach(%Ctx{} = ctx, coach_id) do
    case Coach |> Coach.for_business(ctx.business_id) |> Repo.get(coach_id) do
      nil -> {:error, :not_found}
      coach -> if coach.id == ctx.coach_id, do: {:error, :cannot_deactivate_owner}, else: {:ok, coach}
    end
  end

  defp reassign_clients_to_owner(%Ctx{} = ctx, coach_id) do
    from(cl in Client,
      where: cl.business_id == ^ctx.business_id and cl.assigned_coach_id == ^coach_id
    )
    |> Repo.update_all(set: [assigned_coach_id: ctx.coach_id])
  end

  defp update_or_rollback(changeset) do
    case Repo.update(changeset) do
      {:ok, updated} -> updated
      {:error, changeset} -> Repo.rollback(changeset)
    end
  end

  defp check_expiry(%Coach{} = coach) do
    if Coach.invitation_expired?(coach) do
      {:error, :expired}
    else
      {:ok, coach}
    end
  end

  defp do_atomic_accept(coach_id, user_id) do
    now = DateTime.utc_now(:second)

    query =
      from(c in Coach,
        where: c.id == ^coach_id and c.status == ^:invited,
        select: c
      )

    case Repo.update_all(query,
           set: [user_id: user_id, status: :active, invitation_token: nil, updated_at: now]
         ) do
      {1, [updated]} -> {:ok, updated}
      {0, _} -> {:error, :race_lost}
    end
  end

  defp unique_violation?(%Postgrex.Error{postgres: %{code: :unique_violation, constraint: actual}}, expected),
    do: actual == expected

  defp unique_violation?(_error, _constraint), do: false

  defp send_invite_email(%Coach{email: nil}), do: :ok
  defp send_invite_email(%Coach{email: ""}), do: :ok

  defp send_invite_email(%Coach{} = coach) do
    business = Repo.preload(coach, :business).business

    email = Easy.Emails.trainer_invitation_email(coach.email, coach.invitation_token, business.name)
    Easy.MailerDelivery.deliver_async(email, metadata: %{email: coach.email})
  end
end
