defmodule Easy.Auth.Scope do
  import Ecto.Query, warn: false
  alias Easy.Repo
  alias Easy.Organizations.{Business, Subscription}

  @enforce_keys [:user_id]
  defstruct [
    :user_id,
    :business_id,
    :coach_id,
    :client_id,
    roles: [],
    # Lazy-loaded fields (nil by default)
    _business: nil,
    _subscription: nil
  ]

  @type t :: %__MODULE__{
          user_id: String.t(),
          business_id: String.t() | nil,
          coach_id: String.t() | nil,
          client_id: String.t() | nil,
          roles: [String.t()],
          _business: Business.t() | nil,
          _subscription: Subscription.t() | nil
        }

  @spec from_claims(map()) :: {:ok, t()} | {:error, term()}
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

  @spec with_business(t()) :: t()
  def with_business(%__MODULE__{_business: nil, business_id: business_id} = scope)
      when not is_nil(business_id) do
    business =
      from(b in Business,
        where: b.id == ^business_id,
        preload: [:subscription]
      )
      |> Repo.one()

    %{scope | _business: business}
  end

  def with_business(scope), do: scope

  @spec with_subscription(t()) :: t()
  def with_subscription(%__MODULE__{_subscription: nil, business_id: business_id} = scope)
      when not is_nil(business_id) do
    subscription =
      from(s in Subscription,
        where: s.business_id == ^business_id and s.status in ["active", "trial"],
        preload: [:plan],
        limit: 1
      )
      |> Repo.one()

    %{scope | _subscription: subscription}
  end

  def with_subscription(scope), do: scope

  @spec is_coach?(t()) :: boolean()
  def is_coach?(%__MODULE__{roles: roles}) do
    "coach" in roles
  end

  @spec is_client?(t()) :: boolean()
  def is_client?(%__MODULE__{roles: roles}) do
    "client" in roles
  end

  @spec has_business_context?(t()) :: boolean()
  def has_business_context?(%__MODULE__{business_id: business_id}) do
    not is_nil(business_id)
  end

  @spec can_act_as_coach?(t()) :: boolean()
  def can_act_as_coach?(%__MODULE__{coach_id: coach_id, roles: roles}) do
    not is_nil(coach_id) and "coach" in roles
  end

  @spec can_act_as_client?(t()) :: boolean()
  def can_act_as_client?(%__MODULE__{client_id: client_id, roles: roles}) do
    not is_nil(client_id) and "client" in roles
  end

  @spec can?(t(), :create_client | :create_coach) :: boolean()
  def can?(%__MODULE__{business_id: nil}, _action), do: false

  def can?(scope, :create_client) do
    scope = with_subscription(scope)
    subscription_active?(scope) and within_limit?(scope, :max_clients)
  end

  def can?(scope, :create_coach) do
    scope = with_subscription(scope)
    subscription_active?(scope) and within_limit?(scope, :max_coaches)
  end

  @spec subscription_status(t()) ::
          :active | :trial | :trial_expired | :cancelled | :expired | :unknown
  def subscription_status(%__MODULE__{business_id: nil}), do: :unknown

  def subscription_status(scope) do
    scope = with_subscription(scope)

    case scope._subscription do
      nil -> :unknown
      sub -> Subscription.status_atom(sub)
    end
  end

  @spec subscription_active?(t()) :: boolean()
  def subscription_active?(scope) do
    subscription_status(scope) in [:active, :trial]
  end

  @spec within_limit?(t(), :max_coaches | :max_clients) :: boolean()
  def within_limit?(%__MODULE__{business_id: nil}, _limit_type), do: false

  def within_limit?(scope, limit_type) do
    scope = with_subscription(scope)

    case scope._subscription do
      nil ->
        false

      sub ->
        Easy.Organizations.subscription_within_limits?(sub, limit_type)
    end
  end

  @spec require_role!(t(), String.t() | [String.t()]) :: :ok | no_return()
  def require_role!(scope, role) when is_binary(role) do
    if role in scope.roles do
      :ok
    else
      raise Easy.Error,
        status: :forbidden,
        code: "insufficient_permissions",
        message: "Required role: #{role}"
    end
  end

  def require_role!(scope, roles) when is_list(roles) do
    if Enum.any?(roles, &(&1 in scope.roles)) do
      :ok
    else
      raise Easy.Error,
        status: :forbidden,
        code: "insufficient_permissions",
        message: "Required one of roles: #{Enum.join(roles, ", ")}"
    end
  end

  @spec require_business!(t()) :: :ok | no_return()
  def require_business!(%__MODULE__{business_id: nil}) do
    raise Easy.Error,
      status: :forbidden,
      code: "no_business_context",
      message: "This action requires a business context"
  end

  def require_business!(_scope), do: :ok

  @spec require_subscription!(t(), [:active | :trial]) :: :ok | no_return()
  def require_subscription!(scope, allowed_statuses \\ [:active, :trial]) do
    status = subscription_status(scope)

    if status in allowed_statuses do
      :ok
    else
      raise Easy.Error,
        status: :payment_required,
        code: "subscription_inactive",
        message: "Active subscription required. Current status: #{status}"
    end
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
