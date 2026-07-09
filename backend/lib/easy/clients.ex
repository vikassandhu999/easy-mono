defmodule Easy.Clients do
  import Ecto.Changeset
  import Ecto.Query

  alias Easy.Billing
  alias Easy.ClientProfiles.FormAssignment
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Identity.User
  alias Easy.Nutrition.Plan
  alias Easy.Orgs
  alias Easy.Repo
  alias Easy.Training.TrainingPlan

  @profile_filter_sections ["general", "nutrition", "training", "lifestyle"]
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
        {:ok, client |> List.wrap() |> put_attention_flags(ctx.business_id) |> hd()}
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
          | {:error, Easy.Error.t()}
  def list_clients(%Ctx{} = ctx, opts \\ []) do
    search = Keyword.get(opts, :search, "")
    status = Keyword.get(opts, :status)
    stage = Keyword.get(opts, :stage)
    profile_filter = Keyword.get(opts, :profile_filter, %{})
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = min(max(Keyword.get(opts, :limit, 20), 0), 100)

    with {:ok, filters} <- normalize_profile_filter(profile_filter) do
      base =
        Client
        |> Client.for_business(ctx.business_id)
        |> Client.visible_to(ctx)
        |> Client.search(search)
        |> Client.for_status(status)
        |> Client.for_stage(stage)
        |> apply_profile_filters(ctx.business_id, filters)

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
           |> put_attention_flags(ctx.business_id)
       }}
    end
  end

  @spec invite_client(Ctx.t(), map()) :: {:ok, Client.t()} | {:error, any()}
  def invite_client(%Ctx{} = ctx, invite_attrs) do
    with :ok <- Billing.ensure_seat_available(ctx),
         {:ok, coach} <- get_coach(ctx),
         :ok <- validate_not_self_invite(coach, invite_attrs),
         :ok <- validate_email_has_no_active_client(invite_attrs),
         {:ok, client} <- create_invitation(coach, invite_attrs),
         :ok <- maybe_send_invitation_email(client, coach) do
      {:ok, client}
    end
  end

  @spec update_client(Ctx.t(), String.t(), map()) ::
          {:ok, Client.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_client(%Ctx{} = ctx, client_id, attrs) do
    with {:ok, client} <- get_client_with_preloads(ctx, client_id),
         :ok <- ensure_reactivation_capacity(ctx, client, attrs),
         {:ok, updated_client} <- client |> Client.update_changeset(attrs) |> Repo.update() do
      preload_client(updated_client)
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
          {:ok, Client.t()} | {:error, :not_found | Easy.Error.t() | Ecto.Changeset.t()}
  def revoke_invitation(%Ctx{} = ctx, client_id) do
    with {:ok, client} <- get_client(ctx, client_id) do
      delete_pending_invitation(client)
    end
  end

  @spec resend_invitation(Ctx.t(), String.t()) ::
          {:ok, Client.t()} | {:error, :not_found | Easy.Error.t() | Ecto.Changeset.t()}
  def resend_invitation(%Ctx{} = ctx, client_id) do
    with {:ok, client} <- get_client(ctx, client_id),
         {:ok, coach} <- get_coach(ctx),
         {:ok, updated_client} <- resend_client_invitation(client, coach) do
      preload_client(updated_client)
    end
  end

  @spec get_client_account_profile(Ctx.t()) ::
          {:ok, %{client: Client.t(), coach: Orgs.Coach.t() | nil}} | {:error, :not_found}
  def get_client_account_profile(%Ctx{} = ctx) do
    with {:ok, client} <- get_client_account(ctx) do
      coach = get_assigned_coach(ctx.business_id, client.assigned_coach_id)

      {:ok, %{client: client, coach: coach}}
    end
  end

  @spec update_client_account_profile(Ctx.t(), map()) ::
          {:ok, %{client: Client.t(), coach: Orgs.Coach.t() | nil}}
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
    if to_string(attrs[:status] || attrs["status"]) == "active" do
      Billing.ensure_seat_available(ctx)
    else
      :ok
    end
  end

  defp ensure_reactivation_capacity(_ctx, _client, _attrs), do: :ok

  defp put_attention_flags(clients, business_id) when is_list(clients) do
    ids = Enum.map(clients, & &1.id)

    intake_open =
      from(fa in FormAssignment,
        where:
          fa.business_id == ^business_id and fa.client_id in ^ids and
            fa.purpose == :intake and fa.status in [:assigned, :in_progress],
        select: fa.client_id
      )
      |> Repo.all()
      |> MapSet.new()

    with_training =
      from(tp in TrainingPlan,
        where: tp.business_id == ^business_id and tp.client_id in ^ids and tp.status == :active,
        select: tp.client_id
      )
      |> Repo.all()
      |> MapSet.new()

    with_nutrition =
      from(np in Plan,
        where: np.business_id == ^business_id and np.client_id in ^ids and np.status == :active,
        select: np.client_id
      )
      |> Repo.all()
      |> MapSet.new()

    today = Date.utc_today()
    horizon = Date.add(today, @expiring_soon_days)

    Enum.map(clients, fn client ->
      %{
        client
        | intake_incomplete: client.id in intake_open,
          needs_plan: client.id not in with_training and client.id not in with_nutrition,
          expiring_soon:
            client.status == :active and not is_nil(client.subscription_ends_on) and
              Date.compare(client.subscription_ends_on, today) != :lt and
              Date.compare(client.subscription_ends_on, horizon) != :gt
      }
    end)
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

  defp normalize_profile_filter(profile_filter) when is_map(profile_filter) do
    case Enum.reduce_while(profile_filter, {:ok, []}, fn
           {"custom", filters}, {:ok, acc} when is_map(filters) ->
             normalize_filter_fields(filters, acc, fn key, values -> {:custom, key, values} end)

           {section, filters}, {:ok, acc} when section in @profile_filter_sections and is_map(filters) ->
             normalize_filter_fields(filters, acc, fn key, values -> {:core, section, key, values} end)

           _, _acc ->
             {:halt, invalid_profile_filter()}
         end) do
      {:ok, filters} -> {:ok, Enum.reverse(filters)}
      error -> error
    end
  end

  defp normalize_profile_filter(_profile_filter), do: invalid_profile_filter()

  defp normalize_filter_fields(filters, acc, build_filter) do
    case Enum.reduce_while(filters, acc, fn {key, value}, acc ->
           with {:ok, key} <- filter_key(key),
                {:ok, values} <- filter_values(value) do
             {:cont, [build_filter.(key, values) | acc]}
           else
             :error -> {:halt, :error}
           end
         end) do
      :error -> {:halt, invalid_profile_filter()}
      acc -> {:cont, {:ok, acc}}
    end
  end

  defp apply_profile_filters(query, business_id, filters) do
    Enum.reduce(filters, query, fn
      {:core, section, key, values}, query ->
        apply_core_profile_filter(query, business_id, section, key, values)

      {:custom, key, values}, query ->
        apply_custom_profile_filter(query, business_id, key, values)
    end)
  end

  for section <- @profile_filter_sections do
    filter_sql =
      "EXISTS (SELECT 1 FROM client_profiles cp WHERE cp.client_id = ? AND cp.business_id = ? AND ((cp.#{section} ->> ?) = ANY(?) OR (jsonb_typeof(cp.#{section} -> ?) = 'array' AND jsonb_exists_any(cp.#{section} -> ?, ?))))"

    defp apply_core_profile_filter(query, business_id, unquote(section), key, values) do
      from(c in query,
        where:
          fragment(
            unquote(filter_sql),
            c.id,
            type(^business_id, :binary_id),
            ^key,
            type(^values, {:array, :string}),
            ^key,
            ^key,
            type(^values, {:array, :string})
          )
      )
    end
  end

  defp apply_custom_profile_filter(query, business_id, key, values) do
    from(c in query,
      where:
        fragment(
          "EXISTS (SELECT 1 FROM profile_field_values pfv JOIN profile_field_definitions pfd ON pfd.id = pfv.profile_field_definition_id WHERE pfv.client_id = ? AND pfv.business_id = ? AND pfd.business_id = ? AND pfd.key = ? AND pfd.filterable = TRUE AND pfd.archived_at IS NULL AND ((pfv.value ->> 'value') = ANY(?) OR (jsonb_typeof(pfv.value -> 'value') = 'array' AND jsonb_exists_any(pfv.value -> 'value', ?))))",
          c.id,
          type(^business_id, :binary_id),
          type(^business_id, :binary_id),
          ^key,
          type(^values, {:array, :string}),
          type(^values, {:array, :string})
        )
    )
  end

  defp filter_key(key) when is_binary(key) and key != "", do: {:ok, key}
  defp filter_key(_key), do: :error

  defp filter_values(value) when is_binary(value) and value != "", do: {:ok, [value]}

  defp filter_values(value) when is_boolean(value) or is_number(value),
    do: {:ok, [to_string(value)]}

  defp filter_values(values) when is_list(values) do
    case Enum.reduce_while(values, [], fn value, acc ->
           case filter_values(value) do
             {:ok, [normalized]} -> {:cont, [normalized | acc]}
             :error -> {:halt, :error}
           end
         end) do
      values when is_list(values) and values != [] -> {:ok, Enum.reverse(values)}
      _ -> :error
    end
  end

  defp filter_values(_value), do: :error

  defp invalid_profile_filter do
    {:error, Easy.Error.unprocessable(%{fields: %{profile_filter: ["is invalid"]}})}
  end

  defp validate_not_self_invite(%Orgs.Coach{user: %User{email: coach_email}}, %{email: email})
       when is_binary(coach_email) and is_binary(email) and email != "" and coach_email == email do
    {:error, Easy.Error.unprocessable(%{email: ["you can't invite yourself as a client"]})}
  end

  defp validate_not_self_invite(_coach, _attrs), do: :ok

  defp validate_email_has_no_active_client(%{email: email})
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
      from(tp in Easy.Training.TrainingPlan, where: tp.client_id == ^client.id)
      |> Repo.delete_all()

      from(np in Easy.Nutrition.Plan, where: np.client_id == ^client.id)
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

  defp do_atomic_accept(client_id, business_id, user_id, accepted_email) do
    now = DateTime.utc_now(:second)

    {target_status, target_reason} =
      if Billing.over_capacity?(business_id),
        do: {:inactive, :awaiting_seat},
        else: {:active, nil}

    query =
      from(c in Client,
        where: c.id == ^client_id and c.status == ^:pending,
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

  defp coach_display_name(nil), do: "Coach"
  defp coach_display_name(%{first_name: nil}), do: "Coach"
  defp coach_display_name(%{first_name: ""}), do: "Coach"
  defp coach_display_name(%{first_name: name}), do: name
end
