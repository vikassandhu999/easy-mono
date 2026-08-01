defmodule Easy.Ctx do
  @enforce_keys [:business_id, :user_id]
  defstruct [:business_id, :user_id, :coach_id, :client_id, owner?: false]

  @type t :: %__MODULE__{
          business_id: Ecto.UUID.t(),
          user_id: Ecto.UUID.t(),
          coach_id: Ecto.UUID.t() | nil,
          client_id: Ecto.UUID.t() | nil,
          owner?: boolean()
        }

  @spec new(Ecto.UUID.t(), Ecto.UUID.t()) :: t()
  def new(business_id, user_id) do
    %__MODULE__{business_id: business_id, user_id: user_id}
  end

  @spec new(Ecto.UUID.t(), Ecto.UUID.t(), Ecto.UUID.t() | nil, boolean()) :: t()
  def new(business_id, user_id, coach_id, owner?) do
    %__MODULE__{business_id: business_id, user_id: user_id, coach_id: coach_id, owner?: owner?}
  end

  @spec fetch_client_id(t()) :: {:ok, Ecto.UUID.t()} | {:error, :not_found}
  def fetch_client_id(%__MODULE__{client_id: client_id}) when not is_nil(client_id), do: {:ok, client_id}
  def fetch_client_id(%__MODULE__{}), do: {:error, :not_found}
end
