defmodule Easy.Clients do
  import Ecto.Changeset
  import Ecto.Query

  alias Easy.Billing
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Forms.FormAssignment
  alias Easy.Identity.User
  alias Easy.Nutrition.Plan
  alias Easy.Orgs
  alias Easy.Repo
  alias Easy.Training.TrainingPlan

  @expiring_soon_days 7

  @spec get_client(Ctx.t(), String.t()) :: {:ok, Client.t()} | {:error, :not_found}
  def get_client(%Ctx{} = ctx, client_id), do: authorize_client(ctx, client_id)

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
        {:ok, client |> List.wrap() |> put_attention_flags_for_clients(ctx.business_id) |> hd()}
    end
  end

  # The chokepoint every client-scoped authorization check routes through: a coach
  # only sees clients assigned to them, the owner sees every client in the business.
  @spec authorize_client(Ctx.t(), String.t()) :: {:ok, Client.t()} | {:error, :not_found}
  def authorize_client(%Ctx{} = ctx, client_id) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.visible_to(ctx)
    |> Repo.get(client_id)
    |> ok_or_not_found()
  end

  @spec authorize_client_id(Ctx.t(), String.t() | nil) :: :ok | {:error, :not_found}
  def authorize_client_id(_ctx, nil), do: :ok

  def authorize_client_id(%Ctx{} = ctx, client_id) do
    with {:ok, _client} <- authorize_client(ctx, client_id), do: :ok
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

  @spec get_client_account(Ctx.t()) :: {:ok, Client.t()} | {:error, :not_found}
  def get_client_account(%Ctx{} = ctx) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  @spec list_clients(Ctx.t(), keyword()) ::
          {:ok, %{clients: [Client.t()], count: non_neg_integer(), summary: map()}}
  def list_clients(%Ctx{} = ctx, opts \\ []) do
    search = Keyword.get(opts, :search, "")
    status = Keyword.get(opts, :status)
    stage = Keyword.get(opts, :stage)
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = min(max(Keyword.get(opts, :limit, 20), 0), 100)

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
         |> Client.newest()
         |> Easy.Utils.paginate(offset, limit)
         |> Client.include_preloads(ctx.business_id)
         |> Repo.all()
         |> put_attention_flags_for_clients(ctx.business_id)
     }}
  end

  @spec list_attention_clients(Ctx.t(), keyword()) ::
          {:ok, %{clients: [Client.t()], count: non_neg_integer()}}
  def list_attention_clients(%Ctx{} = ctx, opts \\ []) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = min(max(Keyword.get(opts, :limit, 20), 0), 100)

    attention =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)
      |> Client.accepted()
      |> attention_facts(ctx.business_id)
      |> attention_clients()

    {:ok, load_attention_clients(attention, ctx.business_id, offset, limit)}
  end

  @spec invite_client(Ctx.t(), map()) :: {:ok, Client.t()} | {:error, any()}
  def invite_client(%Ctx{} = ctx, invite_attrs) do
    with :ok <- Billing.ensure_seat_available(ctx),
         {:ok, coach} <- get_coach(ctx),
         :ok <- validate_not_self_invite(coach, invite_attrs),
         :ok <- validate_email_has_no_active_client(invite_attrs),
         {:ok, client} <- create_invitation(coach, invite_attrs),
         {:ok, _assignment} <- Easy.Forms.assign_default_intake_to_client(ctx, client.id),
         :ok <- maybe_send_invitation_email(client, coach) do
      {:ok, client}
    end
  end

  @spec update_client(Ctx.t(), String.t(), map()) ::
          {:ok, Client.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_client(%Ctx{} = ctx, client_id, attrs) do
    with {:ok, client} <- get_client_with_preloads(ctx, client_id),
         :ok <- ensure_reactivation_capacity(ctx, client, attrs),
         {:ok, updated_client} <- client |> Client.update_changeset(attrs) |> Repo.update(),
         {:ok, preloaded} <- preload_client(updated_client) do
      # Attention flags are virtual: recompute post-update so the mutation response
      # carries the same derived shape as GET/list, not stale defaults.
      {:ok, preloaded |> List.wrap() |> put_attention_flags_for_clients(ctx.business_id) |> hd()}
    end
  end

  # System-driven half of the stage lifecycle: the first assigned plan is the
  # moment coaching starts. Manual overrides go through update_client.
  @spec advance_stage_to_coaching(Ctx.t(), String.t()) :: :ok
  def advance_stage_to_coaching(%Ctx{} = ctx, client_id) do
    Client
    |> Client.for_business(ctx.business_id)
    |> where([c], c.id == ^client_id and c.stage == :onboarding)
    |> Repo.update_all(set: [stage: :coaching, updated_at: DateTime.utc_now(:second)])

    :ok
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

  @spec create_inquiry(Ctx.t(), map()) :: {:ok, Client.t()} | {:error, Ecto.Changeset.t()}
  def create_inquiry(%Ctx{} = ctx, attrs) do
    ctx.business_id
    |> Client.inquiry_changeset(attrs)
    |> put_change(:assigned_coach_id, owner_coach_id(ctx.business_id))
    |> Repo.insert()
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

  # Seat-gate reactivation only: inactive -> active at the seat limit
  # is blocked; every other status transition and every non-status update
  # passes through untouched.
  defp ensure_reactivation_capacity(ctx, %Client{status: current}, attrs)
       when current == :inactive do
    if to_string(attrs[:status] || "") == "active" do
      Billing.ensure_seat_available(ctx)
    else
      :ok
    end
  end

  defp ensure_reactivation_capacity(_ctx, _client, _attrs), do: :ok

  defp attention_facts(query, business_id) do
    {open_intake, active_training, active_nutrition} = attention_subqueries(business_id)
    today = Date.utc_today()
    horizon = Date.add(today, @expiring_soon_days)

    from c in query,
      as: :attention_client,
      select: %{
        id: c.id,
        inserted_at: c.inserted_at,
        intake_incomplete: exists(subquery(open_intake)),
        needs_plan: not exists(subquery(active_training)) and not exists(subquery(active_nutrition)),
        expiring_soon:
          c.status == :active and not is_nil(c.subscription_ends_on) and
            c.subscription_ends_on >= ^today and c.subscription_ends_on <= ^horizon
      }
  end

  defp attention_clients(query) do
    from attention in subquery(query),
      where: attention.intake_incomplete or attention.needs_plan or attention.expiring_soon
  end

  defp load_attention_clients(query, _business_id, _offset, 0) do
    %{count: count_attention_clients(query), clients: []}
  end

  defp load_attention_clients(query, business_id, offset, limit) do
    rows =
      Client
      |> join(:inner, [client], attention in subquery(query),
        as: :attention,
        on: attention.id == client.id
      )
      |> order_attention_clients()
      |> Easy.Utils.paginate(offset, limit)
      |> Client.include_preloads(business_id)
      |> select([client, attention: attention], {
        client,
        attention.intake_incomplete,
        attention.needs_plan,
        attention.expiring_soon,
        fragment("count(*) OVER ()")
      })
      |> Repo.all()

    %{
      count: attention_count(rows, query),
      clients: Enum.map(rows, &put_attention_flags/1)
    }
  end

  defp order_attention_clients(query) do
    from [client, attention: attention] in query,
      order_by: [
        asc:
          fragment(
            "CASE WHEN ? THEN 1 WHEN ? THEN 2 ELSE 3 END",
            attention.intake_incomplete,
            attention.needs_plan
          ),
        desc: attention.inserted_at,
        desc: client.id
      ]
  end

  defp attention_count([{_client, _intake, _plan, _expiry, count} | _], _query), do: count
  defp attention_count([], query), do: count_attention_clients(query)

  defp count_attention_clients(query) do
    query
    |> subquery()
    |> select([attention], count(attention.id))
    |> Repo.one()
  end

  defp attention_subqueries(business_id) do
    open_intake =
      from fa in FormAssignment,
        where:
          fa.business_id == ^business_id and
            fa.client_id == parent_as(:attention_client).id and
            fa.purpose == :intake and fa.status in [:assigned, :in_progress],
        select: 1

    active_training =
      from tp in TrainingPlan,
        where:
          tp.business_id == ^business_id and
            tp.client_id == parent_as(:attention_client).id and tp.status == :active,
        select: 1

    active_nutrition =
      from np in Plan,
        where:
          np.business_id == ^business_id and
            np.client_id == parent_as(:attention_client).id and np.status == :active,
        select: 1

    {open_intake, active_training, active_nutrition}
  end

  defp put_attention_flags_for_clients([], _business_id), do: []

  defp put_attention_flags_for_clients(clients, business_id) do
    ids = Enum.map(clients, & &1.id)

    flags =
      Client
      |> Client.for_business(business_id)
      |> where([client], client.id in ^ids)
      |> attention_facts(business_id)
      |> Repo.all()
      |> Map.new(&{&1.id, &1})

    Enum.map(clients, &put_attention_flags(&1, flags))
  end

  defp put_attention_flags(client, flags) do
    case Map.fetch(flags, client.id) do
      {:ok, attention} -> put_attention_flags({client, attention})
      :error -> client
    end
  end

  defp put_attention_flags({client, attention}) do
    %{
      client
      | intake_incomplete: attention.intake_incomplete,
        needs_plan: attention.needs_plan,
        expiring_soon: attention.expiring_soon
    }
  end

  defp put_attention_flags({client, intake, plan, expiry, _count}) do
    %{client | intake_incomplete: intake, needs_plan: plan, expiring_soon: expiry}
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

  # Public inquiry funnel has no acting coach, so the new client defaults to the
  # business owner's coach row. Fails closed (nil) if the owner has no coach row —
  # the owner still sees every client via visible_to's owner? clause regardless.
  defp owner_coach_id(business_id) do
    case Repo.get(Orgs.Business, business_id) do
      nil ->
        nil

      business ->
        Orgs.Coach
        |> Orgs.Coach.for_business(business_id)
        |> Orgs.Coach.for_user(business.owner_id)
        |> Repo.one()
        |> case do
          nil -> nil
          coach -> coach.id
        end
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
      from(tp in Easy.Training.TrainingPlan,
        where: tp.business_id == ^client.business_id and tp.client_id == ^client.id
      )
      |> Repo.delete_all()

      from(np in Easy.Nutrition.Plan,
        where: np.business_id == ^client.business_id and np.client_id == ^client.id
      )
      |> Repo.delete_all()

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
    now = DateTime.utc_now(:second)

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
