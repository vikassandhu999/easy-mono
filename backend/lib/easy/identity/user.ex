defmodule Easy.Identity.User do
  use Ecto.Schema
  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users" do
    field :first_name, :string, default: ""
    field :last_name, :string, default: ""

    field :email, :string
    field :email_confirmed_at, :utc_datetime

    field :confirmation_sent_at, :utc_datetime
    field :last_sign_in_at, :utc_datetime

    timestamps()
  end

  def changeset(%Easy.Identity.User{} = user, attrs) do
    user
    |> cast(attrs, [
      :email,
      :first_name,
      :last_name,
      :confirmation_sent_at
    ])
    |> validate_required([:email])
    |> validate_format(
      :email,
      ~r/^[\w.!#$%&'*+=?^`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    )
    |> validate_length(:first_name, max: 255)
    |> validate_length(:last_name, max: 255)
    |> unique_constraint(:email)
  end

  def confirm_email(%__MODULE__{} = user) do
    user
    |> change(%{email_confirmed_at: DateTime.utc_now(:second)})
  end

  def is_confirmation_expired?(%__MODULE__{confirmation_sent_at: nil}), do: true

  def is_confirmation_expired?(%__MODULE__{confirmation_sent_at: sent_at}) do
    otp_validity_minutes = 10

    DateTime.diff(DateTime.utc_now(:second), sent_at, :minute) > otp_validity_minutes
  end

  def is_email_confirmed?(%__MODULE__{email_confirmed_at: nil}), do: false
  def is_email_confirmed?(%__MODULE__{email_confirmed_at: _}), do: true

  def full_name(%__MODULE__{first_name: first_name, last_name: last_name}) do
    String.trim("#{first_name} #{last_name}")
  end
end
