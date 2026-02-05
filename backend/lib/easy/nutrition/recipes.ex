defmodule Easy.Nutrition.Recipes do
  alias Easy.Nutrition.Library.Recipe
  alias Easy.Repo

  import Ecto.Query

  @type search_opts :: %{
          optional(:search) => String.t(),
          optional(:offset) => non_neg_integer(),
          optional(:limit) => pos_integer()
        }

  @spec create(String.t(), String.t(), map()) :: {:ok, Recipe.t()} | {:error, Ecto.Changeset.t()}
  def create(business_id, coach_id, attrs) do
    Recipe.new_changeset(business_id, coach_id, attrs)
    |> Repo.insert()
  end

  @spec get(String.t(), String.t()) :: Recipe.t() | nil
  def get(id, business_id) do
    Recipe
    |> Repo.get_by(id: id, business_id: business_id)
    |> Repo.preload([:foods, recipe_ingredients: [:food]])
  end

  @spec list(String.t(), search_opts()) :: {:ok, non_neg_integer(), [Recipe.t()]}
  def list(business_id, opts \\ %{}) do
    search_term = Map.get(opts, :search, "")
    offset = opts |> Map.get(:offset, 0) |> max(0)
    limit = opts |> Map.get(:limit, 20) |> min(100) |> max(1)

    base_query = from(r in Recipe, where: r.business_id == ^business_id)

    query =
      if search_term != "" do
        from(r in base_query, where: ilike(r.name, ^"%#{search_term}%"))
      else
        base_query
      end

    total_count = Repo.aggregate(query, :count, :id)

    recipes =
      query
      |> order_by([r], desc: r.inserted_at)
      |> limit(^limit)
      |> offset(^offset)
      |> Repo.all()
      |> Repo.preload(recipe_ingredients: [:food])

    {:ok, total_count, recipes}
  end

  @spec update(Recipe.t(), map()) :: {:ok, Recipe.t()} | {:error, Ecto.Changeset.t()}
  def update(%Recipe{} = recipe, attrs) do
    recipe
    |> Recipe.update_changeset(attrs)
    |> Repo.update()
  end

  @spec delete(Recipe.t()) :: {:ok, Recipe.t()} | {:error, Ecto.Changeset.t()}
  def delete(%Recipe{} = recipe) do
    Repo.delete(recipe)
  end
end
