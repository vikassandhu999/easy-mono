defmodule Easy.ClientInvitations do
  import Ecto.Changeset, only: [get_field: 2]

  alias Easy.{Billing, ClientAccess, Coaches, Ctx, Repo}
  alias Easy.Clients.Client
  alias Easy.Forms.Assignments
  alias Easy.Identity.User
  alias Easy.Orgs.Coach

  @type error() ::
          :not_found | :self_invite | :client_email_taken | :seat_limit_reached | :conflict | Ecto.Changeset.t()

  @type preview ::
          %{state: String.t()}
          | %{
              state: String.t(),
              business_name: String.t(),
              coach_first_name: String.t(),
              prefill_email: String.t() | nil,
              expires_at: DateTime.t() | nil
            }

  @spec invite(Ctx.t(), map()) :: {:ok, Client.t()} | {:error, error()}
  def invite(%Ctx{} = ctx, attrs) do
    with {:ok, client} <- create(ctx, attrs) do
      :ok = deliver(client)
      {:ok, client}
    end
  end

  @spec create(Ctx.t(), map()) :: {:ok, Client.t()} | {:error, error()}
  def create(%Ctx{} = ctx, attrs) do
    with {:ok, coach} <- Coaches.get_coach(ctx),
         changeset = Client.invite_changeset(coach.business_id, coach.id, DateTime.utc_now(:second), attrs),
         changeset = Easy.LocalCalendar.stamp_timezone(changeset, coach.business.timezone),
         email = get_field(changeset, :email),
         :ok <- validate_not_self_invite(coach, email),
         :ok <- validate_email_has_no_active_client(email),
         {:ok, client} <- reserve_and_create(ctx, changeset) do
      coaches = Coach.for_business(ctx.business_id)
      {:ok, Repo.preload(client, [:user, :business, :creator, assigned_coach: coaches], force: true)}
    end
  end

  @spec deliver(Client.t()) :: :ok
  def deliver(%Client{email: email}) when email in [nil, ""], do: :ok

  def deliver(%Client{creator: coach, business: business} = client) do
    coach_name = Coach.full_name(coach)

    client.email
    |> Easy.Emails.client_invitation_email(
      client.invitation_token,
      if(coach_name == "", do: "Coach", else: coach_name),
      business.name
    )
    |> Easy.MailerDelivery.deliver_async(metadata: %{client_id: client.id})
  end

  @spec revoke_invitation(Ctx.t(), String.t()) ::
          {:ok, Client.t()} | {:error, :not_found | :invitation_not_pending | Ecto.Changeset.t()}
  def revoke_invitation(%Ctx{} = ctx, client_id) do
    with {:ok, client} <- ClientAccess.authorize_client(ctx, client_id) do
      delete_pending_invitation(client)
    end
  end

  @spec resend_invitation(Ctx.t(), String.t()) ::
          {:ok, Client.t()}
          | {:error, :not_found | :invitation_email_missing | :invitation_not_pending | Ecto.Changeset.t()}
  def resend_invitation(%Ctx{} = ctx, client_id) do
    with {:ok, client} <- ClientAccess.authorize_client(ctx, client_id),
         {:ok, coach} <- Coaches.get_coach(ctx),
         {:ok, updated_client} <- resend_client_invitation(client, coach) do
      coaches = Coach.for_business(ctx.business_id)
      {:ok, Repo.preload(updated_client, [:user, :business, :creator, assigned_coach: coaches], force: true)}
    end
  end

  # Token-based exceptions — no authenticated tenant ctx; documented pre-auth path.

  @spec invitation_preview(String.t()) :: {:ok, preview()}
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
    case token |> Client.for_invitation_token() |> Repo.one() do
      nil -> {:error, :invalid}
      %Client{status: :pending} = client -> check_expiry(client)
      %Client{} -> {:error, :used}
    end
  end

  def resolve_invitation_token(_), do: {:error, :invalid}

  @spec accept_invite(Client.t(), String.t(), String.t()) ::
          {:ok, Client.t()} | {:error, :race_lost | :already_active_elsewhere | Billing.record_error()}
  def accept_invite(%Client{} = client, user_id, accepted_email) do
    if user_has_active_client_elsewhere?(user_id, client.business_id) do
      {:error, :already_active_elsewhere}
    else
      do_atomic_accept(client, user_id, accepted_email)
    end
  end

  defp reserve_and_create(ctx, changeset) do
    Billing.reserve_seat(ctx, fn ->
      with {:ok, client} <- Repo.insert(changeset),
           {:ok, _assignment} <- Assignments.assign_default_intake_to_client(ctx, client.id) do
        {:ok, client}
      end
    end)
  end

  defp validate_not_self_invite(%Coach{user: %User{email: coach_email}}, email)
       when is_binary(coach_email) and is_binary(email) and email != "" and coach_email == email,
       do: {:error, :self_invite}

  defp validate_not_self_invite(_coach, _email), do: :ok

  defp validate_email_has_no_active_client(email) when is_binary(email) and email != "" do
    if Repo.exists?(Client.active_for_email(email)), do: {:error, :client_email_taken}, else: :ok
  end

  defp validate_email_has_no_active_client(_email), do: :ok

  defp delete_pending_invitation(%Client{status: :pending} = client) do
    client
    |> Client.delete_invitation_changeset()
    |> Repo.delete()
  end

  defp delete_pending_invitation(%Client{}) do
    {:error, :invitation_not_pending}
  end

  defp resend_client_invitation(%Client{status: :pending, email: email} = client, coach)
       when is_binary(email) and email != "" do
    case client |> Client.resend_invite_changeset(DateTime.utc_now(:second)) |> Repo.update() do
      {:ok, updated} ->
        deliver(%{updated | creator: coach, business: coach.business})
        {:ok, updated}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  defp resend_client_invitation(%Client{status: :pending, email: nil}, _coach) do
    {:error, :invitation_email_missing}
  end

  defp resend_client_invitation(%Client{status: :pending, email: ""}, _coach) do
    {:error, :invitation_email_missing}
  end

  defp resend_client_invitation(%Client{}, _coach) do
    {:error, :invitation_not_pending}
  end

  defp check_expiry(%Client{} = client) do
    if Client.invitation_expired?(client, DateTime.utc_now()) do
      {:error, :expired}
    else
      {:ok, client}
    end
  end

  defp user_has_active_client_elsewhere?(user_id, business_id) do
    Client.active_elsewhere(user_id, business_id)
    |> Repo.exists?()
  end

  defp do_atomic_accept(client, user_id, accepted_email) do
    joined_at = DateTime.utc_now(:microsecond)
    now = DateTime.truncate(joined_at, :second)

    with {:ok, {target_status, target_reason}} <- Billing.seat_status_for_invitation(client) do
      query = Client.pending_invitation(client.business_id, client.id)

      case Repo.update_all(query,
             set: [
               user_id: user_id,
               status: target_status,
               inactive_reason: target_reason,
               email: accepted_email,
               joined_at: joined_at,
               updated_at: now
             ]
           ) do
        {1, [updated]} -> {:ok, updated}
        {0, _} -> {:error, :race_lost}
      end
    end
  end

  defp coach_display_name(nil), do: "Coach"
  defp coach_display_name(%{first_name: nil}), do: "Coach"
  defp coach_display_name(%{first_name: ""}), do: "Coach"
  defp coach_display_name(%{first_name: name}), do: name
end
