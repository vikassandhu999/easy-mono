defmodule Easy.Storefront.Offer do
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  @offer_types [:nutrition_plan, :training_plan, :combo, :consultation, :other]
  @offer_statuses [:active, :archived]

  schema "offers" do
    field :name, :string
    field :slug, :string
    field :description, :string
    field :type, Ecto.Enum, values: @offer_types
    field :duration_text, :string
    field :price, :integer
    field :currency, :string, default: "INR"
    field :price_display, :string
    field :features, {:array, :string}, default: []
    field :is_featured, :boolean, default: false
    field :status, Ecto.Enum, values: @offer_statuses, default: :active
    field :position, :integer, default: 0
    field :cta_text, :string, default: "Get started"

    belongs_to :business, Easy.Orgs.Business

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :name,
    :description,
    :type,
    :duration_text,
    :price,
    :currency,
    :price_display,
    :features,
    :is_featured,
    :status,
    :position,
    :cta_text
  ]

  # Changesets

  @spec insert_changeset(String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> validate_required([:name, :business_id])
    |> generate_slug()
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 5000)
    |> validate_number(:price, greater_than_or_equal_to: 0)
    |> unique_constraint([:business_id, :slug], name: :offers_business_id_slug_index)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(offer, attrs) do
    offer
    |> cast(attrs, @cast_fields)
    |> validate_required([:name])
    |> maybe_regenerate_slug()
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 5000)
    |> validate_number(:price, greater_than_or_equal_to: 0)
    |> unique_constraint([:business_id, :slug], name: :offers_business_id_slug_index)
  end

  defp generate_slug(changeset) do
    case get_field(changeset, :name) do
      nil -> changeset
      name -> put_change(changeset, :slug, slugify(name))
    end
  end

  defp maybe_regenerate_slug(changeset) do
    if get_change(changeset, :name) do
      generate_slug(changeset)
    else
      changeset
    end
  end

  defp slugify(name) do
    name
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9\s-]/, "")
    |> String.replace(~r/[\s-]+/, "-")
    |> String.trim("-")
  end

  # Queries

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(o in query, where: o.business_id == ^business_id)
  end

  @spec active(Ecto.Queryable.t()) :: Ecto.Query.t()
  def active(query \\ __MODULE__) do
    from(o in query, where: o.status == ^:active)
  end

  @spec by_position(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_position(query \\ __MODULE__) do
    from(o in query, order_by: [asc: o.position, asc: o.inserted_at])
  end
end
