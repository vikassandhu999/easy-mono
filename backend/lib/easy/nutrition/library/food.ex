defmodule Easy.Nutrition.Library.Food do
  use Ecto.Schema
  alias Easy.Orgs
  alias Easy.Nutrition.Library

  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  # TODO: Add barcode.
  schema "foods" do
    field :name, :string

    field :macros, :map
    field :source, :string
    field :category, :string
    field :tags, {:array, :string}
    field :notes, :string
    field :image_url, :string

    embeds_many :serving_sizes, Library.ServingSize, on_replace: :delete

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business

    timestamps(type: :utc_datetime)
  end

  @spec new_changeset(String.t(), String.t(), map()) :: t()
  def new_changeset(business_id, coach_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [
      :name,
      :macros,
      :source,
      :category,
      :tags,
      :notes,
      :image_url
    ])
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, coach_id)
    |> validate_required([:name, :creator_id, :business_id])
    |> cast_embed(:serving_sizes, with: &Library.ServingSize.changeset/2)
  end

  @spec update_changeset(t(), map()) :: t()
  def update_changeset(food, attrs) do
    food
    |> cast(attrs, [
      :name,
      :macros,
      :source,
      :category,
      :tags,
      :notes,
      :image_url
    ])
    |> cast_embed(:serving_sizes, with: &Library.ServingSize.changeset/2)
  end
end
