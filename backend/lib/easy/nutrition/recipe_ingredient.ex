defmodule Easy.Nutrition.RecipeIngredient do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "recipe_ingredients" do
    field :order, :integer
    field :quantity, :decimal

    belongs_to :recipe, Easy.Nutrition.Recipe, on_replace: :delete
    belongs_to :ingredient, Easy.Nutrition.Ingredient
    has_one :weight_unit, Easy.Nutrition.WeightUnit

    timestamps()
  end

  @spec changeset(
          {map(),
           %{
             optional(atom()) =>
               atom()
               | {:array | :assoc | :embed | :in | :map | :parameterized | :supertype | :try,
                  any()}
           }}
          | %{
              :__struct__ => atom() | %{:__changeset__ => any(), optional(any()) => any()},
              optional(atom()) => any()
            },
          :invalid | %{optional(:__struct__) => none(), optional(atom() | binary()) => any()}
        ) :: Ecto.Changeset.t()
  def changeset(recipe_ingredient, attrs) do
    recipe_ingredient
    |> cast(attrs, [:order, :quantity, :weight_unit, :recipe_id, :ingredient_id])
    |> validate_required([:order, :quantity, :weight_unit, :recipe_id, :ingredient_id])
  end
end
