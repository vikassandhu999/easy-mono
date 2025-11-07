defmodule Easy.Nutrition.Ingredient do
  @moduledoc """
  Ingredient schema representing a basic food item with nutritional information.

  Ingredients are reusable across recipes and meals within a business context.
  All nutritional values are stored per 100g for standardization.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "ingredients" do
    field :name, :string
    field :description, :string

    # Nutritional values per 100g
    field :calories, :decimal
    field :protein, :decimal
    field :carbohydrates, :decimal
    field :fats, :decimal
    field :fiber, :decimal

    # Metadata
    field :source, :string
    field :status, :string, default: "active"

    belongs_to :business, Easy.Organizations.Business
    belongs_to :created_by, Easy.Coaches.Coach

    # Relationships
    has_many :recipe_ingredients, Easy.Nutrition.RecipeIngredient
    has_many :meal_ingredients, Easy.Nutrition.MealIngredient

    timestamps()
  end

  @valid_statuses ~w(active archived)

  @doc """
  Changeset for creating a new ingredient.
  Requires business_id, created_by_id, and name.
  Validates nutritional values are non-negative.
  """
  def create_changeset(ingredient, attrs) do
    ingredient
    |> cast(attrs, [
      :business_id,
      :created_by_id,
      :name,
      :description,
      :calories,
      :protein,
      :carbohydrates,
      :fats,
      :fiber,
      :source,
      :status
    ])
    |> validate_required([:business_id, :created_by_id, :name])
    |> validate_name()
    |> validate_nutritional_values()
    |> validate_status()
    |> ensure_status()
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:created_by_id)
  end

  @doc """
  Changeset for updating an ingredient.
  Allows updating all fields except business_id and created_by_id.
  """
  def update_changeset(ingredient, attrs) do
    ingredient
    |> cast(attrs, [
      :name,
      :description,
      :calories,
      :protein,
      :carbohydrates,
      :fats,
      :fiber,
      :source,
      :status
    ])
    |> validate_name()
    |> validate_nutritional_values()
    |> validate_status()
  end

  # Private validation helpers

  defp validate_name(changeset) do
    changeset
    |> validate_length(:name, min: 1, max: 255)
  end

  defp validate_nutritional_values(changeset) do
    changeset
    |> validate_non_negative(:calories)
    |> validate_non_negative(:protein)
    |> validate_non_negative(:carbohydrates)
    |> validate_non_negative(:fats)
    |> validate_non_negative(:fiber)
  end

  defp validate_non_negative(changeset, field) do
    case get_change(changeset, field) do
      nil ->
        changeset

      value ->
        if Decimal.compare(value, Decimal.new(0)) in [:gt, :eq] do
          changeset
        else
          add_error(changeset, field, "must be non-negative")
        end
    end
  end

  defp validate_status(changeset) do
    changeset
    |> validate_inclusion(:status, @valid_statuses,
      message: "must be one of: #{Enum.join(@valid_statuses, ", ")}"
    )
  end

  # Ensure status is set to active if not provided
  defp ensure_status(changeset) do
    case get_field(changeset, :status) do
      nil -> put_change(changeset, :status, "active")
      _ -> changeset
    end
  end

  @doc """
  Returns true if the ingredient is active.
  """
  def active?(%__MODULE__{status: "active"}), do: true
  def active?(%__MODULE__{}), do: false
end
