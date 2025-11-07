defmodule Easy.Nutrition.Recipe do
  @moduledoc """
  Recipe schema representing a reusable collection of ingredients with preparation instructions.

  Recipes are reusable across meals within a business context.
  Nutritional totals are cached and calculated from recipe ingredients.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "recipes" do
    field :name, :string
    field :description, :string
    field :instructions, :string
    field :prep_time_minutes, :integer
    field :servings, :integer, default: 1

    # Cached nutritional totals (calculated from ingredients)
    field :total_calories, :decimal
    field :total_protein, :decimal
    field :total_carbohydrates, :decimal
    field :total_fats, :decimal
    field :total_fiber, :decimal

    # Metadata
    field :status, :string, default: "active"

    belongs_to :business, Easy.Organizations.Business
    belongs_to :created_by, Easy.Coaches.Coach

    # Relationships
    has_many :recipe_ingredients, Easy.Nutrition.RecipeIngredient
    has_many :ingredients, through: [:recipe_ingredients, :ingredient]
    has_many :meal_recipes, Easy.Nutrition.MealRecipe

    timestamps()
  end

  @valid_statuses ~w(active archived)

  @doc """
  Changeset for creating a new recipe.
  Requires business_id, created_by_id, and name.
  Validates servings is a positive integer.
  """
  def create_changeset(recipe, attrs) do
    recipe
    |> cast(attrs, [
      :business_id,
      :created_by_id,
      :name,
      :description,
      :instructions,
      :prep_time_minutes,
      :servings,
      :total_calories,
      :total_protein,
      :total_carbohydrates,
      :total_fats,
      :total_fiber,
      :status
    ])
    |> validate_required([:business_id, :created_by_id, :name])
    |> validate_name()
    |> validate_servings()
    |> validate_prep_time()
    |> validate_nutritional_totals()
    |> validate_status()
    |> ensure_status()
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:created_by_id)
  end

  @doc """
  Changeset for updating a recipe.
  Allows updating all fields except business_id and created_by_id.
  """
  def update_changeset(recipe, attrs) do
    recipe
    |> cast(attrs, [
      :name,
      :description,
      :instructions,
      :prep_time_minutes,
      :servings,
      :total_calories,
      :total_protein,
      :total_carbohydrates,
      :total_fats,
      :total_fiber,
      :status
    ])
    |> validate_name()
    |> validate_servings()
    |> validate_prep_time()
    |> validate_nutritional_totals()
    |> validate_status()
  end

  # Private validation helpers

  defp validate_name(changeset) do
    changeset
    |> validate_length(:name, min: 1, max: 255)
  end

  defp validate_servings(changeset) do
    changeset
    |> validate_number(:servings, greater_than: 0, message: "must be a positive integer")
  end

  defp validate_prep_time(changeset) do
    case get_change(changeset, :prep_time_minutes) do
      nil ->
        changeset

      value when is_integer(value) and value >= 0 ->
        changeset

      _ ->
        add_error(changeset, :prep_time_minutes, "must be a non-negative integer")
    end
  end

  defp validate_nutritional_totals(changeset) do
    changeset
    |> validate_non_negative(:total_calories)
    |> validate_non_negative(:total_protein)
    |> validate_non_negative(:total_carbohydrates)
    |> validate_non_negative(:total_fats)
    |> validate_non_negative(:total_fiber)
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
  Returns true if the recipe is active.
  """
  def active?(%__MODULE__{status: "active"}), do: true
  def active?(%__MODULE__{}), do: false
end
