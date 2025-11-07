defmodule Easy.Accounts.User do
  @moduledoc """
  User schema for the coaching platform.

  Users are authenticated via OTP and can have coach and/or client profiles.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users" do
    field :email, :string
    field :full_name, :string
    field :email_verified, :boolean, default: false
    field :email_verified_at, :utc_datetime

    has_one :coach, Easy.Coaches.Coach
    has_one :client, Easy.Clients.Client
    has_many :sessions, Easy.Accounts.Session
    has_many :one_time_tokens, Easy.Accounts.OneTimeToken

    timestamps()
  end

  @doc """
  Changeset for creating or updating a user.
  Validates email format, required fields, and unique email constraint.
  """
  def changeset(user, attrs) do
    user
    |> cast(attrs, [:email, :full_name, :email_verified, :email_verified_at])
    |> validate_required([:email, :full_name])
    |> validate_email()
    |> unique_constraint(:email)
  end

  @doc """
  Changeset for user registration.
  Only requires email and full_name, sets email_verified to false.
  """
  def registration_changeset(user, attrs) do
    user
    |> cast(attrs, [:email, :full_name])
    |> validate_required([:email, :full_name])
    |> validate_email()
    |> put_change(:email_verified, false)
    |> unique_constraint(:email)
  end

  @doc """
  Changeset for marking email as verified.
  Sets email_verified to true and email_verified_at to current timestamp.
  """
  def verify_email_changeset(user) do
    user
    |> change()
    |> put_change(:email_verified, true)
    |> put_change(:email_verified_at, DateTime.utc_now() |> DateTime.truncate(:second))
  end

  # Private validation helpers

  defp validate_email(changeset) do
    changeset
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email address")
    |> validate_length(:email, max: 255)
    |> update_change(:email, &String.downcase/1)
  end
end
