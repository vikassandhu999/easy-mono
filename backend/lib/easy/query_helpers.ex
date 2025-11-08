defmodule Easy.QueryHelpers do
  @moduledoc """
  Query helpers for applying scope-based filters to Ecto queries.

  This module provides composable query functions that automatically apply
  business context filters based on the scope struct. These helpers ensure
  proper tenant isolation and prevent data leakage between businesses.

  ## Usage

      import Ecto.Query
      alias Easy.QueryHelpers

      # Filter coaches by business_id from scope
      query = from(c in Coach)
      query = QueryHelpers.scope_to_business(query, scope)

      # Filter by coach_id from scope
      query = QueryHelpers.scope_to_coach(query, scope)

      # Filter by client_id from scope
      query = QueryHelpers.scope_to_client(query, scope)

  ## Design Rationale

  These helpers provide a consistent way to apply scope-based filters across
  all context modules. They:

  1. Ensure tenant isolation by automatically filtering by business_id
  2. Support role-based filtering (coach_id, client_id)
  3. Are composable - can be chained together
  4. Return the query unchanged if the scope doesn't have the required context
  5. Work with any Ecto schema that has the corresponding fields
  """

  import Ecto.Query, warn: false
  alias Easy.Auth.Scope

  @doc """
  Adds a business_id filter to the query based on the scope.

  Filters the query to only include records where the business_id matches
  the business_id from the scope. This ensures proper tenant isolation.

  If the scope doesn't have a business_id, the query is returned unchanged.

  ## Parameters

    * `query` - An Ecto query
    * `scope` - The scope struct containing business context

  ## Returns

    * The filtered query

  ## Examples

      iex> query = from(c in Coach)
      iex> scope = %Scope{user_id: "uuid", business_id: "business-uuid"}
      iex> QueryHelpers.scope_to_business(query, scope)
      #Ecto.Query<from c0 in Coach, where: c0.business_id == ^"business-uuid">

      iex> query = from(c in Client)
      iex> scope = %Scope{user_id: "uuid", business_id: nil}
      iex> QueryHelpers.scope_to_business(query, scope)
      #Ecto.Query<from c0 in Client>
  """
  def scope_to_business(query, %Scope{business_id: business_id})
      when not is_nil(business_id) do
    from q in query, where: q.business_id == ^business_id
  end

  def scope_to_business(query, %Scope{}), do: query

  @doc """
  Adds a coach_id filter to the query based on the scope.

  Filters the query to only include records where the coach_id matches
  the coach_id from the scope. This is useful for queries that need to
  filter by the acting coach.

  If the scope doesn't have a coach_id, the query is returned unchanged.

  ## Parameters

    * `query` - An Ecto query
    * `scope` - The scope struct containing coach context

  ## Returns

    * The filtered query

  ## Examples

      iex> query = from(a in Assignment)
      iex> scope = %Scope{user_id: "uuid", coach_id: "coach-uuid"}
      iex> QueryHelpers.scope_to_coach(query, scope)
      #Ecto.Query<from a0 in Assignment, where: a0.coach_id == ^"coach-uuid">

      iex> query = from(a in Assignment)
      iex> scope = %Scope{user_id: "uuid", coach_id: nil}
      iex> QueryHelpers.scope_to_coach(query, scope)
      #Ecto.Query<from a0 in Assignment>
  """
  def scope_to_coach(query, %Scope{coach_id: coach_id}) when not is_nil(coach_id) do
    from q in query, where: q.coach_id == ^coach_id
  end

  def scope_to_coach(query, %Scope{}), do: query

  @doc """
  Adds a client_id filter to the query based on the scope.

  Filters the query to only include records where the client_id matches
  the client_id from the scope. This is useful for queries that need to
  filter by the acting client.

  If the scope doesn't have a client_id, the query is returned unchanged.

  ## Parameters

    * `query` - An Ecto query
    * `scope` - The scope struct containing client context

  ## Returns

    * The filtered query

  ## Examples

      iex> query = from(a in Assignment)
      iex> scope = %Scope{user_id: "uuid", client_id: "client-uuid"}
      iex> QueryHelpers.scope_to_client(query, scope)
      #Ecto.Query<from a0 in Assignment, where: a0.client_id == ^"client-uuid">

      iex> query = from(a in Assignment)
      iex> scope = %Scope{user_id: "uuid", client_id: nil}
      iex> QueryHelpers.scope_to_client(query, scope)
      #Ecto.Query<from a0 in Assignment>
  """
  def scope_to_client(query, %Scope{client_id: client_id}) when not is_nil(client_id) do
    from q in query, where: q.client_id == ^client_id
  end

  def scope_to_client(query, %Scope{}), do: query
end
