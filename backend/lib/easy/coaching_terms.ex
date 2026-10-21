defmodule Easy.CoachingTerms do
  import Ecto.Query
  alias Easy.Billing.BusinessBilling
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Trackers.Defaults

  @spec start_term_for_client(Ctx.t(), String.t()) :: {:ok, CoachingTerm.t()} | {:error, atom() | Ecto.Changeset.t()}
  def start_term_for_client(%Ctx{} = ctx, client_id) do
    with_capacity_lock(ctx, fn billing ->
      with {:ok, client} <- Clients.get_client_with_preloads(ctx, client_id),
           :ok <- can_start(client),
           :ok <- ensure_available_relationship(client),
           :ok <- free_seat(ctx, billing) do
        insert_term(client)
      end
    end)
  end

  @spec update_term(Ctx.t(), String.t(), map()) :: {:ok, CoachingTerm.t()} | {:error, atom() | Ecto.Changeset.t()}
  def update_term(%Ctx{} = ctx, term_id, attrs) do
    Repo.transact(fn ->
      with %CoachingTerm{} = term <- CoachingTerm.for_business(ctx.business_id) |> lock("FOR UPDATE OF c0") |> Repo.get(term_id),
           {:ok, client} <- Clients.get_client_with_preloads(ctx, term.client_id),
           today = Client.local_date(client, DateTime.utc_now()),
           true <- CoachingTerm.covers?(term, today) do
        term |> CoachingTerm.update_changeset(today, attrs) |> Repo.update()
      else
        nil -> {:error, :not_found}
        false -> {:error, :term_ended}
        error -> error
      end
    end)
  end

  @spec accept_invite(Ctx.t(), Client.t(), String.t()) :: {:ok, Client.t()} | {:error, atom() | Ecto.Changeset.t()}
  def accept_invite(%Ctx{} = ctx, invitation, email) do
    with_capacity_lock(ctx, fn billing ->
      with :ok <- ensure_available_relationship(%{invitation | user_id: ctx.user_id}),
           %Client{user_id: nil, invite_token: token} = current <- Client.for_business(ctx.business_id) |> lock("FOR UPDATE") |> Repo.get(invitation.id),
           true <- not is_nil(token) and token == invitation.invite_token,
           false <- Client.invitation_expired?(current, DateTime.utc_now()),
           {:ok, accepted} <-
             current
             |> Ecto.Changeset.change(user_id: ctx.user_id, email: email, invite_token: nil, joined_at: DateTime.utc_now(:microsecond))
             |> Ecto.Changeset.unique_constraint(:user_id, name: :clients_user_id_business_id_index)
             |> Ecto.Changeset.unique_constraint(:email, name: :clients_business_id_email_index)
             |> Repo.update() do
        start_if_available(ctx, Repo.preload(accepted, [:terms, :coach, :business]), billing)
      else
        {:error, _} = error -> error
        _ -> {:error, :race_lost}
      end
    end)
  end

  @spec used_seats(Ctx.t()) :: {:ok, non_neg_integer()}
  def used_seats(%Ctx{} = ctx), do: {:ok, count_used_seats(ctx)}

  defp with_capacity_lock(ctx, fun) do
    Repo.transact(fn ->
      case Repo.one(from b in BusinessBilling, where: b.business_id == ^ctx.business_id, lock: "FOR UPDATE") do
        nil -> {:error, :not_found}
        billing -> fun.(billing)
      end
    end)
  end

  defp start_if_available(ctx, client, billing) do
    case free_seat(ctx, billing) do
      :ok -> with {:ok, _term} <- insert_term(client), do: {:ok, Repo.preload(client, :terms, force: true) |> Client.derive(DateTime.utc_now())}
      {:error, :seat_limit_reached} -> {:ok, Client.derive(client, DateTime.utc_now())}
    end
  end

  defp ensure_available_relationship(client) do
    Easy.Identity.User |> lock("FOR UPDATE") |> Repo.get(client.user_id)
    if Repo.exists?(Client.active_elsewhere(client.user_id, client.business_id)), do: {:error, :already_active_elsewhere}, else: :ok
  end

  defp count_used_seats(ctx), do: Client |> Client.for_business(ctx.business_id) |> Client.active() |> Repo.aggregate(:count, :id)

  defp free_seat(ctx, billing), do: if(count_used_seats(ctx) < BusinessBilling.seat_limit(billing), do: :ok, else: {:error, :seat_limit_reached})
  defp can_start(%Client{user_id: nil}), do: {:error, :invitation_not_accepted}
  defp can_start(%Client{current_term: term}) when not is_nil(term), do: {:error, :term_already_active}
  defp can_start(_client), do: :ok

  defp insert_term(client) do
    ctx = %Ctx{business_id: client.business_id, client_id: client.id, user_id: client.user_id}

    with {:ok, term} <- client.id |> CoachingTerm.insert_changeset(Client.local_date(client, DateTime.utc_now())) |> Repo.insert(),
         {:ok, _} <- Defaults.copy_first_term(ctx, client, term),
         do: {:ok, term}
  end
end
