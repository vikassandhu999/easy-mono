defmodule Easy.Coaches do
  @moduledoc """
  Coaches context handles coach profile management.

  This is the public API for:
  - Coach CRUD operations
  - Coach-client assignments
  - Coach queries
  """

  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Coaches.Coach
  alias Easy.Accounts.User
  alias Easy.Organizations.Business

  # ============================================
  # COACH MANAGEMENT
  # ============================================

  @doc """
  Creates a coach profile for a user within a business.

  ## Parameters
    - user: The user struct or user_id
    - business: The business struct or business_id
    - attrs: Map of coach attributes (bio, specialties, credentials, status)

  ## Returns
    - {:ok, coach} on success
    - {:error, changeset} on validation failure

  ## Examples

      iex> create_coach(user, business, %{bio: "Experienced coach"})
      {:ok, %Coach{}}

      iex> create_coach(user, business, %{status: "invalid"})
      {:error, %Ecto.Changeset{}}
  """
  def create_coach(%User{id: user_id}, %Business{id: business_id}, attrs) do
    create_coach(user_id, business_id, attrs)
  end

  def create_coach(user_id, business_id, attrs) do
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

  ## Examples

      iex> get_coach(123)
      %Coach{}

      iex> get_coach(999)
      nil
  """
  def get_coach(id), do: Repo.get(Coach, id)

  @doc """
  Gets a coach by ID and preloads associations.

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
    case get_coach(id) do
      nil -> nil
      coach -> Repo.preload(coach, preloads)
    end
  end

  @doc """
  Updates a coach with the given attributes.

  ## Examples

      iex> update_coach(coach, %{bio: "Updated bio"})
      {:ok, %Coach{}}

      iex> update_coach(coach, %{status: "invalid"})
      {:error, %Ecto.Changeset{}}
  """
  def update_coach(%Coach{} = coach, attrs) do
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
    case get_coach(coach_id) do
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
