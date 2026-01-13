defmodule Easy.Identity.OneTimeToken do
  use Ecto.Schema

  alias Easy.Identity.{User}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @token_types [
    :email_confirmation,
    :phone_confirmation,
    :authentication
  ]

  schema "one_time_tokens" do
    field :token_hash, :string
    field :token_type, Ecto.Enum, values: @token_types
    field :expires_at, :utc_datetime
    field :relates_to, :string

    belongs_to :user, User

    timestamps()
  end
end
