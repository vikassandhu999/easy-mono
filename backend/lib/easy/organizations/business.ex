defmodule Easy.Organizations.Business do
  @moduledoc """
  Business schema representing a coaching practice or organization.

  Businesses are owned by users and can have multiple coaches and clients.
  """
  use Ecto.Schema
  import Ecto.Changeset

  schema "businesses" do
    field :name, :string
    field :description, :string
    field :slug, :string
    field :status, :string, default: "active"

    belongs_to :owner, Easy.Accounts.User
    has_many :coaches, Easy.Coaches.Coach
    has_many :clients, Easy.Clients.Client
    has_one :subscription, Easy.Organizations.Subscription

    timestamps()
  end

  @doc """
  Changeset for creating or updating a business.
  """
  def changeset(business, attrs) do
    business
    |> cast(attrs, [:name, :description, :slug, :status, :owner_id])
    |> validate_required([:name, :owner_id])
    |> validate_length(:name, min: 1, max: 255)
    |> validate_inclusion(:status, ["active", "inactive", "suspended"])
    |> generate_slug()
    |> unique_constraint(:name)
    |> unique_constraint(:slug)
    |> foreign_key_constraint(:owner_id)
  end

  @doc """
  Changeset for creating a new business.
  Automatically generates slug from name if not provided.
  """
  def create_changeset(business, attrs) do
    business
    |> cast(attrs, [:name, :description, :owner_id])
    |> validate_required([:name, :owner_id])
    |> validate_length(:name, min: 1, max: 255)
    |> put_change(:status, "active")
    |> generate_slug()
    |> unique_constraint(:name)
    |> unique_constraint(:slug)
    |> foreign_key_constraint(:owner_id)
  end

  # Private helper to generate slug from name
  defp generate_slug(changeset) do
    case get_change(changeset, :slug) do
      nil ->
        # Generate slug from name if not provided
        case get_change(changeset, :name) do
          nil -> changeset
          name -> put_change(changeset, :slug, slugify(name))
        end

      _slug ->
        changeset
    end
  end

  # Convert name to URL-friendly slug
  defp slugify(name) do
    name
    |> String.downcase()
    |> String.replace(~r/[^\w\s-]/, "")
    |> String.replace(~r/\s+/, "-")
    |> String.replace(~r/-+/, "-")
    |> String.trim("-")
  end
end
