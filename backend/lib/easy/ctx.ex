defmodule Easy.Ctx do
  @enforce_keys [:business_id, :user_id]
  defstruct [:business_id, :user_id]

  @type t :: %__MODULE__{
          business_id: Ecto.UUID.t(),
          user_id: Ecto.UUID.t()
        }

  @spec new(Ecto.UUID.t(), Ecto.UUID.t()) :: t()
  def new(business_id, user_id) do
    %__MODULE__{business_id: business_id, user_id: user_id}
  end
end
