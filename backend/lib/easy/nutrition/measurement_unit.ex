defmodule Easy.Nutrition.MeasurementUnit do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @systems ~w(imperial metric other)

  schema "measurement_units" do
    field :name, :string
    field :abbreviation, :string
    # imperial or metric or other
    field :system, :string

    timestamps()
  end

  @doc false
  def changeset(weight_unit, attrs) do
    weight_unit
    |> cast(attrs, [:name, :abbreviation, :system])
    |> validate_required([:name, :abbreviation, :system])
    |> validate_inclusion(:system, @systems)
    |> unique_constraint(:name)
    |> unique_constraint(:abbreviation)
  end
end
