defmodule EasyWeb.Authorization do
  import Ecto.Query
  alias Easy.Repo
  alias Easy.Auth.Scope

  def authorize_business_access(%Scope{business_id: business_id}, requested_business_id)
      when is_binary(requested_business_id) do
    if business_id == requested_business_id do
      :ok
    else
      {:error, :forbidden}
    end
  end

  def authorize_business_access(%Scope{}, _), do: {:error, :forbidden}

  def authorize_business_owner(%Scope{user_id: user_id}, business_id)
      when is_binary(business_id) do
    case Repo.get(Easy.Organizations.Business, business_id) do
      nil ->
        {:error, :not_found}

      %{owner_id: owner_id} ->
        if owner_id == user_id do
          :ok
        else
          {:error, :forbidden}
        end
    end
  end

  def user_belongs_to_business?(user, %{id: business_id, owner_id: owner_id}) do
    if owner_id == user.id do
      :ok
    else
      user_is_coach_in_business?(user.id, business_id)
    end
  end

  def user_belongs_to_business?(user, business_id) when is_integer(business_id) do
    # Load business to check ownership
    case Repo.get(Easy.Organizations.Business, business_id) do
      nil -> {:error, :not_found}
      business -> user_belongs_to_business?(user, business)
    end
  end

  def user_is_business_owner?(user, %{owner_id: owner_id}) do
    if owner_id == user.id do
      :ok
    else
      {:error, :forbidden}
    end
  end

  def user_is_business_owner?(user, business_id) when is_integer(business_id) do
    case Repo.get(Easy.Organizations.Business, business_id) do
      nil -> {:error, :not_found}
      business -> user_is_business_owner?(user, business)
    end
  end

  def authorize_coach_access(%Scope{coach_id: coach_id}, requested_coach_id)
      when is_binary(requested_coach_id) do
    if coach_id == requested_coach_id do
      :ok
    else
      {:error, :forbidden}
    end
  end

  def authorize_coach_access(%Scope{}, _), do: {:error, :forbidden}

  def authorize_coach_in_business(%Scope{business_id: business_id, coach_id: coach_id})
      when not is_nil(business_id) and not is_nil(coach_id) do
    :ok
  end

  def authorize_coach_in_business(%Scope{}), do: {:error, :forbidden}

  def user_is_coach_in_business?(%{id: user_id}, business_id) do
    user_is_coach_in_business?(user_id, business_id)
  end

  def user_is_coach_in_business?(user_id, business_id)
      when is_integer(user_id) and is_integer(business_id) do
    query =
      from c in Easy.Organizations.Coach,
        where: c.user_id == ^user_id and c.business_id == ^business_id,
        limit: 1

    if Repo.exists?(query) do
      :ok
    else
      {:error, :forbidden}
    end
  end

  @doc """
  Verifies that a coach can access a client (both belong to same business).

  ## Parameters
  - coach: The coach struct
  - client: The client struct

  ## Returns
  - `:ok` if coach can access the client
  - `{:error, :forbidden}` if coach cannot access the client

  ## Examples

      iex> coach_can_access_client?(coach, client)
      :ok

      iex> coach_can_access_client?(coach, other_business_client)
      {:error, :forbidden}
  """
  def coach_can_access_client?(%{business_id: coach_business_id}, %{
        business_id: client_business_id
      }) do
    if coach_business_id == client_business_id do
      :ok
    else
      {:error, :forbidden}
    end
  end

  @doc """
  Verifies that a user can access a coach profile.

  User can access if they:
  - Own the coach profile (user_id matches)
  - Are the business owner
  - Are another coach in the same business

  ## Parameters
  - user: The user struct
  - coach: The coach struct (must have business preloaded or business_id)

  ## Returns
  - `:ok` if user can access the coach
  - `{:error, :forbidden}` if user cannot access the coach

  ## Examples

      iex> user_can_access_coach?(coach_user, coach)
      :ok

      iex> user_can_access_coach?(business_owner, coach)
      :ok

      iex> user_can_access_coach?(other_coach, coach)
      :ok

      iex> user_can_access_coach?(unrelated_user, coach)
      {:error, :forbidden}
  """
  def user_can_access_coach?(user, %{user_id: coach_user_id, business_id: business_id}) do
    # User owns the coach profile
    if coach_user_id == user.id do
      :ok
    else
      # Check if user is business owner
      case Repo.get(Easy.Organizations.Business, business_id) do
        nil ->
          {:error, :not_found}

        %{owner_id: owner_id} when owner_id == user.id ->
          :ok

        _ ->
          # Check if user is another coach in the same business
          user_is_coach_in_business?(user.id, business_id)
      end
    end
  end

  # ============================================
  # SCOPE-BASED CLIENT AUTHORIZATION
  # ============================================

  @doc """
  Verifies that the scope has access to a specific client profile.

  This checks if the scope's client_id matches the requested client_id.
  No database query is required.

  ## Parameters
  - scope: The scope struct containing client context
  - client_id: The client ID to verify access to (UUID string)

  ## Returns
  - `:ok` if scope.client_id matches the requested client_id
  - `{:error, :forbidden}` if client_id doesn't match or scope has no client context

  ## Examples

      iex> scope = %Scope{user_id: "uuid", client_id: "client-123"}
      iex> authorize_client_access(scope, "client-123")
      :ok

      iex> scope = %Scope{user_id: "uuid", client_id: "client-123"}
      iex> authorize_client_access(scope, "client-456")
      {:error, :forbidden}

      iex> scope = %Scope{user_id: "uuid", client_id: nil}
      iex> authorize_client_access(scope, "client-123")
      {:error, :forbidden}
  """
  def authorize_client_access(%Scope{client_id: client_id}, requested_client_id)
      when is_binary(requested_client_id) do
    if client_id == requested_client_id do
      :ok
    else
      {:error, :forbidden}
    end
  end

  def authorize_client_access(%Scope{}, _), do: {:error, :forbidden}

  @doc """
  Verifies that the scope has an active client profile in a business.

  This checks if the scope has both a business_id and a client_id set.
  No database query is required.

  ## Parameters
  - scope: The scope struct containing business and client context

  ## Returns
  - `:ok` if scope has both business_id and client_id
  - `{:error, :forbidden}` if scope is missing business or client context

  ## Examples

      iex> scope = %Scope{user_id: "uuid", business_id: "biz-123", client_id: "client-123"}
      iex> authorize_client_in_business(scope)
      :ok

      iex> scope = %Scope{user_id: "uuid", business_id: "biz-123", client_id: nil}
      iex> authorize_client_in_business(scope)
      {:error, :forbidden}

      iex> scope = %Scope{user_id: "uuid", business_id: nil, client_id: "client-123"}
      iex> authorize_client_in_business(scope)
      {:error, :forbidden}
  """
  def authorize_client_in_business(%Scope{business_id: business_id, client_id: client_id})
      when not is_nil(business_id) and not is_nil(client_id) do
    :ok
  end

  def authorize_client_in_business(%Scope{}), do: {:error, :forbidden}

  # ============================================
  # SCOPE-BASED CROSS-ENTITY AUTHORIZATION
  # ============================================

  @doc """
  Verifies that a coach can access a specific client (both in same business).

  This checks if the scope has a coach_id and verifies the client belongs to
  the same business. Requires a database query to fetch the client's business_id.

  ## Parameters
  - scope: The scope struct containing coach and business context
  - client_id: The client ID to verify access to (UUID string)

  ## Returns
  - `:ok` if scope has coach_id and client belongs to scope's business
  - `{:error, :forbidden}` if scope has no coach context or client is in different business
  - `{:error, :not_found}` if client doesn't exist

  ## Examples

      iex> scope = %Scope{user_id: "uuid", business_id: "biz-123", coach_id: "coach-123"}
      iex> authorize_coach_client_access(scope, "client-123")
      :ok

      iex> scope = %Scope{user_id: "uuid", business_id: "biz-123", coach_id: nil}
      iex> authorize_coach_client_access(scope, "client-123")
      {:error, :forbidden}
  """
  def authorize_coach_client_access(
        %Scope{business_id: business_id, coach_id: coach_id},
        client_id
      )
      when is_binary(client_id) and not is_nil(business_id) and not is_nil(coach_id) do
    case Repo.get(Easy.Clients.Client, client_id) do
      nil ->
        {:error, :not_found}

      %{business_id: client_business_id} ->
        if client_business_id == business_id do
          :ok
        else
          {:error, :forbidden}
        end
    end
  end

  def authorize_coach_client_access(%Scope{}, _), do: {:error, :forbidden}

  # ============================================
  # LEGACY CLIENT AUTHORIZATION
  # ============================================

  @doc """
  Verifies that a user is a client (has a client profile).

  ## Parameters
  - user: The user struct (must have client association preloaded)

  ## Returns
  - `:ok` if user has a client profile
  - `{:error, :forbidden}` if user does not have a client profile

  ## Examples

      iex> user_is_client?(client_user)
      :ok

      iex> user_is_client?(coach_only_user)
      {:error, :forbidden}
  """
  def user_is_client?(%{client: %Easy.Clients.Client{}}), do: :ok
  def user_is_client?(_), do: {:error, :forbidden}

  @doc """
  Verifies that a client belongs to a specific business.

  ## Parameters
  - client: The client struct
  - business_id: The business ID

  ## Returns
  - `:ok` if client belongs to the business
  - `{:error, :forbidden}` if client does not belong to the business

  ## Examples

      iex> client_belongs_to_business?(client, business_id)
      :ok

      iex> client_belongs_to_business?(client, other_business_id)
      {:error, :forbidden}
  """
  def client_belongs_to_business?(%{business_id: client_business_id}, business_id) do
    if client_business_id == business_id do
      :ok
    else
      {:error, :forbidden}
    end
  end

  @doc """
  Verifies that a user can access a client.

  User can access if they:
  - Are the client themselves (user_id matches)
  - Are a coach in the same business as the client

  ## Parameters
  - user: The user struct
  - client: The client struct

  ## Returns
  - `:ok` if user can access the client
  - `{:error, :forbidden}` if user cannot access the client

  ## Examples

      iex> user_can_access_client?(client_user, client)
      :ok

      iex> user_can_access_client?(coach_user, client)
      :ok

      iex> user_can_access_client?(unrelated_user, client)
      {:error, :forbidden}
  """
  # Handle case where client doesn't have a user_id yet (pending invitation)
  def user_can_access_client?(user, %{user_id: nil, business_id: business_id}) do
    # Only coaches in the business can access pending clients
    user_is_coach_in_business?(user.id, business_id)
  end

  def user_can_access_client?(user, %{user_id: client_user_id, business_id: business_id}) do
    # User is the client
    if client_user_id == user.id do
      :ok
    else
      # User is a coach in the same business
      user_is_coach_in_business?(user.id, business_id)
    end
  end
end
