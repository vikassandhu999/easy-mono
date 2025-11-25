defmodule Easy.Organizations.Business do
  @moduledoc """
  Business schema representing a coaching practice or organization.

  Businesses are owned by users and can have multiple coaches and clients.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "businesses" do
    field :name, :string
    field :description, :string
    field :handle, :string
    field :status, :string, default: "active"

    belongs_to :owner, Easy.Accounts.User
    has_many :coaches, Easy.Organizations.Coach
    has_many :clients, Easy.Clients.Client
    has_one :subscription, Easy.Organizations.Subscription

    timestamps()
  end

  @doc """
  Changeset for creating or updating a business.
  """
  def changeset(business, attrs) do
    business
    |> cast(attrs, [:name, :description, :handle, :status])
    |> validate_required([:name])
    |> validate_length(:name, min: 1, max: 255)
    |> validate_inclusion(:status, ["active", "inactive", "suspended"])
  end

  @doc """
  Changeset for creating a new business.
  Automatically generates slug from name if not provided.
  """
  def create_changeset(business, attrs) do
    business
    |> cast(attrs, [:name, :description, :owner_id, :status, :handle])
    |> validate_required([:name, :owner_id, :handle])
    |> validate_length(:name, min: 1, max: 255)
    |> put_change(:status, "active")
    |> unique_constraint(:handle)
    |> foreign_key_constraint(:owner_id)
  end

  def validate_handle(changeset) do
    reserved_words =
      ~w(personal org admin support help security team staff official auth tip home dashboard bounties community user payment claims orgs projects jobs leaderboard onboarding pricing developers companies contracts blog docs open hiring sdk api repo go preview tv podcast)

    changeset
    |> validate_format(:handle, ~r/^[a-zA-Z0-9_-]{2,32}$/)
    |> validate_exclusion(:handle, reserved_words, message: "is reserved")
    |> unsafe_validate_unique(:handle, Easy.Repo)
    |> unique_constraint(:handle)
  end
end
