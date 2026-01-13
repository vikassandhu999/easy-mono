defmodule Easy.Identity.User do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users" do
    field :first_name, :string, default: ""
    field :last_name, :string, default: ""

    field :email, :string
    field :email_confirmed_at, :utc_datetime

    field :phone, :string
    field :phone_confirmed_at, :utc_datetime

    field :confirmation_sent_at, :utc_datetime
    field :last_sign_in_at, :utc_datetime

    timestamps()
  end
end
