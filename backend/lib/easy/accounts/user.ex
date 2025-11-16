defmodule Easy.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users" do
    field :email, :string
    field :first_name, :string
    field :last_name, :string
    field :email_verified, :boolean, default: false
    field :email_verified_at, :utc_datetime

    has_one :coach, Easy.Organizations.Coach
    has_one :client, Easy.Clients.Client
    has_many :sessions, Easy.Accounts.Session
    has_many :one_time_tokens, Easy.Accounts.OneTimeToken

    timestamps()
  end

  def changeset(user, attrs) do
    user
    |> cast(attrs, [:email, :first_name, :last_name, :email_verified, :email_verified_at])
    |> validate_required([:email])
    |> validate_email()
    |> unique_constraint(:email)
  end

  def registration_changeset(user, attrs) do
    user
    |> cast(attrs, [:email, :first_name, :last_name])
    |> validate_required([:email])
    |> validate_email()
    |> put_change(:email_verified, false)
    |> unique_constraint(:email)
  end

  def verify_email_changeset(user) do
    user
    |> change()
    |> put_change(:email_verified, true)
    |> put_change(:email_verified_at, DateTime.utc_now() |> DateTime.truncate(:second))
  end

  defp validate_email(changeset) do
    changeset
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email address")
    |> validate_length(:email, max: 255)
    |> update_change(:email, &String.downcase/1)
  end
end
