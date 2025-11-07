defmodule Easy.Nutrition do
  @moduledoc """
  Nutrition context handles ingredient, recipe, and meal management.

  This is the public API for:
  - Ingredient CRUD operations
  - Recipe management with ingredients
  - Meal management with recipes and ingredients
  - Nutritional calculations

  All resources are scoped to business context for data isolation.
  """

  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Nutrition.Ingredient
  alias Easy.Coaches.Coach

  # ============================================
  # INGREDIENT MANAGEMENT
  # ============================================

  @doc """
  Creates an ingredient within a business context.

  ## Parameters
    - business_id: The business ID (UUID)
    - coach_id: The coach ID creating the ingredient (UUID)
    - attrs: Map of ingredient attributes (name, description, nutritional values, etc.)

  ## Returns
    - {:ok, ingredient} on success
    - {:error, changeset} on validation failure
    - {:error, :unauthorized} if coach doesn't belong to business

  ## Examples

      iex> create_ingredient(business_id, coach_id, %{name: "Chicken Breast", calories: 165})
      {:ok, %Ingredient{}}

      iex> create_ingredient(business_id, coach_id, %{name: ""})
      {:error, %Ecto.Changeset{}}
  """
  def create_ingredient(business_id, coach_id, attrs) do
    with {:ok, _coach} <- validate_coach_in_business(coach_id, business_id) do
      attrs_with_ids =
        attrs
        |> Map.put(:business_id, business_id)
        |> Map.put(:created_by_id, coach_id)

      %Ingredient{}
      |> Ingredient.create_changeset(attrs_with_ids)
      |> Repo.insert()
    end
  end

  @doc """
  Gets an ingredient by ID.

  Returns the ingredient struct or nil if not found.

  ## Examples

      iex> get_ingredient("123e4567-e89b-12d3-a456-426614174000")
      %Ingredient{}

      iex> get_ingredient("nonexistent-id")
      nil
  """
  def get_ingredient(id), do: Repo.get(Ingredient, id)

  @doc """
  Lists ingredients within a business context with optional filtering and pagination.

  ## Parameters
    - business_id: The business ID
    - opts: Options for filtering and pagination
      - :limit - Number of items per page (default: 50)
      - :offset - Number of items to skip (default: 0)
      - :status - Filter by status (default: "active")
      - :order_by - Field to order by (default: :name)

  ## Returns
    - List of ingredients

  ## Examples

      iex> list_ingredients(business_id)
      [%Ingredient{}, %Ingredient{}]

      iex> list_ingredients(business_id, limit: 10, offset: 0, status: "active")
      [%Ingredient{}]
  """
  def list_ingredients(business_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)
    status = Keyword.get(opts, :status, "active")
    order_by = Keyword.get(opts, :order_by, :name)

    from(i in Ingredient,
      where: i.business_id == ^business_id,
      where: i.status == ^status,
      order_by: ^order_by,
      limit: ^limit,
      offset: ^offset
    )
    |> Repo.all()
  end

  @doc """
  Updates an ingredient with the given attributes.

  Validates that the ingredient belongs to the same business as the coach.

  ## Parameters
    - ingredient: The ingredient struct to update
    - coach_id: The coach ID performing the update
    - attrs: Map of attributes to update

  ## Returns
    - {:ok, ingredient} on success
    - {:error, changeset} on validation failure
    - {:error, :unauthorized} if coach doesn't belong to the same business as the ingredient

  ## Examples

      iex> update_ingredient(ingredient, coach_id, %{name: "Updated Name"})
      {:ok, %Ingredient{}}

      iex> update_ingredient(ingredient, coach_id, %{calories: -10})
      {:error, %Ecto.Changeset{}}

      iex> update_ingredient(ingredient, other_coach_id, %{name: "Updated Name"})
      {:error, :unauthorized}
  """
  def update_ingredient(%Ingredient{} = ingredient, coach_id, attrs) do
    with {:ok, _coach} <- validate_coach_in_business(coach_id, ingredient.business_id) do
      ingredient
      |> Ingredient.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @doc """
  Deletes an ingredient.

  Prevents deletion if the ingredient is used in any recipes or meals.
  Validates that the coach belongs to the same business as the ingredient.

  ## Parameters
    - ingredient: The ingredient struct to delete
    - coach_id: The coach ID performing the deletion

  ## Returns
    - {:ok, ingredient} on success
    - {:error, :ingredient_in_use} if ingredient is referenced by recipes or meals
    - {:error, :unauthorized} if coach doesn't belong to the same business as the ingredient

  ## Examples

      iex> delete_ingredient(ingredient, coach_id)
      {:ok, %Ingredient{}}

      iex> delete_ingredient(ingredient_in_use, coach_id)
      {:error, :ingredient_in_use}

      iex> delete_ingredient(ingredient, other_coach_id)
      {:error, :unauthorized}
  """
  def delete_ingredient(%Ingredient{} = ingredient, coach_id) do
    with {:ok, _coach} <- validate_coach_in_business(coach_id, ingredient.business_id) do
      if ingredient_in_use?(ingredient.id) do
        {:error, :ingredient_in_use}
      else
        Repo.delete(ingredient)
      end
    end
  end

  @doc """
  Searches for ingredients by name within a business context.

  Performs a case-insensitive search on ingredient names.

  ## Parameters
    - business_id: The business ID
    - query: Search string to match against ingredient names

  ## Returns
    - List of matching ingredients

  ## Examples

      iex> search_ingredients(business_id, "chicken")
      [%Ingredient{name: "Chicken Breast"}, %Ingredient{name: "Chicken Thigh"}]

      iex> search_ingredients(business_id, "xyz")
      []
  """
  def search_ingredients(business_id, query) when is_binary(query) do
    search_pattern = "%#{query}%"

    from(i in Ingredient,
      where: i.business_id == ^business_id,
      where: i.status == "active",
      where: ilike(i.name, ^search_pattern),
      order_by: i.name
    )
    |> Repo.all()
  end

  # ============================================
  # RECIPE MANAGEMENT
  # ============================================

  alias Easy.Nutrition.Recipe

  @doc """
  Creates a recipe within a business context.

  ## Parameters
    - business_id: The business ID (UUID)
    - coach_id: The coach ID creating the recipe (UUID)
    - attrs: Map of recipe attributes (name, description, instructions, etc.)

  ## Returns
    - {:ok, recipe} on success
    - {:error, changeset} on validation failure
    - {:error, :unauthorized} if coach doesn't belong to business

  ## Examples

      iex> create_recipe(business_id, coach_id, %{name: "Grilled Chicken", servings: 4})
      {:ok, %Recipe{}}

      iex> create_recipe(business_id, coach_id, %{name: ""})
      {:error, %Ecto.Changeset{}}
  """
  def create_recipe(business_id, coach_id, attrs) do
    with {:ok, _coach} <- validate_coach_in_business(coach_id, business_id) do
      attrs_with_ids =
        attrs
        |> Map.put(:business_id, business_id)
        |> Map.put(:created_by_id, coach_id)

      %Recipe{}
      |> Recipe.create_changeset(attrs_with_ids)
      |> Repo.insert()
    end
  end

  @doc """
  Gets a recipe by ID with optional preloading.

  ## Parameters
    - id: The recipe ID
    - preload: List of associations to preload (default: [])
      - :recipe_ingredients - Preload recipe ingredients
      - :ingredients - Preload ingredients through recipe_ingredients
      - :business - Preload business
      - :created_by - Preload coach who created the recipe

  ## Returns
    - Recipe struct or nil if not found

  ## Examples

      iex> get_recipe("123e4567-e89b-12d3-a456-426614174000")
      %Recipe{}

      iex> get_recipe("123e4567-e89b-12d3-a456-426614174000", [:recipe_ingredients, :ingredients])
      %Recipe{recipe_ingredients: [...], ingredients: [...]}

      iex> get_recipe("nonexistent-id")
      nil
  """
  def get_recipe(id, preload \\ []) do
    case Repo.get(Recipe, id) do
      nil -> nil
      recipe -> Repo.preload(recipe, preload)
    end
  end

  @doc """
  Lists recipes within a business context with optional filtering and pagination.

  ## Parameters
    - business_id: The business ID
    - opts: Options for filtering and pagination
      - :limit - Number of items per page (default: 50)
      - :offset - Number of items to skip (default: 0)
      - :status - Filter by status (default: "active")
      - :order_by - Field to order by (default: :name)

  ## Returns
    - List of recipes

  ## Examples

      iex> list_recipes(business_id)
      [%Recipe{}, %Recipe{}]

      iex> list_recipes(business_id, limit: 10, offset: 0, status: "active")
      [%Recipe{}]
  """
  def list_recipes(business_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)
    status = Keyword.get(opts, :status, "active")
    order_by = Keyword.get(opts, :order_by, :name)

    from(r in Recipe,
      where: r.business_id == ^business_id,
      where: r.status == ^status,
      order_by: ^order_by,
      limit: ^limit,
      offset: ^offset
    )
    |> Repo.all()
  end

  @doc """
  Updates a recipe with the given attributes.

  Validates that the recipe belongs to the same business as the coach.

  ## Parameters
    - recipe: The recipe struct to update
    - coach_id: The coach ID performing the update
    - attrs: Map of attributes to update

  ## Returns
    - {:ok, recipe} on success
    - {:error, changeset} on validation failure
    - {:error, :unauthorized} if coach doesn't belong to the same business as the recipe

  ## Examples

      iex> update_recipe(recipe, coach_id, %{name: "Updated Recipe Name"})
      {:ok, %Recipe{}}

      iex> update_recipe(recipe, coach_id, %{servings: -1})
      {:error, %Ecto.Changeset{}}

      iex> update_recipe(recipe, other_coach_id, %{name: "Updated Recipe Name"})
      {:error, :unauthorized}
  """
  def update_recipe(%Recipe{} = recipe, coach_id, attrs) do
    with {:ok, _coach} <- validate_coach_in_business(coach_id, recipe.business_id) do
      recipe
      |> Recipe.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @doc """
  Deletes a recipe.

  Prevents deletion if the recipe is used in any meals.
  Validates that the coach belongs to the same business as the recipe.

  ## Parameters
    - recipe: The recipe struct to delete
    - coach_id: The coach ID performing the deletion

  ## Returns
    - {:ok, recipe} on success
    - {:error, :recipe_in_use} if recipe is referenced by meals
    - {:error, :unauthorized} if coach doesn't belong to the same business as the recipe

  ## Examples

      iex> delete_recipe(recipe, coach_id)
      {:ok, %Recipe{}}

      iex> delete_recipe(recipe_in_use, coach_id)
      {:error, :recipe_in_use}

      iex> delete_recipe(recipe, other_coach_id)
      {:error, :unauthorized}
  """
  def delete_recipe(%Recipe{} = recipe, coach_id) do
    with {:ok, _coach} <- validate_coach_in_business(coach_id, recipe.business_id) do
      if recipe_in_use?(recipe.id) do
        {:error, :recipe_in_use}
      else
        Repo.delete(recipe)
      end
    end
  end

  @doc """
  Searches for recipes by name within a business context.

  Performs a case-insensitive search on recipe names.

  ## Parameters
    - business_id: The business ID
    - query: Search string to match against recipe names

  ## Returns
    - List of matching recipes

  ## Examples

      iex> search_recipes(business_id, "chicken")
      [%Recipe{name: "Grilled Chicken"}, %Recipe{name: "Chicken Salad"}]

      iex> search_recipes(business_id, "xyz")
      []
  """
  def search_recipes(business_id, query) when is_binary(query) do
    search_pattern = "%#{query}%"

    from(r in Recipe,
      where: r.business_id == ^business_id,
      where: r.status == "active",
      where: ilike(r.name, ^search_pattern),
      order_by: r.name
    )
    |> Repo.all()
  end

  # ============================================
  # RECIPE INGREDIENT MANAGEMENT
  # ============================================

  alias Easy.Nutrition.RecipeIngredient

  @doc """
  Adds an ingredient to a recipe with specified quantity and unit.

  Validates that both recipe and ingredient exist and belong to the same business.
  Prevents duplicate ingredients in the same recipe.

  ## Parameters
    - recipe_id: The recipe ID (UUID)
    - ingredient_id: The ingredient ID (UUID)
    - quantity: The amount of ingredient (positive decimal)
    - unit: The unit of measurement (g, kg, ml, l, cup, tbsp, tsp, oz, lb)
    - coach_id: The coach ID performing the operation (optional, for validation)

  ## Returns
    - {:ok, recipe_ingredient} on success
    - {:error, changeset} on validation failure
    - {:error, :recipe_not_found} if recipe doesn't exist
    - {:error, :ingredient_not_found} if ingredient doesn't exist
    - {:error, :business_mismatch} if recipe and ingredient belong to different businesses
    - {:error, :unauthorized} if coach doesn't belong to the recipe's business

  ## Examples

      iex> add_ingredient_to_recipe(recipe_id, ingredient_id, Decimal.new("200"), "g")
      {:ok, %RecipeIngredient{}}

      iex> add_ingredient_to_recipe(recipe_id, ingredient_id, Decimal.new("-10"), "g")
      {:error, %Ecto.Changeset{}}

      iex> add_ingredient_to_recipe(recipe_id, ingredient_id, Decimal.new("100"), "g")
      {:error, %Ecto.Changeset{errors: [recipe_id: {"ingredient already added to this recipe", ...}]}}
  """
  def add_ingredient_to_recipe(recipe_id, ingredient_id, quantity, unit, coach_id \\ nil) do
    with {:ok, recipe} <- fetch_recipe(recipe_id),
         {:ok, ingredient} <- fetch_ingredient(ingredient_id),
         :ok <- validate_same_business(recipe.business_id, ingredient.business_id),
         :ok <- maybe_validate_coach(coach_id, recipe.business_id) do
      attrs = %{
        recipe_id: recipe_id,
        ingredient_id: ingredient_id,
        quantity: quantity,
        unit: unit
      }

      %RecipeIngredient{}
      |> RecipeIngredient.create_changeset(attrs)
      |> Repo.insert()
    end
  end

  @doc """
  Removes an ingredient from a recipe.

  ## Parameters
    - recipe_id: The recipe ID (UUID)
    - ingredient_id: The ingredient ID (UUID)
    - coach_id: The coach ID performing the operation (optional, for validation)

  ## Returns
    - {:ok, recipe_ingredient} on success
    - {:error, :not_found} if the recipe-ingredient association doesn't exist
    - {:error, :unauthorized} if coach doesn't belong to the recipe's business

  ## Examples

      iex> remove_ingredient_from_recipe(recipe_id, ingredient_id)
      {:ok, %RecipeIngredient{}}

      iex> remove_ingredient_from_recipe(recipe_id, nonexistent_ingredient_id)
      {:error, :not_found}
  """
  def remove_ingredient_from_recipe(recipe_id, ingredient_id, coach_id \\ nil) do
    with {:ok, recipe} <- fetch_recipe(recipe_id),
         :ok <- maybe_validate_coach(coach_id, recipe.business_id) do
      query =
        from ri in RecipeIngredient,
          where: ri.recipe_id == ^recipe_id and ri.ingredient_id == ^ingredient_id

      case Repo.one(query) do
        nil -> {:error, :not_found}
        recipe_ingredient -> Repo.delete(recipe_ingredient)
      end
    end
  end

  @doc """
  Updates a recipe ingredient's quantity, unit, or notes.

  ## Parameters
    - recipe_id: The recipe ID (UUID)
    - ingredient_id: The ingredient ID (UUID)
    - attrs: Map of attributes to update (quantity, unit, notes)
    - coach_id: The coach ID performing the operation (optional, for validation)

  ## Returns
    - {:ok, recipe_ingredient} on success
    - {:error, changeset} on validation failure
    - {:error, :not_found} if the recipe-ingredient association doesn't exist
    - {:error, :unauthorized} if coach doesn't belong to the recipe's business

  ## Examples

      iex> update_recipe_ingredient(recipe_id, ingredient_id, %{quantity: Decimal.new("300")})
      {:ok, %RecipeIngredient{}}

      iex> update_recipe_ingredient(recipe_id, ingredient_id, %{unit: "kg"})
      {:ok, %RecipeIngredient{}}

      iex> update_recipe_ingredient(recipe_id, ingredient_id, %{quantity: Decimal.new("-10")})
      {:error, %Ecto.Changeset{}}

      iex> update_recipe_ingredient(recipe_id, nonexistent_ingredient_id, %{quantity: Decimal.new("100")})
      {:error, :not_found}
  """
  def update_recipe_ingredient(recipe_id, ingredient_id, attrs, coach_id \\ nil) do
    with {:ok, recipe} <- fetch_recipe(recipe_id),
         :ok <- maybe_validate_coach(coach_id, recipe.business_id) do
      query =
        from ri in RecipeIngredient,
          where: ri.recipe_id == ^recipe_id and ri.ingredient_id == ^ingredient_id

      case Repo.one(query) do
        nil ->
          {:error, :not_found}

        recipe_ingredient ->
          recipe_ingredient
          |> RecipeIngredient.update_changeset(attrs)
          |> Repo.update()
      end
    end
  end

  # ============================================
  # VALIDATION HELPERS
  # ============================================

  alias Easy.Nutrition.Meal

  @doc """
  Validates that a coach belongs to a specific business.

  ## Parameters
    - coach_id: The coach ID
    - business_id: The business ID

  ## Returns
    - {:ok, coach} if coach belongs to business
    - {:error, :unauthorized} if coach doesn't belong to business or doesn't exist

  ## Examples

      iex> validate_coach_in_business(coach_id, business_id)
      {:ok, %Coach{}}

      iex> validate_coach_in_business(other_coach_id, business_id)
      {:error, :unauthorized}
  """
  def validate_coach_in_business(coach_id, business_id) do
    query =
      from c in Coach,
        where: c.id == ^coach_id and c.business_id == ^business_id

    case Repo.one(query) do
      nil -> {:error, :unauthorized}
      coach -> {:ok, coach}
    end
  end

  @doc """
  Validates that a resource (ingredient, recipe, or meal) belongs to a specific business.

  ## Parameters
    - resource: The resource struct (Ingredient, Recipe, or Meal)
    - business_id: The business ID to validate against

  ## Returns
    - :ok if resource belongs to business
    - {:error, :unauthorized} if resource doesn't belong to business

  ## Examples

      iex> validate_resource_in_business(%Ingredient{business_id: business_id}, business_id)
      :ok

      iex> validate_resource_in_business(%Recipe{business_id: other_business_id}, business_id)
      {:error, :unauthorized}
  """
  def validate_resource_in_business(resource, business_id) when is_struct(resource) do
    if resource.business_id == business_id do
      :ok
    else
      {:error, :unauthorized}
    end
  end

  @doc """
  Validates that an ingredient belongs to a specific business by ID.

  ## Parameters
    - ingredient_id: The ingredient ID
    - business_id: The business ID to validate against

  ## Returns
    - {:ok, ingredient} if ingredient belongs to business
    - {:error, :unauthorized} if ingredient doesn't belong to business or doesn't exist

  ## Examples

      iex> validate_ingredient_in_business(ingredient_id, business_id)
      {:ok, %Ingredient{}}

      iex> validate_ingredient_in_business(other_ingredient_id, business_id)
      {:error, :unauthorized}
  """
  def validate_ingredient_in_business(ingredient_id, business_id) do
    query =
      from i in Ingredient,
        where: i.id == ^ingredient_id and i.business_id == ^business_id

    case Repo.one(query) do
      nil -> {:error, :unauthorized}
      ingredient -> {:ok, ingredient}
    end
  end

  @doc """
  Validates that a recipe belongs to a specific business by ID.

  ## Parameters
    - recipe_id: The recipe ID
    - business_id: The business ID to validate against

  ## Returns
    - {:ok, recipe} if recipe belongs to business
    - {:error, :unauthorized} if recipe doesn't belong to business or doesn't exist

  ## Examples

      iex> validate_recipe_in_business(recipe_id, business_id)
      {:ok, %Recipe{}}

      iex> validate_recipe_in_business(other_recipe_id, business_id)
      {:error, :unauthorized}
  """
  def validate_recipe_in_business(recipe_id, business_id) do
    query =
      from r in Recipe,
        where: r.id == ^recipe_id and r.business_id == ^business_id

    case Repo.one(query) do
      nil -> {:error, :unauthorized}
      recipe -> {:ok, recipe}
    end
  end

  @doc """
  Validates that a meal belongs to a specific business by ID.

  ## Parameters
    - meal_id: The meal ID
    - business_id: The business ID to validate against

  ## Returns
    - {:ok, meal} if meal belongs to business
    - {:error, :unauthorized} if meal doesn't belong to business or doesn't exist

  ## Examples

      iex> validate_meal_in_business(meal_id, business_id)
      {:ok, %Meal{}}

      iex> validate_meal_in_business(other_meal_id, business_id)
      {:error, :unauthorized}
  """
  def validate_meal_in_business(meal_id, business_id) do
    query =
      from m in Meal,
        where: m.id == ^meal_id and m.business_id == ^business_id

    case Repo.one(query) do
      nil -> {:error, :unauthorized}
      meal -> {:ok, meal}
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Fetches a recipe by ID
  defp fetch_recipe(recipe_id) do
    case Repo.get(Recipe, recipe_id) do
      nil -> {:error, :recipe_not_found}
      recipe -> {:ok, recipe}
    end
  end

  # Fetches an ingredient by ID
  defp fetch_ingredient(ingredient_id) do
    case Repo.get(Ingredient, ingredient_id) do
      nil -> {:error, :ingredient_not_found}
      ingredient -> {:ok, ingredient}
    end
  end

  # Validates that two entities belong to the same business
  defp validate_same_business(business_id1, business_id2) do
    if business_id1 == business_id2 do
      :ok
    else
      {:error, :business_mismatch}
    end
  end

  # Validates coach if coach_id is provided, otherwise skips validation
  defp maybe_validate_coach(nil, _business_id), do: :ok

  defp maybe_validate_coach(coach_id, business_id) do
    case validate_coach_in_business(coach_id, business_id) do
      {:ok, _coach} -> :ok
      error -> error
    end
  end

  # Checks if an ingredient is used in any recipes or meals
  defp ingredient_in_use?(ingredient_id) do
    # Check if ingredient is used in recipe_ingredients
    recipe_ingredient_query =
      from ri in "recipe_ingredients",
        where: ri.ingredient_id == ^ingredient_id,
        select: count(ri.id)

    # Check if ingredient is used in meal_ingredients
    meal_ingredient_query =
      from mi in "meal_ingredients",
        where: mi.ingredient_id == ^ingredient_id,
        select: count(mi.id)

    recipe_count = Repo.one(recipe_ingredient_query) || 0
    meal_count = Repo.one(meal_ingredient_query) || 0

    recipe_count > 0 || meal_count > 0
  end

  # Checks if a recipe is used in any meals
  defp recipe_in_use?(recipe_id) do
    # Check if recipe is used in meal_recipes
    meal_recipe_query =
      from mr in "meal_recipes",
        where: mr.recipe_id == ^recipe_id,
        select: count(mr.id)

    count = Repo.one(meal_recipe_query) || 0
    count > 0
  end

  # ============================================
  # MEAL MANAGEMENT
  # ============================================

  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealRecipe
  alias Easy.Nutrition.MealIngredient

  @doc """
  Creates a meal within a business context.

  ## Parameters
    - business_id: The business ID (UUID)
    - coach_id: The coach ID creating the meal (UUID)
    - attrs: Map of meal attributes (name, description, meal_type, etc.)

  ## Returns
    - {:ok, meal} on success
    - {:error, changeset} on validation failure
    - {:error, :unauthorized} if coach doesn't belong to business

  ## Examples

      iex> create_meal(business_id, coach_id, %{name: "Breakfast Bowl", meal_type: "breakfast"})
      {:ok, %Meal{}}

      iex> create_meal(business_id, coach_id, %{name: ""})
      {:error, %Ecto.Changeset{}}
  """
  def create_meal(business_id, coach_id, attrs) do
    with {:ok, _coach} <- validate_coach_in_business(coach_id, business_id) do
      attrs_with_ids =
        attrs
        |> Map.put(:business_id, business_id)
        |> Map.put(:created_by_id, coach_id)

      %Meal{}
      |> Meal.create_changeset(attrs_with_ids)
      |> Repo.insert()
    end
  end

  @doc """
  Gets a meal by ID with optional preloading.

  ## Parameters
    - id: The meal ID
    - preload: List of associations to preload (default: [])
      - :meal_recipes - Preload meal recipes
      - :meal_ingredients - Preload meal ingredients
      - :recipes - Preload recipes through meal_recipes
      - :ingredients - Preload ingredients through meal_ingredients
      - :business - Preload business
      - :created_by - Preload coach who created the meal

  ## Returns
    - Meal struct or nil if not found

  ## Examples

      iex> get_meal("123e4567-e89b-12d3-a456-426614174000")
      %Meal{}

      iex> get_meal("123e4567-e89b-12d3-a456-426614174000", [:meal_recipes, :meal_ingredients])
      %Meal{meal_recipes: [...], meal_ingredients: [...]}

      iex> get_meal("nonexistent-id")
      nil
  """
  def get_meal(id, preload \\ []) do
    case Repo.get(Meal, id) do
      nil -> nil
      meal -> Repo.preload(meal, preload)
    end
  end

  @doc """
  Lists meals within a business context with optional filtering and pagination.

  ## Parameters
    - business_id: The business ID
    - opts: Options for filtering and pagination
      - :limit - Number of items per page (default: 50)
      - :offset - Number of items to skip (default: 0)
      - :status - Filter by status (default: "active")
      - :meal_type - Filter by meal type (optional)
      - :order_by - Field to order by (default: :name)

  ## Returns
    - List of meals

  ## Examples

      iex> list_meals(business_id)
      [%Meal{}, %Meal{}]

      iex> list_meals(business_id, limit: 10, meal_type: "breakfast")
      [%Meal{meal_type: "breakfast"}]
  """
  def list_meals(business_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)
    status = Keyword.get(opts, :status, "active")
    meal_type = Keyword.get(opts, :meal_type)
    order_by = Keyword.get(opts, :order_by, :name)

    query =
      from(m in Meal,
        where: m.business_id == ^business_id,
        where: m.status == ^status,
        order_by: ^order_by,
        limit: ^limit,
        offset: ^offset
      )

    query =
      if meal_type do
        from m in query, where: m.meal_type == ^meal_type
      else
        query
      end

    Repo.all(query)
  end

  @doc """
  Updates a meal with the given attributes.

  Validates that the meal belongs to the same business as the coach.

  ## Parameters
    - meal: The meal struct to update
    - coach_id: The coach ID performing the update
    - attrs: Map of attributes to update

  ## Returns
    - {:ok, meal} on success
    - {:error, changeset} on validation failure
    - {:error, :unauthorized} if coach doesn't belong to the same business as the meal

  ## Examples

      iex> update_meal(meal, coach_id, %{name: "Updated Meal Name"})
      {:ok, %Meal{}}

      iex> update_meal(meal, coach_id, %{meal_type: "invalid"})
      {:error, %Ecto.Changeset{}}

      iex> update_meal(meal, other_coach_id, %{name: "Updated Meal Name"})
      {:error, :unauthorized}
  """
  def update_meal(%Meal{} = meal, coach_id, attrs) do
    with {:ok, _coach} <- validate_coach_in_business(coach_id, meal.business_id) do
      meal
      |> Meal.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @doc """
  Deletes a meal.

  Cascades to delete all associated meal_recipes and meal_ingredients.
  Validates that the coach belongs to the same business as the meal.

  ## Parameters
    - meal: The meal struct to delete
    - coach_id: The coach ID performing the deletion

  ## Returns
    - {:ok, meal} on success
    - {:error, changeset} on failure
    - {:error, :unauthorized} if coach doesn't belong to the same business as the meal

  ## Examples

      iex> delete_meal(meal, coach_id)
      {:ok, %Meal{}}

      iex> delete_meal(meal, other_coach_id)
      {:error, :unauthorized}
  """
  def delete_meal(%Meal{} = meal, coach_id) do
    with {:ok, _coach} <- validate_coach_in_business(coach_id, meal.business_id) do
      Repo.delete(meal)
    end
  end

  # ============================================
  # MEAL COMPONENT MANAGEMENT
  # ============================================

  @doc """
  Adds a recipe to a meal with a serving multiplier.

  Validates that both meal and recipe exist and belong to the same business.
  Prevents duplicate recipes in the same meal.

  ## Parameters
    - meal_id: The meal ID (UUID)
    - recipe_id: The recipe ID (UUID)
    - servings: The serving multiplier (positive decimal, default: 1.0)
    - coach_id: The coach ID performing the operation (optional, for validation)

  ## Returns
    - {:ok, meal_recipe} on success
    - {:error, changeset} on validation failure
    - {:error, :meal_not_found} if meal doesn't exist
    - {:error, :recipe_not_found} if recipe doesn't exist
    - {:error, :business_mismatch} if meal and recipe belong to different businesses
    - {:error, :unauthorized} if coach doesn't belong to the meal's business

  ## Examples

      iex> add_recipe_to_meal(meal_id, recipe_id, Decimal.new("1.5"))
      {:ok, %MealRecipe{}}

      iex> add_recipe_to_meal(meal_id, recipe_id, Decimal.new("-1"))
      {:error, %Ecto.Changeset{}}

      iex> add_recipe_to_meal(meal_id, recipe_id, Decimal.new("1"))
      {:error, %Ecto.Changeset{errors: [recipe_id: {"recipe already added to this meal", ...}]}}
  """
  def add_recipe_to_meal(meal_id, recipe_id, servings \\ Decimal.new("1.0"), coach_id \\ nil) do
    with {:ok, meal} <- fetch_meal(meal_id),
         {:ok, recipe} <- fetch_recipe(recipe_id),
         :ok <- validate_same_business(meal.business_id, recipe.business_id),
         :ok <- maybe_validate_coach(coach_id, meal.business_id) do
      attrs = %{
        meal_id: meal_id,
        recipe_id: recipe_id,
        servings: servings
      }

      %MealRecipe{}
      |> MealRecipe.create_changeset(attrs)
      |> Repo.insert()
    end
  end

  @doc """
  Adds an ingredient directly to a meal with specified quantity and unit.

  Validates that both meal and ingredient exist and belong to the same business.

  ## Parameters
    - meal_id: The meal ID (UUID)
    - ingredient_id: The ingredient ID (UUID)
    - quantity: The amount of ingredient (positive decimal)
    - unit: The unit of measurement (g, kg, ml, l, cup, tbsp, tsp, oz, lb)
    - coach_id: The coach ID performing the operation (optional, for validation)

  ## Returns
    - {:ok, meal_ingredient} on success
    - {:error, changeset} on validation failure
    - {:error, :meal_not_found} if meal doesn't exist
    - {:error, :ingredient_not_found} if ingredient doesn't exist
    - {:error, :business_mismatch} if meal and ingredient belong to different businesses
    - {:error, :unauthorized} if coach doesn't belong to the meal's business

  ## Examples

      iex> add_ingredient_to_meal(meal_id, ingredient_id, Decimal.new("100"), "g")
      {:ok, %MealIngredient{}}

      iex> add_ingredient_to_meal(meal_id, ingredient_id, Decimal.new("-10"), "g")
      {:error, %Ecto.Changeset{}}

      iex> add_ingredient_to_meal(meal_id, ingredient_id, Decimal.new("100"), "invalid")
      {:error, %Ecto.Changeset{}}
  """
  def add_ingredient_to_meal(meal_id, ingredient_id, quantity, unit, coach_id \\ nil) do
    with {:ok, meal} <- fetch_meal(meal_id),
         {:ok, ingredient} <- fetch_ingredient(ingredient_id),
         :ok <- validate_same_business(meal.business_id, ingredient.business_id),
         :ok <- maybe_validate_coach(coach_id, meal.business_id) do
      attrs = %{
        meal_id: meal_id,
        ingredient_id: ingredient_id,
        quantity: quantity,
        unit: unit
      }

      %MealIngredient{}
      |> MealIngredient.create_changeset(attrs)
      |> Repo.insert()
    end
  end

  @doc """
  Removes a recipe from a meal.

  ## Parameters
    - meal_id: The meal ID (UUID)
    - recipe_id: The recipe ID (UUID)
    - coach_id: The coach ID performing the operation (optional, for validation)

  ## Returns
    - {:ok, meal_recipe} on success
    - {:error, :not_found} if the meal-recipe association doesn't exist
    - {:error, :unauthorized} if coach doesn't belong to the meal's business

  ## Examples

      iex> remove_recipe_from_meal(meal_id, recipe_id)
      {:ok, %MealRecipe{}}

      iex> remove_recipe_from_meal(meal_id, nonexistent_recipe_id)
      {:error, :not_found}
  """
  def remove_recipe_from_meal(meal_id, recipe_id, coach_id \\ nil) do
    with {:ok, meal} <- fetch_meal(meal_id),
         :ok <- maybe_validate_coach(coach_id, meal.business_id) do
      query =
        from mr in MealRecipe,
          where: mr.meal_id == ^meal_id and mr.recipe_id == ^recipe_id

      case Repo.one(query) do
        nil -> {:error, :not_found}
        meal_recipe -> Repo.delete(meal_recipe)
      end
    end
  end

  @doc """
  Removes an ingredient from a meal.

  ## Parameters
    - meal_id: The meal ID (UUID)
    - ingredient_id: The ingredient ID (UUID)
    - coach_id: The coach ID performing the operation (optional, for validation)

  ## Returns
    - {:ok, meal_ingredient} on success
    - {:error, :not_found} if the meal-ingredient association doesn't exist
    - {:error, :unauthorized} if coach doesn't belong to the meal's business

  ## Examples

      iex> remove_ingredient_from_meal(meal_id, ingredient_id)
      {:ok, %MealIngredient{}}

      iex> remove_ingredient_from_meal(meal_id, nonexistent_ingredient_id)
      {:error, :not_found}
  """
  def remove_ingredient_from_meal(meal_id, ingredient_id, coach_id \\ nil) do
    with {:ok, meal} <- fetch_meal(meal_id),
         :ok <- maybe_validate_coach(coach_id, meal.business_id) do
      query =
        from mi in MealIngredient,
          where: mi.meal_id == ^meal_id and mi.ingredient_id == ^ingredient_id

      case Repo.one(query) do
        nil -> {:error, :not_found}
        meal_ingredient -> Repo.delete(meal_ingredient)
      end
    end
  end

  @doc """
  Updates a meal recipe's servings or notes.

  ## Parameters
    - meal_id: The meal ID (UUID)
    - recipe_id: The recipe ID (UUID)
    - attrs: Map of attributes to update (servings, notes)
    - coach_id: The coach ID performing the operation (optional, for validation)

  ## Returns
    - {:ok, meal_recipe} on success
    - {:error, changeset} on validation failure
    - {:error, :not_found} if the meal-recipe association doesn't exist
    - {:error, :unauthorized} if coach doesn't belong to the meal's business

  ## Examples

      iex> update_meal_recipe(meal_id, recipe_id, %{servings: Decimal.new("2.0")})
      {:ok, %MealRecipe{}}

      iex> update_meal_recipe(meal_id, recipe_id, %{notes: "Double portion"})
      {:ok, %MealRecipe{}}

      iex> update_meal_recipe(meal_id, recipe_id, %{servings: Decimal.new("-1")})
      {:error, %Ecto.Changeset{}}

      iex> update_meal_recipe(meal_id, nonexistent_recipe_id, %{servings: Decimal.new("2")})
      {:error, :not_found}
  """
  def update_meal_recipe(meal_id, recipe_id, attrs, coach_id \\ nil) do
    with {:ok, meal} <- fetch_meal(meal_id),
         :ok <- maybe_validate_coach(coach_id, meal.business_id) do
      query =
        from mr in MealRecipe,
          where: mr.meal_id == ^meal_id and mr.recipe_id == ^recipe_id

      case Repo.one(query) do
        nil ->
          {:error, :not_found}

        meal_recipe ->
          meal_recipe
          |> MealRecipe.update_changeset(attrs)
          |> Repo.update()
      end
    end
  end

  @doc """
  Updates a meal ingredient's quantity, unit, or notes.

  ## Parameters
    - meal_id: The meal ID (UUID)
    - ingredient_id: The ingredient ID (UUID)
    - attrs: Map of attributes to update (quantity, unit, notes)
    - coach_id: The coach ID performing the operation (optional, for validation)

  ## Returns
    - {:ok, meal_ingredient} on success
    - {:error, changeset} on validation failure
    - {:error, :not_found} if the meal-ingredient association doesn't exist
    - {:error, :unauthorized} if coach doesn't belong to the meal's business

  ## Examples

      iex> update_meal_ingredient(meal_id, ingredient_id, %{quantity: Decimal.new("200")})
      {:ok, %MealIngredient{}}

      iex> update_meal_ingredient(meal_id, ingredient_id, %{unit: "kg"})
      {:ok, %MealIngredient{}}

      iex> update_meal_ingredient(meal_id, ingredient_id, %{quantity: Decimal.new("-10")})
      {:error, %Ecto.Changeset{}}

      iex> update_meal_ingredient(meal_id, nonexistent_ingredient_id, %{quantity: Decimal.new("100")})
      {:error, :not_found}
  """
  def update_meal_ingredient(meal_id, ingredient_id, attrs, coach_id \\ nil) do
    with {:ok, meal} <- fetch_meal(meal_id),
         :ok <- maybe_validate_coach(coach_id, meal.business_id) do
      query =
        from mi in MealIngredient,
          where: mi.meal_id == ^meal_id and mi.ingredient_id == ^ingredient_id

      case Repo.one(query) do
        nil ->
          {:error, :not_found}

        meal_ingredient ->
          meal_ingredient
          |> MealIngredient.update_changeset(attrs)
          |> Repo.update()
      end
    end
  end

  # ============================================
  # NUTRITIONAL CALCULATIONS
  # ============================================

  alias Easy.Nutrition.Calculations

  @doc """
  Calculates and updates the total nutritional values for a meal.

  Aggregates nutrition from:
  - Meal recipes: recipe totals multiplied by servings
  - Meal ingredients: ingredient values scaled by quantity

  Updates the meal's cached nutrition totals (total_calories, total_protein, etc.).

  ## Parameters
    - meal_id: The meal ID (UUID)

  ## Returns
    - {:ok, meal} with updated nutrition totals on success
    - {:error, :meal_not_found} if meal doesn't exist

  ## Examples

      iex> calculate_meal_nutrition(meal_id)
      {:ok, %Meal{total_calories: #Decimal<500>, ...}}

      iex> calculate_meal_nutrition("nonexistent-id")
      {:error, :meal_not_found}
  """
  def calculate_meal_nutrition(meal_id) do
    # Fetch meal with all necessary preloads
    meal =
      Meal
      |> Repo.get(meal_id)
      |> Repo.preload(
        meal_recipes: [recipe: []],
        meal_ingredients: [ingredient: []]
      )

    case meal do
      nil ->
        {:error, :meal_not_found}

      meal ->
        # Calculate nutrition from meal recipes
        recipe_nutrition = calculate_meal_recipes_nutrition(meal.meal_recipes)

        # Calculate nutrition from meal ingredients
        ingredient_nutrition = calculate_meal_ingredients_nutrition(meal.meal_ingredients)

        # Sum all nutritional values
        total_nutrition =
          Calculations.sum_nutritional_values([recipe_nutrition, ingredient_nutrition])

        # Update meal with calculated totals
        meal
        |> Meal.update_changeset(%{
          total_calories: total_nutrition.calories,
          total_protein: total_nutrition.protein,
          total_carbohydrates: total_nutrition.carbohydrates,
          total_fats: total_nutrition.fats,
          total_fiber: total_nutrition.fiber
        })
        |> Repo.update()
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Calculates nutrition from meal recipes
  defp calculate_meal_recipes_nutrition(meal_recipes) do
    meal_recipes
    |> Enum.map(fn meal_recipe ->
      recipe = meal_recipe.recipe
      servings = meal_recipe.servings

      # Multiply recipe totals by servings
      %{
        calories: multiply_or_zero(recipe.total_calories, servings),
        protein: multiply_or_zero(recipe.total_protein, servings),
        carbohydrates: multiply_or_zero(recipe.total_carbohydrates, servings),
        fats: multiply_or_zero(recipe.total_fats, servings),
        fiber: multiply_or_zero(recipe.total_fiber, servings)
      }
    end)
    |> Calculations.sum_nutritional_values()
  end

  # Calculates nutrition from meal ingredients
  defp calculate_meal_ingredients_nutrition(meal_ingredients) do
    meal_ingredients
    |> Enum.map(fn meal_ingredient ->
      ingredient = meal_ingredient.ingredient

      quantity_grams =
        Calculations.convert_to_grams(meal_ingredient.quantity, meal_ingredient.unit)

      # Calculate ingredient nutrition based on quantity
      Calculations.calculate_ingredient_nutrition(ingredient, quantity_grams)
    end)
    |> Calculations.sum_nutritional_values()
  end

  # Helper to multiply nutritional values or return zero if nil
  defp multiply_or_zero(nil, _multiplier), do: Decimal.new(0)

  defp multiply_or_zero(value, multiplier) do
    Decimal.mult(value, multiplier)
  end

  # Fetches a meal by ID
  defp fetch_meal(meal_id) do
    case Repo.get(Meal, meal_id) do
      nil -> {:error, :meal_not_found}
      meal -> {:ok, meal}
    end
  end

  # ============================================
  # MEAL DUPLICATION
  # ============================================

  @doc """
  Duplicates an existing meal with all its recipes and ingredients.

  Creates a new meal with:
  - All meal_recipes copied with their servings
  - All meal_ingredients copied with their quantities
  - " (Copy)" appended to the meal name
  - Recalculated nutritional values
  - Same business association

  ## Parameters
    - meal_id: The meal ID to duplicate (UUID)
    - coach_id: The coach ID creating the duplicate (UUID)

  ## Returns
    - {:ok, meal} with the duplicated meal on success
    - {:error, :meal_not_found} if meal doesn't exist
    - {:error, :unauthorized} if coach doesn't belong to the same business as the meal
    - {:error, changeset} on validation failure

  ## Examples

      iex> duplicate_meal(meal_id, coach_id)
      {:ok, %Meal{name: "Original Meal (Copy)", ...}}

      iex> duplicate_meal("nonexistent-id", coach_id)
      {:error, :meal_not_found}
  """
  def duplicate_meal(meal_id, coach_id) do
    # Fetch the original meal with all associations
    meal =
      Meal
      |> Repo.get(meal_id)
      |> Repo.preload([:meal_recipes, :meal_ingredients])

    case meal do
      nil ->
        {:error, :meal_not_found}

      meal ->
        with {:ok, _coach} <- validate_coach_in_business(coach_id, meal.business_id) do
          # Use a transaction to ensure all operations succeed or fail together
          Repo.transaction(fn ->
            # Create the new meal with copied attributes
            new_meal_attrs = %{
              business_id: meal.business_id,
              created_by_id: coach_id,
              name: "#{meal.name} (Copy)",
              description: meal.description,
              meal_type: meal.meal_type,
              notes: meal.notes,
              status: meal.status
            }

            # Create the new meal
            {:ok, new_meal} =
              %Meal{}
              |> Meal.create_changeset(new_meal_attrs)
              |> Repo.insert()

            # Copy all meal_recipes
            Enum.each(meal.meal_recipes, fn meal_recipe ->
              meal_recipe_attrs = %{
                meal_id: new_meal.id,
                recipe_id: meal_recipe.recipe_id,
                servings: meal_recipe.servings,
                notes: meal_recipe.notes
              }

              %MealRecipe{}
              |> MealRecipe.create_changeset(meal_recipe_attrs)
              |> Repo.insert!()
            end)

            # Copy all meal_ingredients
            Enum.each(meal.meal_ingredients, fn meal_ingredient ->
              meal_ingredient_attrs = %{
                meal_id: new_meal.id,
                ingredient_id: meal_ingredient.ingredient_id,
                quantity: meal_ingredient.quantity,
                unit: meal_ingredient.unit,
                notes: meal_ingredient.notes
              }

              %MealIngredient{}
              |> MealIngredient.create_changeset(meal_ingredient_attrs)
              |> Repo.insert!()
            end)

            # Recalculate nutritional values for the new meal
            case calculate_meal_nutrition(new_meal.id) do
              {:ok, updated_meal} -> updated_meal
              {:error, reason} -> Repo.rollback(reason)
            end
          end)
        end
    end
  end
end
