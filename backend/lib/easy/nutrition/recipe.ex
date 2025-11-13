defmodule Easy.Nutrition.Recipe do
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

    field :ingredients, {:array, :string}, default: []

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
