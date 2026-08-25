defmodule Easy.Clients do
  import Ecto.Changeset
  import Ecto.Query

  alias Easy.Billing
  alias Easy.ClientAccess
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Identity.User
  alias Easy.LocalCalendar
  alias Easy.Nutrition.Programming
  alias Easy.Orgs
  alias Easy.Repo
  alias Easy.Training.TrainingPlan

  @expiring_soon_days 14

  @spec get_client(Ctx.t(), String.t()) :: {:ok, Client.t()} | {:error, :not_found}
  def get_client(%Ctx{} = ctx, client_id), do: ClientAccess.authorize_client(ctx, client_id)

  @spec get_client_with_preloads(Ctx.t(), String.t()) ::
          {:ok, Client.t()} | {:error, :not_found}
  def get_client_with_preloads(%Ctx{} = ctx, client_id) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.visible_to(ctx)
    |> Client.include_preloads(ctx.business_id)
    |> Repo.get(client_id)
    |> case do
      nil ->
        {:error, :not_found}

      client ->
        {:ok, put_expiring_flag(client)}
    end
  end

  @spec authorize_client(Ctx.t(), String.t()) :: {:ok, Client.t()} | {:error, :not_found}
  def authorize_client(%Ctx{} = ctx, client_id),
    do: ClientAccess.authorize_client(ctx, client_id)

  @spec authorize_client_id(Ctx.t(), String.t() | nil) :: :ok | {:error, :not_found}
  def authorize_client_id(%Ctx{} = ctx, client_id) do
    ClientAccess.authorize_client_id(ctx, client_id)
  end

  @spec reassign_client(Ctx.t(), String.t(), String.t()) ::
          {:ok, Client.t()} | {:error, :not_owner | :not_found | :coach_not_active}
  def reassign_client(%Ctx{} = ctx, client_id, coach_id) do
    with :ok <- ensure_owner(ctx),
         {:ok, coach} <- get_active_coach(ctx, coach_id),
         {:ok, client} <- authorize_client(ctx, client_id) do
      client
      |> change()
      |> put_change(:assigned_coach_id, coach.id)
      |> Repo.update()
    end
  end

  @spec get_active_client(Ctx.t()) :: {:ok, Client.t()} | {:error, :not_found}
  def get_active_client(%Ctx{} = ctx) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.for_user(ctx.user_id)
    |> Client.accepted()
    |> Repo.one()
    |> ok_or_not_found()
  end

  @spec get_client_account(Ctx.t()) :: {:ok, Client.t()} | {:error, :not_found}
  def get_client_account(%Ctx{} = ctx) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      Client
      |> Client.for_business(ctx.business_id)
      |> Repo.get(client_id)
      |> ok_or_not_found()
    end
  end

  @spec list_clients(Ctx.t(), keyword()) ::
          {:ok, %{clients: [Client.t()], count: non_neg_integer(), summary: map()}}
  def list_clients(%Ctx{} = ctx, opts \\ []) do
    search = Keyword.get(opts, :search, "")
    status = Keyword.get(opts, :status)
    stage = Keyword.get(opts, :stage)
    sort = Keyword.get(opts, :sort, :newest)
    include_plans? = Keyword.get(opts, :include_plans, false)
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = min(max(Keyword.get(opts, :limit, 20), 0), 20)

    base =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)
      |> Client.search(search)
      |> Client.for_status(status)
      |> Client.for_stage(stage)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       summary: summary(Client |> Client.for_business(ctx.business_id) |> Client.visible_to(ctx)),
       clients:
         base
         |> sort_clients(sort)
         |> Easy.Utils.paginate(offset, limit)
         |> Client.include_preloads(ctx.business_id)
         |> Repo.all()
         |> Enum.map(&put_expiring_flag/1)
         |> put_plan_names_for_clients(ctx, include_plans?)
     }}
  end

  defp sort_clients(query, :last_active), do: Client.by_last_active(query)
  defp sort_clients(query, _newest), do: Client.newest(query)

  @spec invite_client(Ctx.t(), map()) :: {:ok, Client.t()} | {:error, any()}
  def invite_client(%Ctx{} = ctx, invite_attrs) do
    with {:ok, coach} <- get_coach(ctx),
         :ok <- validate_not_self_invite(coach, invite_attrs),
         :ok <- validate_email_has_no_active_client(invite_attrs),
         {:ok, client} <- reserve_and_create_invitation(ctx, coach, invite_attrs),
         :ok <- maybe_send_invitation_email(client, coach) do
      {:ok, client}
    end
  end

  # Capacity check + pending-client insert run in one locked transaction so two
  # concurrent invites can't both consume the last seat (see Billing.reserve_seat).
  # The email send stays outside so no lock is held over SMTP.
  defp reserve_and_create_invitation(ctx, coach, invite_attrs) do
    Billing.reserve_seat(ctx, fn ->
      with {:ok, client} <- create_invitation(coach, invite_attrs),
           {:ok, _assignment} <- Easy.Forms.assign_default_intake_to_client(ctx, client.id) do
        {:ok, client}
      end
    end)
  end

  @spec update_client(Ctx.t(), String.t(), map()) ::
          {:ok, Client.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_client(%Ctx{} = ctx, client_id, attrs) do
    with {:ok, client} <- get_client_with_preloads(ctx, client_id),
         {:ok, updated_client} <- write_client_update(ctx, client, attrs),
         {:ok, preloaded} <- preload_client(updated_client) do
      {:ok, put_expiring_flag(preloaded)}
    end
  end

  # Reactivation (inactive -> active) consumes a seat, so it reserves one atomically;
  # every other update is a plain write.
  defp write_client_update(ctx, client, attrs) do
    update = fn -> client |> Client.update_changeset(attrs) |> Repo.update() end
    if reactivation?(client, attrs), do: Billing.reserve_seat(ctx, update), else: update.()
  end

  defp reactivation?(%Client{status: :inactive}, attrs),
    do: to_string(attrs[:status] || "") == "active"

  defp reactivation?(_client, _attrs), do: false

  @spec advance_stage_to_coaching(Ctx.t(), String.t()) :: :ok
  def advance_stage_to_coaching(%Ctx{} = ctx, client_id) do
    ClientAccess.advance_stage_to_coaching(ctx, client_id)
  end

  @spec revoke_invitation(Ctx.t(), String.t()) ::
          {:ok, Client.t()} | {:error, :not_found | :invitation_not_pending | Ecto.Changeset.t()}
  def revoke_invitation(%Ctx{} = ctx, client_id) do
    with {:ok, client} <- get_client(ctx, client_id) do
      delete_pending_invitation(client)
    end
  end

  @spec resend_invitation(Ctx.t(), String.t()) ::
          {:ok, Client.t()}
          | {:error, :not_found | :invitation_email_missing | :invitation_not_pending | Ecto.Changeset.t()}
  def resend_invitation(%Ctx{} = ctx, client_id) do
    with {:ok, client} <- get_client(ctx, client_id),
         {:ok, coach} <- get_coach(ctx),
         {:ok, updated_client} <- resend_client_invitation(client, coach) do
      preload_client(updated_client)
    end
  end

  @spec get_client_account_profile(Ctx.t()) ::
          {:ok,
           %{
             client: Client.t(),
             coach: Orgs.Coach.t() | nil,
             default_weight_unit: :kg | :lbs
           }}
          | {:error, :not_found}
  def get_client_account_profile(%Ctx{} = ctx) do
    with {:ok, client} <- get_client_account(ctx),
         %Orgs.Business{} = business <- Repo.get(Orgs.Business, ctx.business_id) do
      coach = get_assigned_coach(ctx.business_id, client.assigned_coach_id)

      {:ok, %{client: client, coach: coach, default_weight_unit: business.default_weight_unit}}
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  @spec update_client_account_profile(Ctx.t(), map()) ::
          {:ok,
           %{
             client: Client.t(),
             coach: Orgs.Coach.t() | nil,
             default_weight_unit: :kg | :lbs
           }}
          | {:error, :not_found | Ecto.Changeset.t()}
  def update_client_account_profile(%Ctx{} = ctx, attrs) do
    with {:ok, client} <- get_client_account(ctx),
         {:ok, _updated} <- client |> Client.self_update_changeset(attrs) |> Repo.update() do
      get_client_account_profile(ctx)
    end
  end

  # Token-based exceptions — no authenticated tenant ctx; documented pre-auth path.

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
      do_atomic_accept(client_id, business_id, user_id, accepted_email)
    end
  end

  # Opt-in (`include_plans: true`): the clients list wants each row's in-force plan
  # names for its chips. Two extra queries per PAGE, not per row, and skipped
  # entirely for every caller that doesn't ask.
  defp put_plan_names_for_clients(clients, _ctx, false), do: clients
  defp put_plan_names_for_clients([], _ctx, true), do: []

  defp put_plan_names_for_clients(clients, %Ctx{} = ctx, true) do
    ids = Enum.map(clients, & &1.id)
    now = DateTime.utc_now()

    local_dates =
      Map.new(clients, fn client ->
        timezone = LocalCalendar.applied_timezone(client.timezone, client.business.timezone)
        {client.id, LocalCalendar.to_local_date(now, timezone)}
      end)

    training = training_plan_names_by_client(ctx.business_id, ids, local_dates)
    {:ok, nutrition_plans} = Programming.covering_plans_for_clients(ctx, local_dates)
    nutrition = Map.new(nutrition_plans, fn {client_id, plan} -> {client_id, plan.name} end)

    Enum.map(clients, fn client ->
      %{
        client
        | training_plan_name: Map.get(training, client.id),
          nutrition_plan_name: Map.get(nutrition, client.id)
      }
    end)
  end

  defp training_plan_names_by_client(business_id, client_ids, local_dates) do
    dates = Map.values(local_dates)

    TrainingPlan
    |> TrainingPlan.for_business(business_id)
    |> TrainingPlan.for_kind(:client_plan)
    |> TrainingPlan.for_archived(false)
    |> where([plan], plan.client_id in ^client_ids)
    |> where([plan], not is_nil(plan.start_date) and plan.start_date <= ^Enum.max(dates, Date))
    |> where([plan], is_nil(plan.end_date) or plan.end_date >= ^Enum.min(dates, Date))
    |> TrainingPlan.newest()
    |> Repo.all()
    |> Enum.filter(fn plan ->
      TrainingPlan.lifecycle(plan, Map.fetch!(local_dates, plan.client_id)) == :current
    end)
    |> Enum.reduce(%{}, fn plan, acc -> Map.put_new(acc, plan.client_id, plan.name) end)
  end

  defp put_expiring_flag(%Client{} = client) do
    today = Date.utc_today()
    horizon = Date.add(today, @expiring_soon_days)

    expiring_soon =
      client.status == :active and not is_nil(client.subscription_ends_on) and
        Date.compare(client.subscription_ends_on, today) != :lt and
        Date.compare(client.subscription_ends_on, horizon) != :gt

    %{client | expiring_soon: expiring_soon}
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}

  defp preload_client(%Client{} = client) do
    {:ok, Repo.preload(client, [:user, :business, :creator], force: true)}
  end

  defp get_coach(%Ctx{} = ctx) do
    Orgs.Coach
    |> Orgs.Coach.for_business(ctx.business_id)
    |> Orgs.Coach.for_user(ctx.user_id)
    |> Orgs.Coach.include_preloads(ctx.business_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp get_assigned_coach(_business_id, nil), do: nil

  defp get_assigned_coach(business_id, coach_id) do
    Orgs.Coach
    |> Orgs.Coach.for_business(business_id)
    |> Orgs.Coach.include_preloads(business_id)
    |> Repo.get(coach_id)
  end

  defp summary(query) do
    counts =
      from(c in query,
        select: %{
          active: count(fragment("CASE WHEN ? = 'active' THEN 1 END", c.status)),
          pending: count(fragment("CASE WHEN ? = 'pending' THEN 1 END", c.status)),
          inactive: count(fragment("CASE WHEN ? = 'inactive' THEN 1 END", c.status))
        }
      )
      |> Repo.one()

    counts || %{active: 0, pending: 0, inactive: 0}
  end

  defp validate_not_self_invite(%Orgs.Coach{user: %User{email: coach_email}}, %{email: email})
       when is_binary(coach_email) and is_binary(email) and email != "" and coach_email == email do
    {:error, :self_invite}
  end

  defp validate_not_self_invite(_coach, _attrs), do: :ok

  defp validate_email_has_no_active_client(%{email: email})
       when is_binary(email) and email != "" do
    if Repo.exists?(Client.active_for_email(email)) do
      {:error, :client_email_taken}
    else
      :ok
    end
  end

  defp validate_email_has_no_active_client(_attrs), do: :ok

  defp create_invitation(coach, invite_attrs) do
    coach
    |> Client.invite_changeset(invite_attrs)
    |> put_change(:assigned_coach_id, coach.id)
    |> Repo.insert()
  end

  defp ensure_owner(%Ctx{owner?: true}), do: :ok
  defp ensure_owner(%Ctx{}), do: {:error, :not_owner}

  defp get_active_coach(%Ctx{} = ctx, coach_id) do
    Orgs.Coach
    |> Orgs.Coach.for_business(ctx.business_id)
    |> Orgs.Coach.active()
    |> Repo.get(coach_id)
    |> case do
      nil -> {:error, :coach_not_active}
      coach -> {:ok, coach}
    end
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
    {:error, :invitation_not_pending}
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
    {:error, :invitation_email_missing}
  end

  defp resend_client_invitation(%Client{status: :pending, email: ""}, _coach) do
    {:error, :invitation_email_missing}
  end

  defp resend_client_invitation(%Client{}, _coach) do
    {:error, :invitation_not_pending}
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

  defp do_atomic_accept(client_id, business_id, user_id, accepted_email) do
    joined_at = DateTime.utc_now(:microsecond)
    now = DateTime.truncate(joined_at, :second)

    with {:ok, {target_status, target_reason}} <-
           Billing.seat_status_for_invitation(%Client{business_id: business_id}) do
      query =
        from(c in Client,
          where: c.id == ^client_id and c.business_id == ^business_id and c.status == ^:pending,
          select: c
        )

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
