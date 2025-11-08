defmodule Easy.Auth.Scope do
  @moduledoc """
  Represents the authenticated actor and their authorization context.

  The scope contains the user's identity and their active role context
  (business, coach, client) for the current session. This struct is
  constructed from JWT claims and used throughout the application for
  authorization decisions.

  ## Fields

    * `:user_id` - UUID of the authenticated user (required)
    * `:business_id` - UUID of the active business context (optional)
    * `:coach_id` - UUID of the coach profile if user is acting as coach (optional)
    * `:client_id` - UUID of the client profile if user is acting as client (optional)
    * `:roles` - List of active roles (e.g., ["coach"], ["client"], or ["coach", "client"])

  ## Examples

      # Coach in a business
      %Scope{
        user_id: "user-uuid",
        business_id: "business-uuid",
        coach_id: "coach-uuid",
        roles: ["coach"]
      }

      # User with both coach and client roles in same business
      %Scope{
        user_id: "user-uuid",
        business_id: "business-uuid",
        coach_id: "coach-uuid",
        client_id: "client-uuid",
        roles: ["coach", "client"]
      }

      # New user without business context
      %Scope{
        user_id: "user-uuid",
        roles: []
      }
  """

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

  @doc """
  Constructs a Scope struct from JWT claims.

  Extracts the user identity and business context from the token claims
  and builds a scope struct that can be used for authorization decisions.

  ## Parameters

    * `claims` - Map of JWT claims containing user and context information

  ## Returns

    * `{:ok, %Scope{}}` - Successfully constructed scope
    * `{:error, :invalid_claims}` - Missing required claims or invalid format

  ## Examples

      iex> claims = %{
      ...>   "sub" => "user-uuid",
      ...>   "roles" => ["coach"],
      ...>   "business_id" => "business-uuid",
      ...>   "coach_id" => "coach-uuid"
      ...> }
      iex> Scope.from_claims(claims)
      {:ok, %Scope{
        user_id: "user-uuid",
        business_id: "business-uuid",
        coach_id: "coach-uuid",
        roles: ["coach"]
      }}

      iex> Scope.from_claims(%{})
      {:error, :invalid_claims}
  """
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

  @doc """
  Checks if the scope represents a coach actor.

  Returns true if the scope has the "coach" role.

  ## Examples

      iex> scope = %Scope{user_id: "uuid", roles: ["coach"]}
      iex> Scope.is_coach?(scope)
      true

      iex> scope = %Scope{user_id: "uuid", roles: ["client"]}
      iex> Scope.is_coach?(scope)
      false
  """
  def is_coach?(%__MODULE__{roles: roles}) do
    "coach" in roles
  end

  @doc """
  Checks if the scope represents a client actor.

  Returns true if the scope has the "client" role.

  ## Examples

      iex> scope = %Scope{user_id: "uuid", roles: ["client"]}
      iex> Scope.is_client?(scope)
      true

      iex> scope = %Scope{user_id: "uuid", roles: ["coach"]}
      iex> Scope.is_client?(scope)
      false
  """
  def is_client?(%__MODULE__{roles: roles}) do
    "client" in roles
  end

  @doc """
  Checks if the scope has a business context.

  Returns true if the scope has a business_id set.

  ## Examples

      iex> scope = %Scope{user_id: "uuid", business_id: "business-uuid"}
      iex> Scope.has_business_context?(scope)
      true

      iex> scope = %Scope{user_id: "uuid", business_id: nil}
      iex> Scope.has_business_context?(scope)
      false
  """
  def has_business_context?(%__MODULE__{business_id: business_id}) do
    not is_nil(business_id)
  end

  @doc """
  Checks if the scope can act as a coach.

  Returns true if the scope has both the "coach" role and a coach_id.

  ## Examples

      iex> scope = %Scope{user_id: "uuid", coach_id: "coach-uuid", roles: ["coach"]}
      iex> Scope.can_act_as_coach?(scope)
      true

      iex> scope = %Scope{user_id: "uuid", coach_id: nil, roles: ["coach"]}
      iex> Scope.can_act_as_coach?(scope)
      false
  """
  def can_act_as_coach?(%__MODULE__{coach_id: coach_id, roles: roles}) do
    not is_nil(coach_id) and "coach" in roles
  end

  @doc """
  Checks if the scope can act as a client.

  Returns true if the scope has both the "client" role and a client_id.

  ## Examples

      iex> scope = %Scope{user_id: "uuid", client_id: "client-uuid", roles: ["client"]}
      iex> Scope.can_act_as_client?(scope)
      true

      iex> scope = %Scope{user_id: "uuid", client_id: nil, roles: ["client"]}
      iex> Scope.can_act_as_client?(scope)
      false
  """
  def can_act_as_client?(%__MODULE__{client_id: client_id, roles: roles}) do
    not is_nil(client_id) and "client" in roles
  end

  # Private helper functions

  defp extract_user_id(%{"sub" => user_id}) when is_binary(user_id) and user_id != "" do
    {:ok, user_id}
  end

  defp extract_user_id(_), do: {:error, :invalid_claims}

  defp extract_roles(%{"roles" => roles}) when is_list(roles) do
    {:ok, roles}
  end

  defp extract_roles(_), do: {:ok, []}
end
