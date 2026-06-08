defmodule Easy.Identity.OneTimeToken do
  use Ecto.Schema

  alias Easy.Identity.{User}

  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @token_types [
    :email_confirmation,
    :authentication,
    :invitation_acceptance
  ]

  schema "one_time_tokens" do
    field :token_hash, :string
    field :token_type, Ecto.Enum, values: @token_types
    field :relates_to, :string

    belongs_to :user, User

    timestamps()
  end

  def changeset(attrs) do
    %__MODULE__{}
    |> cast(
      attrs,
      [:token_type, :token_hash, :relates_to, :user_id]
    )
  end
end
