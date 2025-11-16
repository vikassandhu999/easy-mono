defmodule Easy.Nutrition.RecipeInstructions do
  use Ecto.Schema

  embedded_schema do
    field :as_text, :string
    field :steps, {:array, :string}
  end
end
