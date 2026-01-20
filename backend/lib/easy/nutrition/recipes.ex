defmodule Easy.Nutrition.Recipes do
  alias Easy.Nutrition.Library.Recipe
  alias Easy.Repo
  alias Easy.Identity.Token

  import Ecto.Query

  @type search_opts :: %{
          optional(:search) => String.t(),
          optional(:offset) => pos_integer(),
          optional(:limit) => pos_integer(),
          optional(:status) => String.t()
        }

  @spec create(String.t(), String.t(), map()) :: {:ok, Recipe.t()} | {:error, any()}
  def create(business_id, coach_id, attrs) do
    Recipe.new_changeset(business_id, coach_id, attrs)
    |> Repo.insert()
  end

  @spec update(Recipe.t(), map()) :: {:ok, Recipe.t()} | {:error, any()}
  def update(recipe, attrs) do
    recipe
    |> Recipe.update_changeset(attrs)
    |> Repo.update()
  end

  @spec list_for_business(Token.claims(), search_opts()) ::
          {:ok, non_neg_integer(), [Recipe.t()]} | {:error, any()}
  def list_for_business(claims, opts \\ %{}) when is_map(claims) do
    search_term = Map.get(opts, :search, "")
    offset = Map.get(opts, :offset, 0) |> max(0)
    limit = Map.get(opts, :limit, 20) |> min(100) |> max(1)

    q =
      from c in Recipe,
        where: c.business_id == ^claims.business_id

    q =
      if search_term != "" do
        from c in q,
          where: ilike(c.name, ^"%#{search_term}%")
      else
        q
      end

    total_count = Repo.aggregate(q, :count, :id)

    recipes =
      Repo.all(from c in q, order_by: [desc: c.inserted_at], limit: ^limit, offset: ^offset)

    {:ok, total_count, recipes}
  end

  @spec get_by_id(String.t()) :: Recipe.t() | nil
  def get_by_id(id) do
    Repo.get(Recipe, id)
  end

  @spec get_by_id(String.t(), String.t()) :: Recipe.t() | nil
  def get_by_id(id, business_id) do
    Repo.get(Recipe, id, business_id: business_id)
  end
end
