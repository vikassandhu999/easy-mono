defmodule Easy.Nutrition.MeasurementUnit do
  use Easy.Nutrition.Schema

  schema "measurement_units" do
    field :name, :string
    field :abbreviation, :string
    field :system, Ecto.Enum, values: [:imperial, :metric, :other]

    timestamps()
  end

  @doc false
  def changeset(measurement_unit, attrs) do
    measurement_unit
    |> cast(attrs, [:name, :abbreviation, :system])
    |> validate_required([:name, :abbreviation, :system])
    |> unique_constraint(:name)
    |> unique_constraint(:abbreviation)
  end
end
