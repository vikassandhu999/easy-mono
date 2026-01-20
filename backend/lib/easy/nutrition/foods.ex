defmodule Easy.Nutrition.Foods do
  alias Easy.Nutrition.Library.Food
  alias Easy.Repo
  alias Easy.Identity.Token

  import Ecto.Query

  @type search_opts :: %{
          optional(:search) => String.t(),
          optional(:offset) => pos_integer(),
          optional(:limit) => pos_integer()
        }

  @spec create(String.t(), String.t(), map()) :: {:ok, Food.t()} | {:error, any()}
  def create(business_id, coach_id, attrs) do
    Food.new_changeset(business_id, coach_id, attrs)
    |> Repo.insert()
  end

  @spec update(Food.t(), map()) :: {:ok, Food.t()} | {:error, any()}
  def update(food, attrs) do
    food
    |> Food.update_changeset(attrs)
    |> Repo.update()
  end

  @spec list_for_business(Token.claims(), search_opts()) ::
          {:ok, non_neg_integer(), [Food.t()]} | {:error, any()}
  def list_for_business(claims, opts \\ %{}) when is_map(claims) do
    search_term = Map.get(opts, :search, "")
    offset = Map.get(opts, :offset, 0) |> max(0)
    limit = Map.get(opts, :limit, 20) |> min(100) |> max(1)

    q =
      from f in Food,
        where: f.business_id == ^claims.business_id

    q =
      if search_term != "" do
        from f in q,
          where: ilike(f.name, ^"%#{search_term}%")
      else
        q
      end

    total_count = Repo.aggregate(q, :count, :id)

    foods =
      Repo.all(from f in q, order_by: [desc: f.inserted_at], limit: ^limit, offset: ^offset)

    {:ok, total_count, foods}
  end

  @spec get_by_id(String.t()) :: Food.t() | nil
  def get_by_id(id) do
    Repo.get(Food, id)
  end

  @spec get_by_id(String.t(), String.t()) :: Food.t() | nil
  def get_by_id(id, business_id) do
    Repo.get_by(Food, id: id, business_id: business_id)
  end
end
