defmodule Easy.Repo.Seeds.Foods do
  import Ecto.Query

  alias Easy.Nutrition.Food
  alias Easy.Repo

  @spec run() :: :ok
  def run do
    Repo.all(Easy.Orgs.Business) |> Enum.each(&for_business/1)
  end

  @spec for_business(Easy.Orgs.Business.t()) :: %{String.t() => Food.t()}
  def for_business(business) do
    Map.new(catalogue(), fn attrs ->
      row = Repo.one(from(f in Food, where: f.business_id == ^business.id and f.name == ^attrs.name, limit: 1))
      food = row || business.id |> Food.insert_changeset(attrs) |> Repo.insert!()
      {attrs.name, food}
    end)
  end

  @spec catalogue() :: [map()]
  def catalogue do
    [
      food("Rolled oats", :"100g", [379, 13, 68, 6.5], [{"cup", 80}]),
      food("Milk, semi-skimmed", :"100ml", [47, 3.4, 4.8, 1.7], [{"glass", 250}]),
      food("Banana", :"100g", [89, 1.1, 23, 0.3], [{"medium banana", 118}]),
      food("Egg", :"100g", [143, 12.6, 0.7, 9.5], [{"large egg", 50}]),
      food("Wholegrain toast", :"100g", [247, 13, 41, 3.4], [{"slice", 30}]),
      food("Greek yogurt 2%", :"100g", [73, 9.9, 3.9, 2], [{"pot", 170}]),
      food("Mixed berries", :"100g", [50, 0.8, 12, 0.3]),
      food("Basmati rice, cooked", :"100g", [121, 3.5, 25, 0.4], [{"cup", 160}]),
      food("Chicken breast, cooked", :"100g", [165, 31, 0, 3.6]),
      food("Salmon fillet, baked", :"100g", [206, 22, 0, 12], [{"fillet", 150}]),
      food("Potatoes, boiled", :"100g", [87, 1.9, 20, nil]),
      food("Whey protein", :"100g", [400, 80, 8, 6], [{"scoop", 30}]) |> Map.put(:kind, :supplement),
      food("Creatine monohydrate", :"100g", [0, 0, 0, 0]) |> Map.put(:kind, :supplement),
      %{name: "Vitamin D3 2000 IU", kind: :supplement, basis: :"1unit", unit_label: "capsule", nutrients: %{}, servings: []}
    ]
  end

  defp food(name, basis, values, servings \\ []) do
    nutrients =
      ["energy_kcal", "protein_g", "carbs_g", "fat_g"]
      |> Enum.zip(values)
      |> Enum.reject(fn {_code, value} -> is_nil(value) end)
      |> Map.new()

    %{name: name, kind: :food, basis: basis, nutrients: nutrients, servings: Enum.map(servings, fn {label, amount} -> %{label: label, amount: amount} end)}
  end
end
