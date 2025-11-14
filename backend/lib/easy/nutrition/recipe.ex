defmodule Easy.Nutrition.Recipe do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "recipes" do
    field(:name, :string)
    field(:description, :string)
    field(:instructions, :string)
    field(:prep_time_minutes, :integer)
    field(:servings, :integer, default: 1)

    field(:ingredients, {:array, :map}, default: [])

    field(:total_calories, :decimal)
    field(:total_protein, :decimal)
    field(:total_carbohydrates, :decimal)
    field(:total_fats, :decimal)
    field(:total_fiber, :decimal)

    # Metadata
    field(:status, :string, default: "active")

    belongs_to(:business, Easy.Organizations.Business)
    belongs_to(:created_by, Easy.Coaches.Coach)

    # Relationships
    has_many(:meal_recipes, Easy.Nutrition.MealRecipe)

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
        # Validate each ingredient is a map with required fields
        validated =
          Enum.map(ingredients, fn
            %{"name" => name, "quantity" => quantity, "unit" => unit} = _ingredient
            when is_binary(name) and (is_number(quantity) or is_binary(quantity)) and
                   is_binary(unit) ->
              %{
                "name" => String.trim(name),
                "quantity" => normalize_quantity(quantity),
                "unit" => String.trim(unit)
              }

            %{name: name, quantity: quantity, unit: unit} = _ingredient
            when is_binary(name) and (is_number(quantity) or is_binary(quantity)) and
                   is_binary(unit) ->
              %{
                "name" => String.trim(name),
                "quantity" => normalize_quantity(quantity),
                "unit" => String.trim(unit)
              }

            _ ->
              nil
          end)

        # Check for invalid ingredients
        if Enum.any?(validated, &is_nil/1) do
          add_error(
            changeset,
            :ingredients,
            "must be a list of maps with name, quantity, and unit fields"
          )
        else
          # Validate all ingredients have non-empty values
          invalid =
            Enum.any?(validated, fn ingredient ->
              ingredient["name"] == "" or
                ingredient["quantity"] < 0 or
                ingredient["unit"] == "" or
                String.length(ingredient["name"]) > 255 or
                String.length(ingredient["unit"]) > 50
            end)

          if invalid do
            add_error(
              changeset,
              :ingredients,
              "ingredients must have non-empty name and unit, quantity >= 0, name <= 255 chars, unit <= 50 chars"
            )
          else
            put_change(changeset, :ingredients, validated)
          end
        end

      _ ->
        add_error(changeset, :ingredients, "must be a list of ingredient maps")
    end
  end

  defp normalize_quantity(quantity) when is_number(quantity), do: quantity

  defp normalize_quantity(quantity) when is_binary(quantity) do
    case Float.parse(quantity) do
      {num, _} -> num
      :error -> 0
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
