defmodule Easy.ClientInvitations do
  import Ecto.Query
  alias Easy.{Clients, Coaches, Ctx, Repo}
  alias Easy.Clients.Client
  alias Easy.Orgs.Coach

  @spec invite(Ctx.t(), map()) :: {:ok, Client.t()} | {:error, atom() | Ecto.Changeset.t()}
  def invite(ctx, attrs) do
    with {:ok, client} <- create(ctx, attrs) do
      :ok = deliver(client)
      {:ok, client}
    end
  end

  @spec create(Ctx.t(), map()) :: {:ok, Client.t()} | {:error, atom() | Ecto.Changeset.t()}
  def create(ctx, attrs) do
    with {:ok, actor} <- Coaches.get_coach(ctx),
         changeset = Client.insert_changeset(ctx.business_id, actor.id, DateTime.utc_now(:second), attrs),
         :ok <- not_self_invite(actor, Ecto.Changeset.get_field(changeset, :email)),
         :ok <- available_email(Ecto.Changeset.get_field(changeset, :email)) do
      Repo.transact(fn -> create_with_coach(ctx, changeset) end)
    end
  end

  defp create_with_coach(ctx, changeset) do
    business = Repo.one(from(b in Easy.Orgs.Business, where: b.id == ^ctx.business_id, lock: "FOR SHARE"))
    changeset = Ecto.Changeset.put_change(changeset, :review_frequency_days, business.default_review_frequency_days)
    coach_id = changeset.params["coach_id"] || ctx.coach_id

    if coach_id != ctx.coach_id and not ctx.owner? do
      {:error, :not_owner}
    else
      with %Coach{} = coach <- Coach.for_business(ctx.business_id) |> Coach.active() |> lock("FOR UPDATE") |> Repo.get(coach_id),
           {:ok, client} <- changeset |> Ecto.Changeset.put_change(:coach_id, coach.id) |> Repo.insert() do
        Clients.get_client_with_preloads(ctx, client.id)
      else
        nil -> {:error, :coach_not_active}
        error -> error
      end
    end
  end

  defp not_self_invite(%Coach{user: %{email: email}}, email), do: {:error, :self_invite}
  defp not_self_invite(_, _), do: :ok

  @spec deliver(Client.t()) :: :ok
  def deliver(%Client{coach: coach, business: business} = client) do
    client.email
    |> Easy.Emails.client_invitation_email(client.invite_token, Coach.full_name(coach), business.name)
    |> Easy.MailerDelivery.deliver_async(metadata: %{client_id: client.id})
  end

  @spec revoke_invitation(Ctx.t(), String.t()) :: {:ok, Client.t()} | {:error, atom() | Ecto.Changeset.t()}
  def revoke_invitation(ctx, client_id) do
    mutate_invitation(ctx, client_id, &delete_without_records/1)
  end

  @spec resend_invitation(Ctx.t(), String.t()) :: {:ok, Client.t()} | {:error, atom() | Ecto.Changeset.t()}
  def resend_invitation(ctx, client_id) do
    with {:ok, client} <- mutate_invitation(ctx, client_id, fn client -> client |> Client.resend_invite_changeset(DateTime.utc_now(:second)) |> Repo.update() end) do
      :ok = deliver(client)
      {:ok, client}
    end
  end

  defp mutate_invitation(ctx, client_id, fun) do
    Repo.transact(fn ->
      with %Client{} <- Client.for_business(ctx.business_id) |> lock("FOR UPDATE") |> Repo.get(client_id),
           {:ok, client} <- Clients.get_client_with_preloads(ctx, client_id),
           :ok <- ensure_invited(client) do
        fun.(client)
      else
        nil -> {:error, :not_found}
        error -> error
      end
    end)
  end

  defp ensure_invited(%Client{user_id: nil}), do: :ok
  defp ensure_invited(_), do: {:error, :invitation_not_pending}

  defp available_email(nil), do: :ok
  defp available_email(email), do: if(Repo.exists?(Client.active_for_email(email)), do: {:error, :client_email_taken}, else: :ok)

  defp delete_without_records(client) do
    records = [
      from(s in Easy.Training.TrainingSession, where: s.business_id == ^client.business_id and s.client_id == ^client.id),
      from(m in Easy.Chat.Message, join: c in Easy.Chat.Conversation, on: c.id == m.conversation_id, where: c.business_id == ^client.business_id and c.client_id == ^client.id)
    ]

    if Enum.any?(records, &Repo.exists?/1), do: {:error, :client_has_records}, else: client |> Client.delete_invitation_changeset() |> Repo.delete()
  end

  @spec invitation_preview(String.t()) :: {:ok, map()}
  def invitation_preview(token) do
    case resolve_invitation_token(token) do
      {:ok, client} ->
        client = Repo.preload(client, [:business, :coach])

        {:ok,
         %{
           state: "pending",
           business_name: client.business.name,
           coach_name: Coach.full_name(client.coach),
           prefill_email: client.email,
           expires_at: Client.invitation_expires_at(client)
         }}

      {:error, state} ->
        {:ok, %{state: Atom.to_string(state)}}
    end
  end

  @spec resolve_invitation_token(String.t()) :: {:ok, Client.t()} | {:error, :invalid | :expired | :used}
  def resolve_invitation_token(token) when is_binary(token) and token != "" do
    case Client.for_invitation_token(token) |> Repo.one() do
      nil -> {:error, :invalid}
      %Client{user_id: nil} = client -> valid_invitation(client)
      _ -> {:error, :used}
    end
  end

  def resolve_invitation_token(_), do: {:error, :invalid}

  defp valid_invitation(client) do
    if Client.invitation_expired?(client, DateTime.utc_now()), do: {:error, :expired}, else: {:ok, client}
  end
end
