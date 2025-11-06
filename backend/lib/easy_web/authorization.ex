defmodule EasyWeb.Authorization do
  @moduledoc """
  Authorization helpers for verifying user permissions across the application.

  This module provides centralized authorization logic for:
  - Business access control
  - Coach access control
  - Client access control

  All functions return `:ok` on success or `{:error, reason}` on failure.
  """

  import Ecto.Query
  alias Easy.Repo

  # ============================================
  # BUSINESS AUTHORIZATION
  # ============================================

  @doc """
  Verifies that a user belongs to a business (as owner or coach).

  ## Parameters
  - user: The user struct
  - business: The business struct or business_id

  ## Returns
  - `:ok` if user belongs to the business
  - `{:error, :forbidden}` if user does not belong to the business

  ## Examples

      iex> user_belongs_to_business?(user, business)
      :ok

      iex> user_belongs_to_business?(user, other_business)
      {:error, :forbidden}
  """
  def user_belongs_to_business?(user, %{id: business_id, owner_id: owner_id}) do
    # User is owner
    if owner_id == user.id do
      :ok
    else
      # User is a coach in the business
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

  @doc """
  Verifies that a user is the owner of a business.

  ## Parameters
  - user: The user struct
  - business: The business struct or business_id

  ## Returns
  - `:ok` if user is the business owner
  - `{:error, :forbidden}` if user is not the business owner

  ## Examples

      iex> user_is_business_owner?(owner_user, business)
      :ok

      iex> user_is_business_owner?(coach_user, business)
      {:error, :forbidden}
  """
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

  # ============================================
  # COACH AUTHORIZATION
  # ============================================

  @doc """
  Verifies that a user is a coach in a specific business.

  ## Parameters
  - user: The user struct or user_id
  - business_id: The business ID

  ## Returns
  - `:ok` if user is a coach in the business
  - `{:error, :forbidden}` if user is not a coach in the business

  ## Examples

      iex> user_is_coach_in_business?(coach_user, business_id)
      :ok

      iex> user_is_coach_in_business?(other_user, business_id)
      {:error, :forbidden}
  """
  def user_is_coach_in_business?(%{id: user_id}, business_id) do
    user_is_coach_in_business?(user_id, business_id)
  end

  def user_is_coach_in_business?(user_id, business_id)
      when is_integer(user_id) and is_integer(business_id) do
    query =
      from c in Easy.Coaches.Coach,
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
  # CLIENT AUTHORIZATION
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
