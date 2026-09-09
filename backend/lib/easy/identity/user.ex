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

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(DateTime.t() | nil, map()) :: Ecto.Changeset.t()
  def insert_changeset(confirmation_sent_at \\ nil, attrs) do
    %__MODULE__{}
    |> cast(attrs, [
      :email,
      :first_name,
      :last_name
    ])
    |> put_change(:confirmation_sent_at, confirmation_sent_at)
    |> validate_required([:email])
    |> validate_format(
      :email,
      ~r/^[\w.!#$%&'*+=?^`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    )
    |> validate_length(:first_name, max: 255)
    |> validate_length(:last_name, max: 255)
    |> unique_constraint(:email)
  end

  @spec confirm_email(t(), DateTime.t()) :: Ecto.Changeset.t()
  def confirm_email(%__MODULE__{} = user, confirmed_at) do
    user
    |> change(%{email_confirmed_at: confirmed_at})
  end

  @spec touch_confirmation_sent(t(), DateTime.t()) :: Ecto.Changeset.t()
  def touch_confirmation_sent(%__MODULE__{} = user, sent_at) do
    user
    |> change(%{confirmation_sent_at: sent_at})
  end

  @spec email_confirmed?(t()) :: boolean()
  def email_confirmed?(%__MODULE__{email_confirmed_at: nil}), do: false
  def email_confirmed?(%__MODULE__{email_confirmed_at: _}), do: true
end
