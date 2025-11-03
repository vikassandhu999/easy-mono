alias Ecto.UUID

defmodule Easy.Identity.Session do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, UUID, autogenerate: true}
  @foreign_key_type UUID

  schema "user_sessions" do
    field :refresh_token, :string
    field :refreshed_at, :utc_datetime
    field :revoked_at, :utc_datetime

    field :user_agent, :string
    field :ip, :string

    belongs_to :user, Easy.Identity.User, foreign_key: :user_id
  end

  def changeset(session, attrs) do
    session
    |> cast(attrs, [
      :user_id,
      :refresh_token,
      :refreshed_at,
      :revoked_at,
      :user_agent,
      :ip
    ])
    |> validate_required([:user_id, :refresh_token])
    |> foreign_key_constraint(:user_id)
  end
end
