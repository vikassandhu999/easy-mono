defmodule Easy.Nutrition.ServingSize do
  use Easy.Nutrition.Schema

  alias Easy.Nutrition.{Ingredient, MeasurementUnit}

  schema "serving_sizes" do
    # Display name for the serving size (e.g., "cup", "tbsp", "slice", "scoop")
    # May match the linked unit's name or be a custom variant
    field :name, :string

    # The gram equivalent of ONE of this unit for this specific ingredient.
    # e.g., 1 "tbsp" (name) of peanut butter = 16 (gram_weight)
    # e.g., 1 "slice" (name) of bread = 28 (gram_weight)
    # e.g., 1 "g" (name) = 1 (gram_weight)
    field :gram_weight, :decimal

    # Link to the ingredient this serving size applies to
    belongs_to :ingredient, Ingredient

    # Optional link to a standard measurement unit for consistency
    # When present, enables reliable unit conversion without string matching
    belongs_to :unit, MeasurementUnit

    timestamps()
  end

  def changeset(%__MODULE__{} = serving_size, attrs) do
    serving_size
    |> cast(attrs, [:name, :gram_weight, :ingredient_id, :unit_id])
    |> validate_required([:name, :gram_weight])
    |> validate_number(:gram_weight, greater_than: 0)
    |> foreign_key_constraint(:ingredient_id)
    |> foreign_key_constraint(:unit_id)
    |> unique_constraint([:ingredient_id, :unit_id],
      name: :serving_sizes_ingredient_id_unit_id_index,
      message: "this unit already has a serving size for this ingredient"
    )
  end
end
