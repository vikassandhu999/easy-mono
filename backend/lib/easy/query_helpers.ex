defmodule Easy.QueryHelpers do
  import Ecto.Query, warn: false
  alias Easy.Auth.Scope

  def scope_to_business(query, %Scope{business_id: business_id})
      when not is_nil(business_id) do
    from q in query, where: q.business_id == ^business_id
  end

  def scope_to_business(query, %Scope{}), do: query

  def scope_to_coach(query, %Scope{coach_id: coach_id}) when not is_nil(coach_id) do
    from q in query, where: q.coach_id == ^coach_id
  end

  def scope_to_coach(query, %Scope{}), do: query

  def scope_to_client(query, %Scope{client_id: client_id}) when not is_nil(client_id) do
    from q in query, where: q.client_id == ^client_id
  end

  def scope_to_client(query, %Scope{}), do: query
end
