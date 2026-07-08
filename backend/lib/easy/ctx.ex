defmodule Easy.Ctx do
  @enforce_keys [:business_id, :user_id]
  defstruct [:business_id, :user_id, :coach_id, owner?: false]

  @type t :: %__MODULE__{
          business_id: Ecto.UUID.t(),
          user_id: Ecto.UUID.t(),
          coach_id: Ecto.UUID.t() | nil,
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
end
