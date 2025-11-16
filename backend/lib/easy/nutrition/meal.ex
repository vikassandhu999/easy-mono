defmodule Easy.Nutrition.Meal do
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
    belongs_to :created_by, Easy.Organizations.Coach

    # Relationships
    has_many :meal_recipes, Easy.Nutrition.MealRecipe
    has_many :recipes, through: [:meal_recipes, :recipe]

    timestamps()
  end

  @valid_meal_types ~w(breakfast lunch dinner snack)
  @valid_statuses ~w(active archived)

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
