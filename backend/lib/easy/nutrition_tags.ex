defmodule Easy.Nutrition.Tags do
  @spec allergens() :: [String.t()]
  def allergens, do: ~w(dairy egg fish shellfish tree_nuts peanuts wheat soy sesame)

  @spec dietary() :: [String.t()]
  def dietary, do: ~w(vegan vegetarian halal kosher gluten_free dairy_free low_fodmap keto high_protein)
end
