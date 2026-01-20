defmodule Easy.Nutrition.Library.Food do
  use Ecto.Schema
  alias Easy.Orgs
  alias Easy.Nutrition.Library

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
end
