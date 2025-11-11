defmodule Easy.Nutrition.Recipe do
  @moduledoc """
  Recipe schema representing a reusable collection of ingredients with preparation instructions.

  ## Overview

  Recipes are reusable across meals within a business context. Each recipe contains:
  - Basic information (name, description, instructions)
  - Embedded ingredient names as a PostgreSQL text array
  - Manually entered nutritional totals
  - Serving information and preparation time

  ## Embedded Ingredients

  Ingredients are stored as a simple text array (`TEXT[]` in PostgreSQL) containing
  ingredient names only. This eliminates the need for separate ingredient tables
  and join tables.

  Example:
  ```elixir
  %Recipe{
    name: "Grilled Chicken",
    ingredients: ["Chicken Breast", "Olive Oil", "Garlic", "Salt", "Pepper"],
    servings: 4
  }
  ```

  ## Ingredient Validation

  The system validates that:
  - Each ingredient is a non-empty string
  - Each ingredient name is maximum 255 characters
  - Whitespace is automatically trimmed from ingredient names
  - Duplicate ingredient names are allowed

  ## Manual Nutrition Entry

  Nutritional values (calories, protein, carbohydrates, fats, fiber) are manually
  entered by coaches when creating or updating recipes. The system does not perform
  automatic calculations based on ingredients.

  ## Status

  Recipes can be:
  - `"active"` - Available for use in meals (default)
  - `"archived"` - Hidden from normal listings but preserved for historical data
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

    # Embedded ingredients as text array
    field :ingredients, {:array, :string}, default: []

    # Manually entered nutritional totals
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
    has_many :meal_recipes, Easy.Nutrition.MealRecipe

    timestamps()
  end

  @valid_statuses ~w(active archived)

  @doc """
  Changeset for creating a new recipe.

  ## Required Fields
  - business_id: UUID of the business
  - created_by_id: UUID of the coach creating the recipe
  - name: Recipe name (1-255 characters)

  ## Optional Fields
  - description: Recipe description
  - instructions: Preparation instructions
  - prep_time_minutes: Preparation time (non-negative integer)
  - servings: Number of servings (positive integer, default: 1)
  - ingredients: Array of ingredient names (list of strings)
  - total_calories: Manual calorie entry (non-negative decimal)
  - total_protein: Manual protein entry (non-negative decimal)
  - total_carbohydrates: Manual carbs entry (non-negative decimal)
  - total_fats: Manual fats entry (non-negative decimal)
  - total_fiber: Manual fiber entry (non-negative decimal)
  - status: Recipe status ("active" or "archived", default: "active")

  ## Validations
  - Servings must be a positive integer
  - Prep time must be a non-negative integer
  - Ingredients must be a list of non-empty strings (max 255 chars each)
  - Nutritional values must be non-negative decimals
  - Status must be "active" or "archived"

  ## Examples

      # Create with embedded ingredients
      iex> create_changeset(%Recipe{}, %{
      ...>   business_id: business_id,
      ...>   created_by_id: coach_id,
      ...>   name: "Grilled Chicken",
      ...>   ingredients: ["Chicken Breast", "Olive Oil", "Garlic"],
      ...>   servings: 4,
      ...>   total_calories: Decimal.new("350")
      ...> })
      %Ecto.Changeset{valid?: true}

      # Invalid: empty ingredient name
      iex> create_changeset(%Recipe{}, %{
      ...>   business_id: business_id,
      ...>   created_by_id: coach_id,
      ...>   name: "Recipe",
      ...>   ingredients: ["Valid", ""]
      ...> })
      %Ecto.Changeset{valid?: false, errors: [ingredients: {"must contain non-empty strings...", []}]}
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
      :ingredients,
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
    |> validate_ingredients()
    |> validate_nutritional_totals()
    |> validate_status()
    |> ensure_status()
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:created_by_id)
  end

  @doc """
  Changeset for updating a recipe.

  Allows updating all fields except business_id and created_by_id.
  When updating ingredients, the entire array is replaced.

  ## Updatable Fields
  - name: Recipe name
  - description: Recipe description
  - instructions: Preparation instructions
  - prep_time_minutes: Preparation time
  - servings: Number of servings
  - ingredients: Array of ingredient names (replaces entire array)
  - total_calories: Manual calorie entry
  - total_protein: Manual protein entry
  - total_carbohydrates: Manual carbs entry
  - total_fats: Manual fats entry
  - total_fiber: Manual fiber entry
  - status: Recipe status

  ## Examples

      # Update ingredients (replaces entire array)
      iex> update_changeset(recipe, %{
      ...>   ingredients: ["New Ingredient 1", "New Ingredient 2"]
      ...> })
      %Ecto.Changeset{valid?: true}

      # Update nutritional values
      iex> update_changeset(recipe, %{
      ...>   total_calories: Decimal.new("400"),
      ...>   total_protein: Decimal.new("50")
      ...> })
      %Ecto.Changeset{valid?: true}

      # Invalid: negative servings
      iex> update_changeset(recipe, %{servings: -1})
      %Ecto.Changeset{valid?: false, errors: [servings: {"must be a positive integer", []}]}
  """
  def update_changeset(recipe, attrs) do
    recipe
    |> cast(attrs, [
      :name,
      :description,
      :instructions,
      :prep_time_minutes,
      :servings,
      :ingredients,
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
    |> validate_ingredients()
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

  defp validate_ingredients(changeset) do
    case get_change(changeset, :ingredients) do
      nil ->
        changeset

      ingredients when is_list(ingredients) ->
        # Trim whitespace from all ingredient names
        cleaned =
          Enum.map(ingredients, fn
            name when is_binary(name) -> String.trim(name)
            _ -> nil
          end)

        # Check for invalid ingredients (non-strings, empty, or too long)
        errors =
          Enum.filter(cleaned, fn
            nil -> true
            name -> String.length(name) == 0 or String.length(name) > 255
          end)

        if Enum.empty?(errors) do
          put_change(changeset, :ingredients, cleaned)
        else
          add_error(
            changeset,
            :ingredients,
            "must contain non-empty strings with maximum length of 255 characters"
          )
        end

      _ ->
        add_error(changeset, :ingredients, "must be a list of strings")
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
