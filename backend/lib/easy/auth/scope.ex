defmodule Easy.Auth.Scope do
  @enforce_keys [:user_id]
  defstruct [
    :user_id,
    :business_id,
    :coach_id,
    :client_id,
    roles: []
  ]

  @type t :: %__MODULE__{
          user_id: String.t(),
          business_id: String.t() | nil,
          coach_id: String.t() | nil,
          client_id: String.t() | nil,
          roles: [String.t()]
        }

  def from_claims(claims) when is_map(claims) do
    with {:ok, user_id} <- extract_user_id(claims),
         {:ok, roles} <- extract_roles(claims) do
      scope = %__MODULE__{
        user_id: user_id,
        business_id: Map.get(claims, "business_id"),
        coach_id: Map.get(claims, "coach_id"),
        client_id: Map.get(claims, "client_id"),
        roles: roles
      }

      {:ok, scope}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def from_claims(_), do: {:error, :invalid_claims}

  def is_coach?(%__MODULE__{roles: roles}) do
    "coach" in roles
  end

  def is_client?(%__MODULE__{roles: roles}) do
    "client" in roles
  end

  def has_business_context?(%__MODULE__{business_id: business_id}) do
    not is_nil(business_id)
  end

  def can_act_as_coach?(%__MODULE__{coach_id: coach_id, roles: roles}) do
    not is_nil(coach_id) and "coach" in roles
  end

  def can_act_as_client?(%__MODULE__{client_id: client_id, roles: roles}) do
    not is_nil(client_id) and "client" in roles
  end

  defp extract_user_id(%{"sub" => user_id}) when is_binary(user_id) and user_id != "" do
    {:ok, user_id}
  end

  defp extract_user_id(_), do: {:error, :invalid_claims}

  defp extract_roles(%{"roles" => roles}) when is_list(roles) do
    {:ok, roles}
  end

  defp extract_roles(_), do: {:ok, []}
end
