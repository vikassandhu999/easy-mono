defmodule Easy.Ctx do
  @enforce_keys [:business_id, :user_id]

  defstruct business_id: nil,
            user_id: nil,
            role: nil,
            client_id: nil,
            coach_id: nil

  @type t :: %__MODULE__{
          business_id: Ecto.UUID.t(),
          user_id: Ecto.UUID.t(),
          role: atom() | nil,
          client_id: Ecto.UUID.t(),
          coach_id: Ecto.UUID.t()
        }

  @spec new(Ecto.UUID.t(), Ecto.UUID.t(), keyword()) :: t()
  def new(business_id, user_id, opts \\ []) do
    opts
    |> Keyword.merge(business_id: business_id, user_id: user_id)
    |> then(&struct!(__MODULE__, &1))
  end
end
