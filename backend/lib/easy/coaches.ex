defmodule Easy.Coaches do
  @moduledoc """
  Coaches context handles coach profile management.

  This is the public API for:
  - Coach CRUD operations
  - Coach-client assignments
  - Coach queries

  ## Scope-Based Functions

  The new scope-based functions accept an `Easy.Auth.Scope` struct as the first
  parameter and automatically apply business context filtering and authorization.
  These functions ensure proper tenant isolation and authorization enforcement.

  ## Legacy Functions

  The older functions without scope parameters are maintained for backward
  compatibility but will be deprecated in future versions. New code should use
  scope-based functions.
  """

  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Coaches.Coach
  alias Easy.Accounts.User
  alias Easy.Organizations.Business
  alias Easy.Auth.Scope
  alias Easy.QueryHelpers
  alias EasyWeb.Authorization

  # ============================================
  # SCOPE-BASED COACH QUERY FUNCTIONS
  # ============================================

  @doc """
  Lists all coaches in the scope's business context.

  Automatically filters coaches by the business_id from the scope,
  ensuring proper tenant isolation.

  ## Parameters
    - scope: The scope struct containing business context

  ## Returns
    - {:ok, [%Coach{}]} on success
    - {:error, :forbidden} if scope has no business context

  ## Examples

      iex> list_coaches(scope)
      {:ok, [%Coach{}, %Coach{}]}

      iex> list_coaches(scope_without_business)
      {:error, :forbidden}
  """
  def list_coaches(%Scope{} = scope) do
    if Scope.has_business_context?(scope) do
      coaches =
        from(c in Coach, order_by: [desc: c.inserted_at])
        |> QueryHelpers.scope_to_business(scope)
        |> Repo.all()

      {:ok, coaches}
    else
      {:error, :forbidden}
    end
  end

  @doc """
  Gets a coach by ID with scope-based authorization.

  Verifies that the scope has access to the requested coach profile.
  Access is granted if:
  - The scope's coach_id matches the requested coach_id (user owns the profile)
  - The scope's business_id matches the coach's business_id (same business)

  ## Parameters
    - scope: The scope struct containing authorization context
    - coach_id: The coach ID to retrieve

  ## Returns
    - {:ok, %Coach{}} on success
    - {:error, :not_found} if coach doesn't exist
    - {:error, :forbidden} if scope doesn't have access to the coach

  ## Examples

      iex> get_coach(scope, "coach-uuid")
      {:ok, %Coach{}}

      iex> get_coach(scope, "other-business-coach-uuid")
      {:error, :forbidden}

      iex> get_coach(scope, "nonexistent-uuid")
      {:error, :not_found}
  """
  def get_coach(%Scope{} = scope, coach_id) when is_binary(coach_id) do
    case Repo.get(Coach, coach_id) do
      nil ->
        {:error, :not_found}

      coach ->
        # Check if scope has access to this coach
        # Access granted if: user owns the coach profile OR coach is in scope's business
        cond do
          scope.coach_id == coach_id ->
            {:ok, coach}

          scope.business_id == coach.business_id ->
            {:ok, coach}

          true ->
            {:error, :forbidden}
        end
    end
  end

  # ============================================
  # SCOPE-BASED COACH MUTATION FUNCTIONS
  # ============================================

  @doc """
  Creates a coach profile using scope-based authorization.

  Uses the business_id from the scope to create the coach profile,
  ensuring the coach is created in the correct business context.

  ## Parameters
    - scope: The scope struct containing business context
    - user_id: The user ID for the new coach profile
    - attrs: Map of coach attributes (bio, specialties, credentials, status)

  ## Returns
    - {:ok, %Coach{}} on success
    - {:error, :forbidden} if scope has no business context
    - {:error, changeset} on validation failure

  ## Examples

      iex> create_coach(scope, "user-uuid", %{bio: "Experienced coach"})
      {:ok, %Coach{}}

      iex> create_coach(scope_without_business, "user-uuid", %{})
      {:error, :forbidden}

      iex> create_coach(scope, "user-uuid", %{status: "invalid"})
      {:error, %Ecto.Changeset{}}
  """
  def create_coach(%Scope{business_id: business_id} = _scope, user_id, attrs)
      when not is_nil(business_id) and is_binary(user_id) do
    attrs_with_ids =
      attrs
      |> Map.put(:user_id, user_id)
      |> Map.put(:business_id, business_id)

    %Coach{}
    |> Coach.create_changeset(attrs_with_ids)
    |> Repo.insert()
  end

  def create_coach(%Scope{}, _user_id, _attrs), do: {:error, :forbidden}

  @doc """
  Updates a coach with scope-based authorization.

  Verifies that the scope has access to update the coach profile.
  Access is granted if the scope's coach_id matches the requested coach_id.

  ## Parameters
    - scope: The scope struct containing authorization context
    - coach_id: The coach ID to update
    - attrs: Map of attributes to update

  ## Returns
    - {:ok, %Coach{}} on success
    - {:error, :not_found} if coach doesn't exist
    - {:error, :forbidden} if scope doesn't have access to update the coach
    - {:error, changeset} on validation failure

  ## Examples

      iex> update_coach(scope, "coach-uuid", %{bio: "Updated bio"})
      {:ok, %Coach{}}

      iex> update_coach(scope, "other-coach-uuid", %{bio: "..."})
      {:error, :forbidden}

      iex> update_coach(scope, "coach-uuid", %{status: "invalid"})
      {:error, %Ecto.Changeset{}}
  """
  def update_coach(%Scope{} = scope, coach_id, attrs) when is_binary(coach_id) do
    with {:ok, coach} <- get_coach(scope, coach_id),
         :ok <- Authorization.authorize_coach_access(scope, coach_id) do
      coach
      |> Coach.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @doc """
  Deletes a coach with scope-based authorization.

  Verifies that the scope has access to delete the coach profile.
  Only business owners can delete coach profiles.

  ## Parameters
    - scope: The scope struct containing authorization context
    - coach_id: The coach ID to delete

  ## Returns
    - {:ok, %Coach{}} on success
    - {:error, :not_found} if coach doesn't exist
    - {:error, :forbidden} if scope doesn't have permission to delete the coach

  ## Examples

      iex> delete_coach(owner_scope, "coach-uuid")
      {:ok, %Coach{}}

      iex> delete_coach(coach_scope, "coach-uuid")
      {:error, :forbidden}

      iex> delete_coach(scope, "nonexistent-uuid")
      {:error, :not_found}
  """
  def delete_coach(%Scope{} = scope, coach_id) when is_binary(coach_id) do
    with {:ok, coach} <- get_coach(scope, coach_id),
         :ok <- Authorization.authorize_business_owner(scope, coach.business_id) do
      Repo.delete(coach)
    end
  end

  # ============================================
  # LEGACY COACH MANAGEMENT
  # ============================================

  @doc """
  Creates a coach profile for a user within a business.

  **DEPRECATED:** Use `create_coach/3` with scope parameter instead.
  This legacy function will be removed in a future version.

  ## Parameters
    - user: The user struct or user_id
    - business: The business struct or business_id
    - attrs: Map of coach attributes (bio, specialties, credentials, status)

  ## Returns
    - {:ok, coach} on success
    - {:error, changeset} on validation failure

  ## Examples

      iex> create_coach_legacy(user, business, %{bio: "Experienced coach"})
      {:ok, %Coach{}}

      iex> create_coach_legacy(user, business, %{status: "invalid"})
      {:error, %Ecto.Changeset{}}
  """
  def create_coach_legacy(%User{id: user_id}, %Business{id: business_id}, attrs) do
    create_coach_legacy(user_id, business_id, attrs)
  end

  def create_coach_legacy(user_id, business_id, attrs) do
    attrs_with_ids =
      attrs
      |> Map.put(:user_id, user_id)
      |> Map.put(:business_id, business_id)

    %Coach{}
    |> Coach.create_changeset(attrs_with_ids)
    |> Repo.insert()
  end

  @doc """
  Gets a coach by ID.
  Returns the coach struct or nil if not found.

  **DEPRECATED:** Use `get_coach/2` with scope parameter instead.
  This legacy function will be removed in a future version.

  ## Examples

      iex> get_coach_legacy(123)
      %Coach{}

      iex> get_coach_legacy(999)
      nil
  """
  def get_coach_legacy(id), do: Repo.get(Coach, id)

  @doc """
  Gets a coach by ID and preloads associations.

  **DEPRECATED:** This legacy function will be removed in a future version.

  ## Parameters
    - id: The coach ID
    - preloads: List of associations to preload (default: [:user, :business])

  ## Examples

      iex> get_coach_with_preloads(123)
      %Coach{user: %User{}, business: %Business{}}

      iex> get_coach_with_preloads(123, [:user])
      %Coach{user: %User{}}
  """
  def get_coach_with_preloads(id, preloads \\ [:user, :business]) do
    case get_coach_legacy(id) do
      nil -> nil
      coach -> Repo.preload(coach, preloads)
    end
  end

  @doc """
  Updates a coach with the given attributes.

  **DEPRECATED:** Use `update_coach/3` with scope parameter instead.
  This legacy function will be removed in a future version.

  ## Examples

      iex> update_coach_legacy(coach, %{bio: "Updated bio"})
      {:ok, %Coach{}}

      iex> update_coach_legacy(coach, %{status: "invalid"})
      {:error, %Ecto.Changeset{}}
  """
  def update_coach_legacy(%Coach{} = coach, attrs) do
    coach
    |> Coach.update_changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Lists all clients assigned to a coach.

  ## Parameters
    - coach_id: The coach ID

  ## Returns
    - List of clients assigned to the coach

  ## Examples

      iex> list_coach_clients(123)
      [%Client{}, %Client{}]
  """
  def list_coach_clients(coach_id) do
    case get_coach_legacy(coach_id) do
      nil ->
        []

      coach ->
        coach
        |> Repo.preload(:clients)
        |> Map.get(:clients)
    end
  end

  @doc """
  Gets a coach by user_id and business_id.

  ## Examples

      iex> get_coach_by_user_and_business(123, 456)
      %Coach{}

      iex> get_coach_by_user_and_business(999, 888)
      nil
  """
  def get_coach_by_user_and_business(user_id, business_id) do
    from(c in Coach,
      where: c.user_id == ^user_id and c.business_id == ^business_id
    )
    |> Repo.one()
  end

  @doc """
  Lists all coaches in a business.

  **DEPRECATED:** Use `list_coaches/1` with scope parameter instead.

  ## Parameters
    - business_id: The business ID

  ## Returns
    - List of coaches in the business

  ## Examples

      iex> list_business_coaches(123)
      [%Coach{}, %Coach{}]
  """
  def list_business_coaches(business_id) do
    from(c in Coach,
      where: c.business_id == ^business_id,
      order_by: [desc: c.inserted_at]
    )
    |> Repo.all()
  end

  @doc """
  Checks if a user has a coach profile in a business.

  ## Examples

      iex> coach_exists?(123, 456)
      true

      iex> coach_exists?(999, 888)
      false
  """
  def coach_exists?(user_id, business_id) do
    query =
      from c in Coach,
        where: c.user_id == ^user_id and c.business_id == ^business_id

    Repo.exists?(query)
  end

  # ============================================
  # COACH-CLIENT ASSIGNMENTS
  # ============================================

  alias Easy.Clients.CoachClientAssignment

  @doc """
  Assigns a client to a coach.

  Creates a coach-client assignment record with timestamp.
  Returns error if the assignment already exists.

  ## Parameters
    - coach_id: The coach ID
    - client_id: The client ID

  ## Returns
    - {:ok, assignment} on success
    - {:error, changeset} on validation failure or if assignment already exists

  ## Examples

      iex> assign_client(123, 456)
      {:ok, %CoachClientAssignment{}}

      iex> assign_client(123, 456)  # Already assigned
      {:error, %Ecto.Changeset{}}
  """
  def assign_client(coach_id, client_id) do
    %CoachClientAssignment{}
    |> CoachClientAssignment.changeset(%{
      coach_id: coach_id,
      client_id: client_id
    })
    |> Repo.insert()
  end

  @doc """
  Unassigns a client from a coach.

  Removes the coach-client assignment record.
  Returns error if the assignment doesn't exist.

  ## Parameters
    - coach_id: The coach ID
    - client_id: The client ID

  ## Returns
    - {:ok, assignment} on success
    - {:error, :not_found} if assignment doesn't exist

  ## Examples

      iex> unassign_client(123, 456)
      {:ok, %CoachClientAssignment{}}

      iex> unassign_client(123, 999)  # Not assigned
      {:error, :not_found}
  """
  def unassign_client(coach_id, client_id) do
    query =
      from a in CoachClientAssignment,
        where: a.coach_id == ^coach_id and a.client_id == ^client_id

    case Repo.one(query) do
      nil ->
        {:error, :not_found}

      assignment ->
        Repo.delete(assignment)
    end
  end
end
