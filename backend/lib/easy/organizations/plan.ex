defmodule Easy.Organizations.Plan do
  @moduledoc """
  Plan schema representing subscription tiers.

  Plans define pricing, features, and limits for businesses.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "plans" do
    field :name, :string
    field :slug, :string
    field :description, :string
    field :price_cents, :integer
    field :billing_interval, :string
    field :features, :map
    field :limits, :map
    field :is_default, :boolean, default: false

    has_many :subscriptions, Easy.Organizations.Subscription

    timestamps()
  end

  @doc """
  Changeset for creating or updating a plan.
  """
  def changeset(plan, attrs) do
    plan
    |> cast(attrs, [
      :name,
      :slug,
      :description,
      :price_cents,
      :billing_interval,
      :features,
      :limits,
      :is_default
    ])
    |> validate_required([:name, :slug, :price_cents, :billing_interval])
    |> validate_number(:price_cents, greater_than_or_equal_to: 0)
    |> validate_inclusion(:billing_interval, ["month", "year"])
    |> validate_length(:name, min: 1, max: 255)
    |> validate_length(:slug, min: 1, max: 255)
    |> unique_constraint(:slug)
  end
end
