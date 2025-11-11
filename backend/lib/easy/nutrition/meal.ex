defmodule Easy.Nutrition.Meal do
  @moduledoc """
  Meal schema representing a reusable eating occasion with recipes.

  ## Overview

  Meals are reusable within a business context and can be added to future nutrition plans.
  Each meal contains:
  - Basic information (name, description, meal type)
  - One or more recipes (each recipe contains embedded ingredients)
  - Manually entered nutritional totals
  - Optional notes

  ## Meal Composition

  Meals contain only recipes (no direct ingredient associations). Each recipe added
  to a meal includes:
  - The recipe's embedded ingredient names
  - A serving multiplier (e.g., 1.0 for one serving, 2.0 for double)
  - Optional notes specific to this meal-recipe association

  Example:
  ```elixir
  %Meal{
    name: "Lunch",
    meal_type: "lunch",
    recipes: [
      %Recipe{
        name: "Grilled Chicken",
        ingredients: ["Chicken Breast", "Olive Oil", "Garlic"]
      },
      %Recipe{
        name: "Brown Rice",
        ingredients: ["Brown Rice", "Water", "Salt"]
      }
    ]
  }
  ```

  ## Manual Nutrition Entry

  Nutritional values (calories, protein, carbohydrates, fats, fiber) are manually
  entered by coaches when creating or updating meals. The system does not perform
  automatic calculations based on recipes.

  ## Meal Types

  Valid meal types:
  - `"breakfast"` - Morning meal
  - `"lunch"` - Midday meal
  - `"dinner"` - Evening meal
  - `"snack"` - Between-meal snack

  ## Status

  Meals can be:
  - `"active"` - Available for use in nutrition plans (default)
  - `"archived"` - Hidden from normal listings but preserved for historical data
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "meals" do
    field :name, :string
    field :description, :string
    field :meal_type, :string
    field :notes, :string
    field :status, :string, default: "active"

    # Manually entered nutritional totals
    field :total_calories, :decimal
    field :total_protein, :decimal
    field :total_carbohydrates, :decimal
    field :total_fats, :decimal
    field :total_fiber, :decimal

    belongs_to :business, Easy.Organizations.Business
    belongs_to :created_by, Easy.Coaches.Coach

    # Relationships
    has_many :meal_recipes, Easy.Nutrition.MealRecipe
    has_many :recipes, through: [:meal_recipes, :recipe]

    timestamps()
  end

  @valid_meal_types ~w(breakfast lunch dinner snack)
  @valid_statuses ~w(active archived)

  @doc """
  Changeset for creating a new meal.

  ## Required Fields
  - business_id: UUID of the business
  - created_by_id: UUID of the coach creating the meal
  - name: Meal name (1-255 characters)
  - meal_type: Type of meal ("breakfast", "lunch", "dinner", or "snack")

  ## Optional Fields
  - description: Meal description
  - notes: Additional notes
  - total_calories: Manual calorie entry (non-negative decimal)
  - total_protein: Manual protein entry (non-negative decimal)
  - total_carbohydrates: Manual carbs entry (non-negative decimal)
  - total_fats: Manual fats entry (non-negative decimal)
  - total_fiber: Manual fiber entry (non-negative decimal)
  - status: Meal status ("active" or "archived", default: "active")

  ## Validations
  - Meal type must be one of: breakfast, lunch, dinner, snack
  - Nutritional values must be non-negative decimals
  - Status must be "active" or "archived"

  ## Examples

      # Create a meal with manual nutrition values
      iex> create_changeset(%Meal{}, %{
      ...>   business_id: business_id,
      ...>   created_by_id: coach_id,
      ...>   name: "Breakfast Bowl",
      ...>   meal_type: "breakfast",
      ...>   total_calories: Decimal.new("550"),
      ...>   total_protein: Decimal.new("30")
      ...> })
      %Ecto.Changeset{valid?: true}

      # Invalid: unsupported meal type
      iex> create_changeset(%Meal{}, %{
      ...>   business_id: business_id,
      ...>   created_by_id: coach_id,
      ...>   name: "Meal",
      ...>   meal_type: "brunch"
      ...> })
      %Ecto.Changeset{valid?: false, errors: [meal_type: {"must be one of: breakfast, lunch, dinner, snack", []}]}
  """
  def create_changeset(meal, attrs) do
    meal
    |> cast(attrs, [
      :business_id,
      :created_by_id,
      :name,
      :description,
      :meal_type,
      :notes,
      :total_calories,
      :total_protein,
      :total_carbohydrates,
      :total_fats,
      :total_fiber,
      :status
    ])
    |> validate_required([:business_id, :created_by_id, :name, :meal_type])
    |> validate_name()
    |> validate_meal_type()
    |> validate_nutritional_totals()
    |> validate_status()
    |> ensure_status()
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:created_by_id)
  end

  @doc """
  Changeset for updating a meal.

  Allows updating all fields except business_id and created_by_id.
  Recipes are managed separately using the Nutrition context functions.

  ## Updatable Fields
  - name: Meal name
  - description: Meal description
  - meal_type: Type of meal
  - notes: Additional notes
  - total_calories: Manual calorie entry
  - total_protein: Manual protein entry
  - total_carbohydrates: Manual carbs entry
  - total_fats: Manual fats entry
  - total_fiber: Manual fiber entry
  - status: Meal status

  ## Examples

      # Update nutritional values
      iex> update_changeset(meal, %{
      ...>   total_calories: Decimal.new("600"),
      ...>   total_protein: Decimal.new("35")
      ...> })
      %Ecto.Changeset{valid?: true}

      # Update meal type
      iex> update_changeset(meal, %{meal_type: "dinner"})
      %Ecto.Changeset{valid?: true}

      # Invalid: negative calories
      iex> update_changeset(meal, %{total_calories: Decimal.new("-100")})
      %Ecto.Changeset{valid?: false, errors: [total_calories: {"must be non-negative", []}]}
  """
  def update_changeset(meal, attrs) do
    meal
    |> cast(attrs, [
      :name,
      :description,
      :meal_type,
      :notes,
      :total_calories,
      :total_protein,
      :total_carbohydrates,
      :total_fats,
      :total_fiber,
      :status
    ])
    |> validate_name()
    |> validate_meal_type()
    |> validate_nutritional_totals()
    |> validate_status()
  end

  # Private validation helpers

  defp validate_name(changeset) do
    changeset
    |> validate_length(:name, min: 1, max: 255)
  end

  defp validate_meal_type(changeset) do
    changeset
    |> validate_inclusion(:meal_type, @valid_meal_types,
      message: "must be one of: #{Enum.join(@valid_meal_types, ", ")}"
    )
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
  Returns true if the meal is active.
  """
  def active?(%__MODULE__{status: "active"}), do: true
  def active?(%__MODULE__{}), do: false
end
