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

  @expiring_soon_days 14
  # Workbench queue windows (spec: docs/archive/specs/2026-08-06-coach-workbench-spec.md §11.2).
  @programming_horizon_days 3
  @new_client_window_days 14
  @invite_stale_days 3

  @workbench_queues [:programming, :expiring, :new]

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
    filter = Keyword.get(opts, :filter)
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
      |> for_workbench_queue(filter, ctx.business_id)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       summary: summary(Client |> Client.for_business(ctx.business_id) |> Client.visible_to(ctx)),
       clients:
         base
         |> sort_clients(sort, filter)
         |> Easy.Utils.paginate(offset, limit)
         |> Client.include_preloads(ctx.business_id)
         |> Repo.all()
         |> put_attention_flags_for_clients(ctx.business_id)
         |> put_plan_names_for_clients(ctx.business_id, include_plans?)
     }}
  end

  # The Quiet queue's loader: membership and order are computed in
  # Easy.Workbench (schedule-aware, not expressible as one facts query), and
  # this turns that ordered id list into one page of client rows with the same
  # response shape as list_clients/2.
  @spec list_clients_in_order(Ctx.t(), [String.t()], keyword()) ::
          {:ok, %{clients: [Client.t()], count: non_neg_integer(), summary: map()}}
  def list_clients_in_order(%Ctx{} = ctx, ids, opts \\ []) do
    include_plans? = Keyword.get(opts, :include_plans, false)
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = min(max(Keyword.get(opts, :limit, 20), 0), 20)

    page_ids = ids |> Enum.drop(offset) |> Enum.take(limit)
    position = page_ids |> Enum.with_index() |> Map.new()

    clients =
      Client
      |> Client.for_business(ctx.business_id)
      |> where([c], c.id in ^page_ids)
      |> Client.include_preloads(ctx.business_id)
      |> Repo.all()
      |> put_attention_flags_for_clients(ctx.business_id)
      |> put_plan_names_for_clients(ctx.business_id, include_plans?)
      |> Enum.sort_by(&Map.fetch!(position, &1.id))

    {:ok,
     %{
       count: length(ids),
       summary: summary(Client |> Client.for_business(ctx.business_id) |> Client.visible_to(ctx)),
       clients: clients
     }}
  end

  # A queue imposes its own order (the actionable-first order from the spec);
  # the caller's sort applies only to the plain roster.
  defp sort_clients(query, sort, nil), do: sort_clients(query, sort)
  defp sort_clients(query, _sort, queue), do: order_workbench_queue(query, queue)

  defp sort_clients(query, :last_active), do: Client.by_last_active(query)
  defp sort_clients(query, _newest), do: Client.newest(query)

  @spec count_workbench_queues(Ctx.t()) ::
          {:ok, %{programming: non_neg_integer(), expiring: non_neg_integer(), new_clients: non_neg_integer()}}
  def count_workbench_queues(%Ctx{} = ctx) do
    horizon = Date.add(Date.utc_today(), @programming_horizon_days)

    facts =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)
      |> attention_facts(ctx.business_id)

    counts =
      from(f in subquery(facts),
        select: %{
          programming:
            count(
              fragment(
                "CASE WHEN ? = 'active' AND NOT ? AND (? IS NULL OR ? <= ?) THEN 1 END",
                f.status,
                f.open_ended,
                f.covered_until,
                f.covered_until,
                ^horizon
              )
            ),
          expiring: count(fragment("CASE WHEN ? AND NOT ? THEN 1 END", f.expiring_soon, f.expiring_snoozed)),
          new_clients: count(fragment("CASE WHEN ? THEN 1 END", f.new_client))
        }
      )
      |> Repo.one()

    {:ok, counts}
  end

  defp for_workbench_queue(query, nil, _business_id), do: query

  defp for_workbench_queue(query, queue, business_id) when queue in @workbench_queues do
    facts = query |> attention_facts(business_id) |> filter_queue_facts(queue)

    from client in Client,
      join: f in subquery(facts),
      as: :queue_facts,
      on: f.id == client.id
  end

  defp filter_queue_facts(facts, :programming) do
    horizon = Date.add(Date.utc_today(), @programming_horizon_days)

    from f in subquery(facts),
      where:
        f.status == :active and not f.open_ended and
          (is_nil(f.covered_until) or f.covered_until <= ^horizon)
  end

  defp filter_queue_facts(facts, :expiring) do
    from f in subquery(facts), where: f.expiring_soon and not f.expiring_snoozed
  end

  defp filter_queue_facts(facts, :new) do
    from f in subquery(facts), where: f.new_client
  end

  # No-plan clients first (nothing to build on), then whoever runs out soonest.
  defp order_workbench_queue(query, :programming) do
    from [client, queue_facts: f] in query,
      order_by: [asc_nulls_first: f.covered_until, desc: client.inserted_at, desc: client.id]
  end

  defp order_workbench_queue(query, :expiring) do
    from client in query, order_by: [asc: client.subscription_ends_on, desc: client.id]
  end

  defp order_workbench_queue(query, :new), do: Client.newest(query)

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
      # Attention flags are virtual: recompute post-update so the mutation response
      # carries the same derived shape as GET/list, not stale defaults.
      {:ok, preloaded |> List.wrap() |> put_attention_flags_for_clients(ctx.business_id) |> hd()}
    end
  end

  # Reactivation (inactive -> active) consumes a seat, so it reserves one atomically;
  # every other update is a plain write.
  defp write_client_update(ctx, client, attrs) do
    update = fn -> client |> Client.update_changeset(attrs) |> Repo.update() end
    if reactivation?(client, attrs), do: Billing.reserve_seat(ctx, update), else: update.()
  end

  defp reactivation?(%Client{status: :inactive}, attrs), do: to_string(attrs[:status] || "") == "active"
  defp reactivation?(_client, _attrs), do: false

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

  defp attention_facts(query, business_id) do
    {open_intake, active_training, active_nutrition} = attention_subqueries(business_id)
    today = Date.utc_today()
    horizon = Date.add(today, @expiring_soon_days)
    now = DateTime.utc_now(:second)
    new_cutoff = DateTime.add(now, -@new_client_window_days, :day)
    invite_cutoff = DateTime.add(now, -@invite_stale_days, :day)

    expiring_snooze =
      from s in Easy.Workbench.QueueSnooze,
        where:
          s.business_id == ^business_id and
            s.client_id == parent_as(:attention_client).id and
            s.queue == :expiring and s.snoozed_until >= ^today,
        select: 1

    from c in query,
      as: :attention_client,
      left_join: tc in subquery(plan_coverage(TrainingPlan, business_id, today)),
      on: tc.client_id == c.id,
      left_join: nc in subquery(plan_coverage(Plan, business_id, today)),
      on: nc.client_id == c.id,
      select: %{
        id: c.id,
        inserted_at: c.inserted_at,
        status: c.status,
        intake_incomplete: exists(subquery(open_intake)),
        needs_plan: not exists(subquery(active_training)) and not exists(subquery(active_nutrition)),
        expiring_soon:
          c.status == :active and not is_nil(c.subscription_ends_on) and
            c.subscription_ends_on >= ^today and c.subscription_ends_on <= ^horizon,
        # Snooze hides queue rows and counts; the expiring_soon flag itself is
        # untouched so roster chips stay honest (quiet-queue sub-spec).
        expiring_snoozed: exists(subquery(expiring_snooze)),
        # GREATEST skips NULLs in Postgres, so this is "the last day either
        # discipline has a plan scheduled through", null when neither does.
        covered_until: fragment("GREATEST(?, ?)", tc.covered_until, nc.covered_until),
        # An active plan with no end_date is open-ended (nutrition allows this):
        # coverage never runs out, whatever covered_until says.
        open_ended: coalesce(tc.open_ended, false) or coalesce(nc.open_ended, false),
        new_client:
          c.status != :inactive and
            (c.inserted_at >= ^new_cutoff or
               (c.status == :pending and coalesce(c.invitation_sent_at, c.inserted_at) <= ^invite_cutoff) or
               exists(subquery(open_intake)))
      }
  end

  # One row per client holding plans that still cover today or the future:
  # the max end_date is how far out that discipline's programming reaches, and
  # `open_ended` marks a plan with no end date at all.
  defp plan_coverage(schema, business_id, today) do
    from p in schema,
      where:
        p.business_id == ^business_id and p.status == :active and
          (is_nil(p.end_date) or p.end_date >= ^today),
      group_by: p.client_id,
      select: %{
        client_id: p.client_id,
        covered_until: max(p.end_date),
        open_ended: fragment("bool_or(? IS NULL)", p.end_date)
      }
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

  # Opt-in (`include_plans: true`): the clients list wants each row's in-force plan
  # names for its chips. Two extra queries per PAGE, not per row, and skipped
  # entirely for every caller that doesn't ask.
  defp put_plan_names_for_clients(clients, _business_id, false), do: clients
  defp put_plan_names_for_clients([], _business_id, true), do: []

  defp put_plan_names_for_clients(clients, business_id, true) do
    ids = Enum.map(clients, & &1.id)
    today = Date.utc_today()

    training = plan_names_by_client(TrainingPlan.active_for_clients(business_id, ids, today))
    nutrition = plan_names_by_client(Plan.active_for_clients(business_id, ids, today))

    Enum.map(clients, fn client ->
      %{
        client
        | training_plan_name: Map.get(training, client.id),
          nutrition_plan_name: Map.get(nutrition, client.id)
      }
    end)
  end

  # A client can hold more than one in-force plan of a kind; the row shows one
  # chip, so take the newest and be deterministic about it rather than letting
  # row order decide.
  defp plan_names_by_client(query) do
    query
    |> order_by([p], desc: p.inserted_at, desc: p.id)
    |> select([p], {p.client_id, p.name})
    |> Repo.all()
    |> Enum.reduce(%{}, fn {client_id, name}, acc -> Map.put_new(acc, client_id, name) end)
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
        expiring_soon: attention.expiring_soon,
        needs_programming:
          attention.status == :active and not attention.open_ended and
            programming_due?(attention.covered_until),
        covered_until: attention.covered_until
    }
  end

  defp programming_due?(nil), do: true

  defp programming_due?(covered_until) do
    Date.compare(covered_until, Date.add(Date.utc_today(), @programming_horizon_days)) != :gt
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
