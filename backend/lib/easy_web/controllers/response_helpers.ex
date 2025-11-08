defmodule EasyWeb.ResponseHelpers do
  @moduledoc """
  Helper functions for formatting consistent API responses.

  This module provides utilities for formatting success and error responses
  with consistent structure, field naming, and data formatting across all API endpoints.

  ## Response Format Standards

  - All field names use snake_case
  - UUIDs are formatted as strings
  - Timestamps are formatted in ISO 8601 with UTC timezone
  - Success responses wrap data in appropriate keys
  - Error responses follow the ApiError format

  ## Usage

      # Format a user response
      user_data = ResponseHelpers.format_user(user)

      # Format a timestamp
      timestamp = ResponseHelpers.format_timestamp(datetime)

      # Format a UUID
      uuid_string = ResponseHelpers.format_uuid(uuid)
  """

  @doc """
  Formats a UUID as a string.

  Accepts either a binary UUID or a string UUID and returns a string representation.

  ## Examples

      iex> ResponseHelpers.format_uuid(<<1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16>>)
      "01020304-0506-0708-090a-0b0c0d0e0f10"

      iex> ResponseHelpers.format_uuid("01020304-0506-0708-090a-0b0c0d0e0f10")
      "01020304-0506-0708-090a-0b0c0d0e0f10"

      iex> ResponseHelpers.format_uuid(nil)
      nil
  """
  @spec format_uuid(binary() | String.t() | nil) :: String.t() | nil
  def format_uuid(nil), do: nil
  def format_uuid(uuid) when is_binary(uuid), do: to_string(uuid)

  @doc """
  Formats a DateTime as an ISO 8601 string with UTC timezone.

  ## Examples

      iex> dt = ~U[2024-01-01 12:00:00Z]
      iex> ResponseHelpers.format_timestamp(dt)
      "2024-01-01T12:00:00Z"

      iex> ResponseHelpers.format_timestamp(nil)
      nil
  """
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

  @doc """
  Formats a user for JSON response.

  Returns a map with snake_case field names, formatted UUIDs, and timestamps.

  ## Examples

      iex> user = %User{id: "123", email: "user@example.com", full_name: "John Doe"}
      iex> ResponseHelpers.format_user(user)
      %{
        id: "123",
        email: "user@example.com",
        full_name: "John Doe",
        email_verified: false,
        email_verified_at: nil,
        created_at: "2024-01-01T12:00:00Z",
        updated_at: "2024-01-01T12:00:00Z"
      }
  """
  @spec format_user(map()) :: map()
  def format_user(user) do
    %{
      id: format_uuid(user.id),
      email: user.email,
      full_name: user.full_name,
      email_verified: user.email_verified,
      email_verified_at: format_timestamp(user.email_verified_at),
      created_at: format_timestamp(user.inserted_at),
      updated_at: format_timestamp(user.updated_at)
    }
  end

  @doc """
  Formats a business for JSON response.

  ## Examples

      iex> business = %Business{id: "456", name: "Coaching Pro", owner_id: "123"}
      iex> ResponseHelpers.format_business(business)
      %{
        id: "456",
        name: "Coaching Pro",
        slug: "coaching-pro",
        description: nil,
        owner_id: "123",
        status: "active",
        created_at: "2024-01-01T12:00:00Z",
        updated_at: "2024-01-01T12:00:00Z"
      }
  """
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

  @doc """
  Formats a coach profile for JSON response.

  ## Examples

      iex> coach = %Coach{id: "789", user_id: "123", business_id: "456"}
      iex> ResponseHelpers.format_coach(coach)
      %{
        id: "789",
        user_id: "123",
        business_id: "456",
        status: "active",
        bio: nil,
        specialties: [],
        credentials: %{},
        created_at: "2024-01-01T12:00:00Z",
        updated_at: "2024-01-01T12:00:00Z"
      }
  """
  @spec format_coach(map()) :: map()
  def format_coach(coach) do
    base = %{
      id: format_uuid(coach.id),
      user_id: format_uuid(coach.user_id),
      business_id: format_uuid(coach.business_id),
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

  @doc """
  Formats a client for JSON response.

  ## Examples

      iex> client = %Client{id: "202", email: "client@example.com", business_id: "456"}
      iex> ResponseHelpers.format_client(client)
      %{
        id: "202",
        email: "client@example.com",
        full_name: "Jane Client",
        phone: "+1234567890",
        status: "pending",
        business_id: "456",
        user_id: nil,
        notes: nil,
        created_at: "2024-01-01T12:00:00Z",
        updated_at: "2024-01-01T12:00:00Z"
      }
  """
  @spec format_client(map()) :: map()
  def format_client(client) do
    %{
      id: format_uuid(client.id),
      email: client.email,
      full_name: client.full_name,
      phone: client.phone,
      status: client.status,
      business_id: format_uuid(client.business_id),
      user_id: format_uuid(client.user_id),
      notes: client.notes,
      created_at: format_timestamp(client.inserted_at),
      updated_at: format_timestamp(client.updated_at)
    }
  end

  @doc """
  Formats a session for JSON response.

  ## Examples

      iex> session = %{session_id: "550e8400-...", access_token: "token123", refresh_token: "refresh123", expires_at: ~U[2024-01-08 12:00:00Z], expires_in: 604800}
      iex> ResponseHelpers.format_session(session)
      %{
        session_id: "550e8400-...",
        access_token: "token123",
        refresh_token: "refresh123",
        expires_at: "2024-01-08T12:00:00Z",
        expires_in: 604800
      }
  """
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

  @doc """
  Formats a session with business context for JSON response.

  Returns a map with session data and optional business context.
  If context is nil, only session data is returned.

  ## Examples

      iex> session = %{access_token: "token123", refresh_token: "refresh123", expires_at: ~U[2024-01-08 12:00:00Z], expires_in: 604800}
      iex> context = %{business_id: "550e8400-...", coach_id: "660e8400-...", client_id: nil, roles: ["coach"]}
      iex> ResponseHelpers.format_session_with_context(session, context)
      %{
        access_token: "token123",
        refresh_token: "refresh123",
        expires_at: "2024-01-08T12:00:00Z",
        expires_in: 604800,
        context: %{
          business_id: "550e8400-...",
          coach_id: "660e8400-...",
          client_id: nil,
          roles: ["coach"]
        }
      }

      iex> session = %{access_token: "token123", refresh_token: "refresh123", expires_at: ~U[2024-01-08 12:00:00Z], expires_in: 604800}
      iex> ResponseHelpers.format_session_with_context(session, nil)
      %{
        access_token: "token123",
        refresh_token: "refresh123",
        expires_at: "2024-01-08T12:00:00Z",
        expires_in: 604800
      }
  """
  @spec format_session_with_context(map(), map() | nil) :: map()
  def format_session_with_context(session, context \\ nil) do
    base = format_session(session)

    if context do
      Map.put(base, :context, format_business_context(context))
    else
      base
    end
  end

  @doc """
  Formats business context for JSON response.

  Returns a map with business_id, coach_id, client_id, and roles.
  Returns nil if no business context is available.

  ## Examples

      iex> context = %{business_id: "550e8400-...", coach_id: "660e8400-...", client_id: nil, roles: ["coach"]}
      iex> ResponseHelpers.format_business_context(context)
      %{
        business_id: "550e8400-...",
        coach_id: "660e8400-...",
        client_id: nil,
        roles: ["coach"]
      }

      iex> ResponseHelpers.format_business_context(nil)
      nil
  """
  @spec format_business_context(map() | nil) :: map() | nil
  def format_business_context(nil), do: nil

  def format_business_context(context) when is_map(context) do
    %{
      business_id: format_uuid(context[:business_id] || context.business_id),
      coach_id: format_uuid(context[:coach_id] || context.coach_id),
      client_id: format_uuid(context[:client_id] || context.client_id),
      roles: context[:roles] || context.roles || []
    }
  end

  @doc """
  Formats available business contexts for JSON response.

  Used when a user has multiple business contexts to choose from.

  ## Examples

      iex> contexts = [
      ...>   %{business_id: "550e8400-...", business_name: "Acme Coaching", roles: ["coach"], coach_id: "660e8400-...", client_id: nil},
      ...>   %{business_id: "770e8400-...", business_name: "Beta Fitness", roles: ["client"], coach_id: nil, client_id: "880e8400-..."}
      ...> ]
      iex> ResponseHelpers.format_available_contexts(contexts)
      [
        %{
          business_id: "550e8400-...",
          business_name: "Acme Coaching",
          roles: ["coach"],
          coach_id: "660e8400-...",
          client_id: nil
        },
        %{
          business_id: "770e8400-...",
          business_name: "Beta Fitness",
          roles: ["client"],
          coach_id: nil,
          client_id: "880e8400-..."
        }
      ]
  """
  @spec format_available_contexts([map()]) :: [map()]
  def format_available_contexts(contexts) when is_list(contexts) do
    Enum.map(contexts, fn context ->
      %{
        business_id: format_uuid(context.business_id),
        business_name: context.business_name,
        roles: context.roles,
        coach_id: format_uuid(context[:coach_id]),
        client_id: format_uuid(context[:client_id])
      }
    end)
  end

  @doc """
  Formats a subscription with plan for JSON response.

  ## Examples

      iex> subscription = %Subscription{id: "101", business_id: "456", plan_id: "1"}
      iex> ResponseHelpers.format_subscription(subscription)
      %{
        id: "101",
        business_id: "456",
        plan_id: "1",
        status: "active",
        started_at: "2024-01-01T00:00:00Z",
        current_period_start: "2024-01-01T00:00:00Z",
        current_period_end: "2024-02-01T00:00:00Z",
        cancelled_at: nil,
        created_at: "2024-01-01T12:00:00Z",
        updated_at: "2024-01-01T12:00:00Z",
        plan: %{...}
      }
  """
  @spec format_subscription(map()) :: map()
  def format_subscription(subscription) do
    base = %{
      id: format_uuid(subscription.id),
      business_id: format_uuid(subscription.business_id),
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

  @doc """
  Formats a plan for JSON response.

  ## Examples

      iex> plan = %Plan{id: "1", name: "Free", slug: "free", price_cents: 0}
      iex> ResponseHelpers.format_plan(plan)
      %{
        id: "1",
        name: "Free",
        slug: "free",
        description: nil,
        price_cents: 0,
        billing_interval: "month",
        features: %{},
        limits: %{},
        created_at: "2024-01-01T12:00:00Z",
        updated_at: "2024-01-01T12:00:00Z"
      }
  """
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

  @doc """
  Formats a coach-client assignment for JSON response.

  ## Examples

      iex> assignment = %CoachClientAssignment{id: "999", coach_id: "789", client_id: "202"}
      iex> ResponseHelpers.format_assignment(assignment)
      %{
        id: "999",
        coach_id: "789",
        client_id: "202",
        assigned_at: "2024-01-01T12:00:00Z",
        assigned_by_id: "123",
        created_at: "2024-01-01T12:00:00Z",
        updated_at: "2024-01-01T12:00:00Z"
      }
  """
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

  @doc """
  Formats a token response for OTP generation.

  ## Examples

      iex> token = %OneTimeToken{id: "550e8400-...", expires_at: ~U[2024-01-01 12:10:00Z]}
      iex> ResponseHelpers.format_token_response(token)
      %{
        token_id: "550e8400-...",
        expires_at: "2024-01-01T12:10:00Z",
        status: "pending"
      }
  """
  @spec format_token_response(map(), String.t()) :: map()
  def format_token_response(token, status \\ "pending") do
    %{
      token_id: format_uuid(token.id),
      expires_at: format_timestamp(token.expires_at),
      status: status
    }
  end

  @doc """
  Formats an invitation response.

  ## Examples

      iex> ResponseHelpers.format_invitation_response("550e8400-...", "https://app.example.com/invite/...", ~U[2024-01-08 12:00:00Z])
      %{
        token_id: "550e8400-...",
        invitation_url: "https://app.example.com/invite/...",
        expires_at: "2024-01-08T12:00:00Z"
      }
  """
  @spec format_invitation_response(String.t(), String.t(), DateTime.t()) :: map()
  def format_invitation_response(token_id, invitation_url, expires_at) do
    %{
      token_id: format_uuid(token_id),
      invitation_url: invitation_url,
      expires_at: format_timestamp(expires_at)
    }
  end

  @doc """
  Formats pagination metadata.

  ## Examples

      iex> ResponseHelpers.format_pagination(50, 0, 150)
      %{
        limit: 50,
        offset: 0,
        total: 150
      }
  """
  @spec format_pagination(integer(), integer(), integer()) :: map()
  def format_pagination(limit, offset, total) do
    %{
      limit: limit,
      offset: offset,
      total: total
    }
  end

  @doc """
  Formats a success response with data.

  Wraps the data in a consistent structure for success responses.

  ## Examples

      iex> ResponseHelpers.format_success_response(:user, user_data)
      %{user: %{id: "123", email: "user@example.com", ...}}

      iex> ResponseHelpers.format_success_response(:users, [user1, user2])
      %{users: [%{id: "123", ...}, %{id: "456", ...}]}
  """
  @spec format_success_response(atom(), any()) :: map()
  def format_success_response(key, data) do
    %{key => data}
  end

  @doc """
  Formats a success response with multiple keys.

  ## Examples

      iex> ResponseHelpers.format_success_response(%{user: user_data, session: session_data})
      %{user: %{...}, session: %{...}}
  """
  @spec format_success_response(map()) :: map()
  def format_success_response(data) when is_map(data) do
    data
  end

  @doc """
  Translates Ecto changeset errors to a map of field => [errors].

  ## Examples

      iex> changeset = User.changeset(%User{}, %{})
      iex> ResponseHelpers.translate_changeset_errors(changeset)
      %{
        email: ["can't be blank"],
        full_name: ["can't be blank"]
      }
  """
  @spec translate_changeset_errors(Ecto.Changeset.t()) :: map()
  def translate_changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
