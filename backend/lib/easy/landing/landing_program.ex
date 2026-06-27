defmodule Easy.Landing.LandingProgram do
  use Ecto.Schema

  alias Easy.Orgs

  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  schema "landing_programs" do
    field :name, :string
    field :audience, :string
    field :promise, :string
    field :description, :string
    field :price_display, :string
    field :position, :integer, default: 0

    belongs_to :business, Orgs.Business
    belongs_to :landing_page, Easy.Landing.LandingPage

    timestamps(type: :utc_datetime)
  end

  # Programs are only ever created as part of a landing-page upsert, so trusted ids
  # (business_id, landing_page_id) are positional and the page owns ordering via position.
  @spec insert_changeset(String.t(), String.t(), integer(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, landing_page_id, position, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :audience, :promise, :description, :price_display])
    |> put_change(:business_id, business_id)
    |> put_change(:landing_page_id, landing_page_id)
    |> put_change(:position, position)
    |> validate_required([:business_id, :landing_page_id, :name])
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:landing_page_id, name: :landing_programs_page_business_id_fkey)
  end
end
