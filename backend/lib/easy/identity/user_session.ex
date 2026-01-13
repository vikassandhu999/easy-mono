defmodule Easy.Identity.UserSession do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "user_sessions" do
    field :ip, :string
    field :user_agent, :string
    field :expires_at, :utc_datetime
    field :revoked_at, :utc_datetime
    field :refresh_token, :string
    field :refreshed_at, :utc_datetime

    # TODO: Change this to belongs_to association.
    field :business_id, :binary_id
    field :business_role, Ecto.Enum, values: [:owner, :coach, :client]

    belongs_to :user, Easy.Identity.User

    timestamps()
  end
end
