defmodule Easy.CoachInvitations do
  import Ecto.Query
  import Ecto.Changeset, only: [get_field: 2]

  alias Easy.Ctx
  alias Easy.Identity.Users
  alias Easy.Orgs.Coach
  alias Easy.Repo

  @spec invite_trainer(Ctx.t(), map()) ::
          {:ok, Coach.t()} | {:error, :not_owner | :already_on_team | Ecto.Changeset.t()}
  def invite_trainer(%Ctx{} = ctx, attrs) do
    with :ok <- ensure_owner(ctx) do
      changeset = Coach.invite_changeset(ctx.business_id, DateTime.utc_now(:second), attrs)

      Repo.transact(fn -> do_invite_trainer(ctx, changeset, get_field(changeset, :email)) end)
      |> deliver_invite()
    end
  end

  @spec resend_invite(Ctx.t(), String.t()) ::
          {:ok, Coach.t()} | {:error, :not_owner | :not_found | Ecto.Changeset.t()}
  def resend_invite(%Ctx{} = ctx, coach_id) do
    with :ok <- ensure_owner(ctx),
         {:ok, coach} <- get_invited_coach(ctx.business_id, coach_id) do
      rotate_and_resend(ctx.business_id, coach)
    end
  end

  @spec revoke_invite(Ctx.t(), String.t()) ::
          {:ok, Coach.t()} | {:error, :not_owner | :not_found | Ecto.Changeset.t()}
  def revoke_invite(%Ctx{} = ctx, coach_id) do
    with :ok <- ensure_owner(ctx) do
      Repo.transact(fn -> revoke_locked_invite(ctx, coach_id) end)
    end
  end

  defp revoke_locked_invite(ctx, coach_id) do
    case Coach |> Coach.for_business(ctx.business_id) |> Coach.pending_invitation(coach_id) |> lock("FOR UPDATE") |> Repo.one() do
      nil -> {:error, :not_found}
      %Coach{user_id: nil} = coach -> Repo.delete(coach)
      coach -> coach |> Ecto.Changeset.change(invite_token: nil) |> Repo.update()
    end
  end

  @spec resolve_invitation_token(String.t()) ::
          {:ok, Coach.t()} | {:error, :used | :expired | :invalid}
  def resolve_invitation_token(token) when is_binary(token) and token != "" do
    case token |> Coach.for_invitation_token() |> Repo.one() do
      nil -> {:error, :invalid}
      %Coach{} = coach -> check_expiry(coach)
    end
  end

  def resolve_invitation_token(_), do: {:error, :invalid}

  @spec accept_invite(Coach.t(), String.t()) ::
          {:ok, Coach.t()} | {:error, :race_lost | :already_a_coach}
  def accept_invite(%Coach{invite_token: nil}, _user_id), do: {:error, :race_lost}
  def accept_invite(%Coach{invited_at: nil}, _user_id), do: {:error, :race_lost}

  def accept_invite(%Coach{} = coach, user_id) do
    if Repo.exists?(Coach.for_user(user_id) |> Coach.active()) do
      {:error, :already_a_coach}
    else
      do_atomic_accept(coach, user_id)
    end
  rescue
    e in Postgrex.Error ->
      if unique_violation?(e, "coaches_user_id_index") or unique_violation?(e, "coaches_user_id_business_id_index") do
        {:error, :already_a_coach}
      else
        reraise(e, __STACKTRACE__)
      end
  end

  @spec invitation_preview(String.t()) ::
          {:ok, %{business_name: String.t(), email: String.t() | nil, full_name: String.t() | nil}}
          | {:error, :used | :expired | :invalid}
  def invitation_preview(token) do
    with {:ok, coach} <- resolve_invitation_token(token) do
      coach = Repo.preload(coach, :business)

      {:ok,
       %{
         business_name: coach.business.name,
         email: coach.email,
         full_name: coach.full_name
       }}
    end
  end

  defp do_invite_trainer(ctx, changeset, email) do
    if inviting_own_email?(ctx, email) do
      {:error, :already_on_team}
    else
      match_existing_invite(changeset, find_coach_by_email(ctx.business_id, email))
    end
  end

  defp match_existing_invite(_changeset, %Coach{invite_token: token} = coach) when not is_nil(token), do: rotate_invite(coach)
  defp match_existing_invite(_changeset, %Coach{removed_on: removed} = coach) when not is_nil(removed), do: rotate_invite(coach)

  defp match_existing_invite(_changeset, %Coach{}),
    do: {:error, :already_on_team}

  defp match_existing_invite(changeset, nil), do: Repo.insert(changeset)

  defp ensure_owner(%Ctx{owner?: true}), do: :ok
  defp ensure_owner(%Ctx{}), do: {:error, :not_owner}

  defp inviting_own_email?(_ctx, nil), do: false

  defp inviting_own_email?(%Ctx{user_id: user_id}, email) do
    case Users.get_by_id(user_id) do
      {:ok, %{email: owner_email}} when is_binary(owner_email) -> Coach.normalize_email(owner_email) == email
      _ -> false
    end
  end

  defp find_coach_by_email(_business_id, nil), do: nil

  defp find_coach_by_email(business_id, email) do
    Coach
    |> Coach.for_business(business_id)
    |> Coach.for_email(email)
    |> lock("FOR UPDATE")
    |> Repo.one()
  end

  defp rotate_and_resend(business_id, coach) do
    attrs = Coach.resend_invite_changeset(coach, DateTime.utc_now(:second)).changes

    case Repo.update_all(Coach |> Coach.for_business(business_id) |> Coach.pending_invitation(coach.id), set: Map.to_list(attrs)) do
      {1, [updated]} -> deliver_invite({:ok, updated})
      {0, _} -> {:error, :not_found}
    end
  end

  defp rotate_invite(coach) do
    coach |> Coach.resend_invite_changeset(DateTime.utc_now(:second)) |> Repo.update()
  end

  defp deliver_invite({:ok, coach} = result) do
    send_invite_email(coach)
    result
  end

  defp deliver_invite({:error, _reason} = error), do: error

  defp get_invited_coach(business_id, coach_id) do
    Coach
    |> Coach.for_business(business_id)
    |> Coach.invited()
    |> Repo.get(coach_id)
    |> case do
      nil -> {:error, :not_found}
      coach -> {:ok, coach}
    end
  end

  defp check_expiry(%Coach{} = coach) do
    if Coach.invitation_expired?(coach, DateTime.utc_now()) do
      {:error, :expired}
    else
      {:ok, coach}
    end
  end

  defp do_atomic_accept(coach, user_id) do
    now = DateTime.utc_now(:second)

    query =
      Coach.pending_invitation(coach.id)
      |> where([c], c.invite_token == ^coach.invite_token and c.invited_at == ^coach.invited_at and c.invited_at >= ^DateTime.add(now, -30, :day))

    case Repo.update_all(query,
           set: [user_id: user_id, invite_token: nil, removed_on: nil, updated_at: now]
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

    email = Easy.Emails.trainer_invitation_email(coach.email, coach.invite_token, business.name)
    Easy.MailerDelivery.deliver_async(email, metadata: %{email: coach.email})
  end
end
