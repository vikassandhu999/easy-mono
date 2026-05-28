defmodule Easy.Clients do
  import Ecto.Changeset
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Identity.User
  alias Easy.Orgs
  alias Easy.Coaches
  alias Easy.Repo

  @spec get_client(String.t(), String.t()) :: {:ok, Client.t()} | {:error, :not_found}
  def get_client(business_id, client_id) do
    Client
    |> Client.for_business(business_id)
    |> Repo.get(client_id)
    |> ok_or_not_found()
  end

  @spec get_client_with_preloads(String.t(), String.t()) ::
          {:ok, Client.t()} | {:error, :not_found}
  def get_client_with_preloads(business_id, client_id) do
    Client
    |> Client.for_business(business_id)
    |> Client.with_preloads()
    |> Repo.get(client_id)
    |> ok_or_not_found()
  end

  @spec get_client_for_user(String.t(), String.t()) ::
          {:ok, Client.t()} | {:error, :not_found}
  def get_client_for_user(business_id, user_id) do
    Client
    |> Client.for_business(business_id)
    |> Client.for_user(user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  @spec list_clients(String.t(), String.t(), String.t() | nil, non_neg_integer(), pos_integer()) ::
          {:ok, %{clients: [Client.t()], count: non_neg_integer(), summary: map()}}
  def list_clients(business_id, search, status, offset, limit) do
    base =
      Client
      |> Client.for_business(business_id)
      |> Client.search(search)
      |> Client.with_status(status)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       summary: summary(Client |> Client.for_business(business_id)),
       clients:
         base
         |> Client.newest()
         |> Easy.Utils.paginate(offset, limit)
         |> Client.with_preloads()
         |> Repo.all()
     }}
  end

  @spec invite_client(String.t(), String.t(), map()) :: {:ok, Client.t()} | {:error, any()}
  def invite_client(business_id, user_id, invite_attrs) do
    with {:ok, coach} <- Coaches.get_by_user_id(user_id, business_id),
         :ok <- validate_not_self_invite(coach, invite_attrs),
         :ok <- validate_email_has_no_active_client(invite_attrs),
         {:ok, client} <- create_invitation(coach, invite_attrs),
         :ok <- maybe_send_invitation_email(client, coach) do
      {:ok, client}
    end
  end

  @spec update_client(String.t(), String.t(), map()) ::
          {:ok, Client.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_client(business_id, client_id, attrs) do
    with {:ok, client} <- get_client_with_preloads(business_id, client_id),
         {:ok, updated_client} <- client |> Client.update_changeset(attrs) |> Repo.update() do
      preload_client(updated_client)
    end
  end

  @spec revoke_invitation(String.t(), String.t()) ::
          {:ok, Client.t()} | {:error, :not_found | Easy.Error.t() | Ecto.Changeset.t()}
  def revoke_invitation(business_id, client_id) do
    with {:ok, client} <- get_client(business_id, client_id) do
      delete_pending_invitation(client)
    end
  end

  @spec resend_invitation(String.t(), String.t(), String.t()) ::
          {:ok, Client.t()} | {:error, :not_found | Easy.Error.t() | Ecto.Changeset.t()}
  def resend_invitation(business_id, user_id, client_id) do
    with {:ok, client} <- get_client(business_id, client_id),
         {:ok, coach} <- Coaches.get_by_user_id(user_id, business_id),
         {:ok, updated_client} <- resend_client_invitation(client, coach) do
      preload_client(updated_client)
    end
  end

  @spec get_profile(String.t(), String.t()) ::
          {:ok, %{client: Client.t(), coach: Orgs.Coach.t() | nil}} | {:error, :not_found}
  def get_profile(business_id, user_id) do
    with {:ok, client} <- get_client_for_user(business_id, user_id) do
      coach =
        Orgs.Coach
        |> Orgs.Coach.for_business(business_id)
        |> Orgs.Coach.with_preloads()
        |> Repo.one()

      {:ok, %{client: client, coach: coach}}
    end
  end

  @spec update_profile(String.t(), String.t(), map()) ::
          {:ok, %{client: Client.t(), coach: Orgs.Coach.t() | nil}}
          | {:error, :not_found | Ecto.Changeset.t()}
  def update_profile(business_id, user_id, attrs) do
    with {:ok, client} <- get_client_for_user(business_id, user_id),
         {:ok, _updated} <- client |> Client.self_update_changeset(attrs) |> Repo.update() do
      get_profile(business_id, user_id)
    end
  end

  @spec create_inquiry(String.t(), map()) :: {:ok, Client.t()} | {:error, Ecto.Changeset.t()}
  def create_inquiry(business_id, attrs) do
    business_id
    |> Client.inquiry_changeset(attrs)
    |> Repo.insert()
  end

  @spec invitation_preview(String.t()) :: {:ok, map()}
  def invitation_preview(token) do
    body =
      case resolve_invitation_token(token) do
        {:ok, client} ->
          client = Repo.preload(client, [:business, :creator])

          %{
            state: "pending",
            business_name: client.business.name,
            coach_first_name: coach_display_name(client.creator),
            prefill_email: client.email,
            expires_at: Client.invitation_expires_at(client)
          }

        {:error, state} ->
          %{state: Atom.to_string(state)}
      end

    {:ok, body}
  end

  @spec resolve_invitation_token(String.t()) ::
          {:ok, Client.t()} | {:error, :used | :expired | :invalid}
  def resolve_invitation_token(token) when is_binary(token) and token != "" do
    case Client |> where([c], c.invitation_token == ^token) |> Repo.one() do
      nil -> {:error, :invalid}
      %Client{status: :pending} = client -> check_expiry(client)
      %Client{} -> {:error, :used}
    end
  end

  def resolve_invitation_token(_), do: {:error, :invalid}

  @spec accept_invite(Client.t(), String.t(), String.t()) ::
          {:ok, Client.t()} | {:error, :race_lost | :already_active_elsewhere}
  def accept_invite(%Client{id: client_id, business_id: business_id}, user_id, accepted_email) do
    if user_has_active_client_elsewhere?(user_id, business_id) do
      {:error, :already_active_elsewhere}
    else
      do_atomic_accept(client_id, user_id, accepted_email)
    end
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}

  defp preload_client(%Client{} = client) do
    {:ok, Repo.preload(client, [:user, :business, :creator], force: true)}
  end

  defp summary(query) do
    counts =
      from(c in query,
        select: %{
          active: count(fragment("CASE WHEN ? = 'active' THEN 1 END", c.status)),
          pending: count(fragment("CASE WHEN ? = 'pending' THEN 1 END", c.status)),
          inactive: count(fragment("CASE WHEN ? = 'inactive' THEN 1 END", c.status)),
          archived: count(fragment("CASE WHEN ? = 'archived' THEN 1 END", c.status))
        }
      )
      |> Repo.one()

    counts || %{active: 0, pending: 0, inactive: 0, archived: 0}
  end

  defp validate_not_self_invite(%Orgs.Coach{user: %User{email: coach_email}}, %{"email" => email})
       when is_binary(coach_email) and is_binary(email) and email != "" and coach_email == email do
    {:error, Easy.Error.unprocessable(%{email: ["you can't invite yourself as a client"]})}
  end

  defp validate_not_self_invite(_coach, _attrs), do: :ok

  defp validate_email_has_no_active_client(%{"email" => email})
       when is_binary(email) and email != "" do
    if Repo.exists?(Client.active_for_email(email)) do
      {:error,
       Easy.Error.unprocessable(%{
         email: ["is already an active client of another business"]
       })}
    else
      :ok
    end
  end

  defp validate_email_has_no_active_client(_attrs), do: :ok

  defp create_invitation(coach, invite_attrs) do
    coach
    |> Client.invite_changeset(invite_attrs)
    |> Repo.insert()
  end

  defp maybe_send_invitation_email(%Client{email: nil}, _coach), do: :ok
  defp maybe_send_invitation_email(%Client{email: ""}, _coach), do: :ok

  defp maybe_send_invitation_email(client, coach) do
    business = Repo.preload(coach, :business).business
    coach_name = Orgs.Coach.full_name(coach)

    email =
      Easy.Emails.client_invitation_email(
        client.email,
        client.invitation_token,
        if(coach_name == "", do: "Coach", else: coach_name),
        business.name
      )

    Easy.MailerDelivery.deliver_async(email, metadata: %{email: client.email})
  end

  defp delete_pending_invitation(%Client{status: :pending} = client) do
    Repo.transaction(fn ->
      from(tp in Easy.Training.TrainingPlan, where: tp.client_id == ^client.id)
      |> Repo.delete_all()

      from(np in Easy.Nutrition.Plan, where: np.client_id == ^client.id)
      |> Repo.delete_all()

      from(l in Easy.Storefront.Lead, where: l.client_id == ^client.id)
      |> Repo.update_all(set: [client_id: nil])

      delete_changeset =
        client
        |> change()
        |> foreign_key_constraint(:base,
          name: :workout_sessions_client_id_fkey,
          message: "client has activity records and cannot be revoked"
        )

      case Repo.delete(delete_changeset) do
        {:ok, deleted} -> deleted
        {:error, changeset} -> Repo.rollback(changeset)
      end
    end)
  end

  defp delete_pending_invitation(%Client{}) do
    {:error,
     Easy.Error.unprocessable(%{
       status: ["only pending invitations can be revoked; archive the client instead"]
     })}
  end

  defp resend_client_invitation(%Client{status: :pending, email: email} = client, coach)
       when is_binary(email) and email != "" do
    case client |> change(%{invitation_sent_at: DateTime.utc_now(:second)}) |> Repo.update() do
      {:ok, updated} ->
        maybe_send_invitation_email(updated, coach)
        {:ok, updated}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  defp resend_client_invitation(%Client{status: :pending, email: nil}, _coach) do
    {:error, Easy.Error.unprocessable(%{email: ["client has no email address"]})}
  end

  defp resend_client_invitation(%Client{status: :pending, email: ""}, _coach) do
    {:error, Easy.Error.unprocessable(%{email: ["client has no email address"]})}
  end

  defp resend_client_invitation(%Client{}, _coach) do
    {:error, Easy.Error.unprocessable(%{status: ["client is not in pending status"]})}
  end

  defp check_expiry(%Client{} = client) do
    if Client.invitation_expired?(client) do
      {:error, :expired}
    else
      {:ok, client}
    end
  end

  defp user_has_active_client_elsewhere?(user_id, business_id) do
    from(c in Client,
      where:
        c.user_id == ^user_id and c.status == ^:active and
          c.business_id != ^business_id
    )
    |> Repo.exists?()
  end

  defp do_atomic_accept(client_id, user_id, accepted_email) do
    now = DateTime.utc_now(:second)

    query =
      from(c in Client,
        where: c.id == ^client_id and c.status == ^:pending,
        select: c
      )

    case Repo.update_all(query,
           set: [
             user_id: user_id,
             status: :active,
             email: accepted_email,
             updated_at: now
           ]
         ) do
      {1, [updated]} -> {:ok, updated}
      {0, _} -> {:error, :race_lost}
    end
  end

  defp coach_display_name(nil), do: "Coach"
  defp coach_display_name(%{first_name: nil}), do: "Coach"
  defp coach_display_name(%{first_name: ""}), do: "Coach"
  defp coach_display_name(%{first_name: name}), do: name
end
