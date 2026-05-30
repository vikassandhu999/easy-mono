defmodule EasyWeb.ResponseHelpers do
  @spec format_uuid(binary() | String.t() | nil) :: String.t() | nil
  def format_uuid(nil), do: nil
  def format_uuid(uuid) when is_binary(uuid), do: to_string(uuid)

  @spec format_timestamp(DateTime.t() | NaiveDateTime.t() | nil) :: String.t() | nil
  def format_timestamp(nil), do: nil

  def format_timestamp(%DateTime{} = datetime) do
    DateTime.to_iso8601(datetime)
  end

  def format_timestamp(%NaiveDateTime{} = naive_datetime) do
    naive_datetime
    |> DateTime.from_naive!("Etc/UTC")
    |> DateTime.to_iso8601()
  end

  @spec format_user(map()) :: map()
  def format_user(user) do
    %{
      id: format_uuid(user.id),
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      email_verified: user.email_verified,
      email_verified_at: format_timestamp(user.email_verified_at),
      created_at: format_timestamp(user.inserted_at),
      updated_at: format_timestamp(user.updated_at)
    }
  end

  @spec format_business(map()) :: map()
  def format_business(business) do
    %{
      id: format_uuid(business.id),
      name: business.name,
      slug: business.slug,
      description: business.description,
      owner_id: format_uuid(business.owner_id),
      status: business.status,
      created_at: format_timestamp(business.inserted_at),
      updated_at: format_timestamp(business.updated_at)
    }
  end

  @spec format_coach(map()) :: map()
  def format_coach(coach) do
    base = %{
      id: format_uuid(coach.id),
      user_id: format_uuid(coach.user_id),
      status: coach.status,
      bio: coach.bio,
      specialties: coach.specialties || [],
      credentials: coach.credentials || %{},
      created_at: format_timestamp(coach.inserted_at),
      updated_at: format_timestamp(coach.updated_at)
    }

    # Include user if preloaded
    if Ecto.assoc_loaded?(coach.user) do
      Map.put(base, :user, format_user(coach.user))
    else
      base
    end
  end

  @spec format_client(map()) :: map()
  def format_client(client) do
    %{
      id: format_uuid(client.id),
      email: client.email,
      full_name: client.full_name,
      phone: client.phone,
      status: client.status,
      user_id: format_uuid(client.user_id),
      notes: client.notes,
      created_at: format_timestamp(client.inserted_at),
      updated_at: format_timestamp(client.updated_at)
    }
  end

  @spec format_session(map()) :: map()
  def format_session(session) do
    base = %{
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: format_timestamp(session.expires_at),
      expires_in: session.expires_in
    }

    # Include session_id if present (from session.session field)
    if Map.has_key?(session, :session) and session.session do
      Map.put(base, :session_id, format_uuid(session.session.id))
    else
      base
    end
  end

  @spec format_session_with_context(map(), map() | nil) :: map()
  def format_session_with_context(session, context \\ nil) do
    base = format_session(session)

    if context do
      Map.put(base, :context, format_business_context(context))
    else
      base
    end
  end

  @spec format_business_context(map() | nil) :: map() | nil
  def format_business_context(nil), do: nil

  def format_business_context(context) when is_map(context) do
    %{
      coach_id: format_uuid(context[:coach_id] || context.coach_id),
      client_id: format_uuid(context[:client_id] || context.client_id),
      roles: context[:roles] || context.roles || []
    }
  end

  @spec format_available_contexts([map()]) :: [map()]
  def format_available_contexts(contexts) when is_list(contexts) do
    Enum.map(contexts, fn context ->
      %{
        business_name: context.business_name,
        roles: context.roles,
        coach_id: format_uuid(context[:coach_id]),
        client_id: format_uuid(context[:client_id])
      }
    end)
  end

  @spec format_subscription(map()) :: map()
  def format_subscription(subscription) do
    base = %{
      id: format_uuid(subscription.id),
      plan_id: format_uuid(subscription.plan_id),
      status: subscription.status,
      started_at: format_timestamp(subscription.started_at),
      current_period_start: format_timestamp(subscription.current_period_start),
      current_period_end: format_timestamp(subscription.current_period_end),
      cancelled_at: format_timestamp(subscription.cancelled_at),
      created_at: format_timestamp(subscription.inserted_at),
      updated_at: format_timestamp(subscription.updated_at)
    }

    # Include plan if preloaded
    if Ecto.assoc_loaded?(subscription.plan) do
      Map.put(base, :plan, format_plan(subscription.plan))
    else
      base
    end
  end

  @spec format_plan(map()) :: map()
  def format_plan(plan) do
    %{
      id: format_uuid(plan.id),
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      price_cents: plan.price_cents,
      billing_interval: plan.billing_interval,
      features: plan.features || %{},
      limits: plan.limits || %{},
      created_at: format_timestamp(plan.inserted_at),
      updated_at: format_timestamp(plan.updated_at)
    }
  end

  @spec format_assignment(map()) :: map()
  def format_assignment(assignment) do
    %{
      id: format_uuid(assignment.id),
      coach_id: format_uuid(assignment.coach_id),
      client_id: format_uuid(assignment.client_id),
      assigned_at: format_timestamp(assignment.assigned_at),
      assigned_by_id: format_uuid(assignment.assigned_by_id),
      created_at: format_timestamp(assignment.inserted_at),
      updated_at: format_timestamp(assignment.updated_at)
    }
  end

  @spec format_token_response(map(), String.t()) :: map()
  def format_token_response(token, status \\ "pending") do
    %{
      token_id: format_uuid(token.id),
      expires_at: format_timestamp(token.expires_at),
      status: status
    }
  end

  @spec format_invitation_response(String.t(), String.t(), DateTime.t()) :: map()
  def format_invitation_response(token_id, invitation_url, expires_at) do
    %{
      token_id: format_uuid(token_id),
      invitation_url: invitation_url,
      expires_at: format_timestamp(expires_at)
    }
  end

  @spec format_pagination(integer(), integer(), integer()) :: map()
  def format_pagination(limit, offset, total) do
    %{
      limit: limit,
      offset: offset,
      total: total
    }
  end

  @spec format_success_response(atom(), any()) :: map()
  def format_success_response(key, data) do
    %{key => data}
  end

  @spec format_success_response(map()) :: map()
  def format_success_response(data) when is_map(data) do
    data
  end

  @spec translate_changeset_errors(Ecto.Changeset.t()) :: map()
  def translate_changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
