defmodule Easy.Nutrition do
  @moduledoc """
  Nutrition context handles recipe and meal management.

  This is the public API for:
  - Recipe management with embedded ingredients as text arrays
  - Meal management with recipes
  - Manual nutritional value entry for recipes and meals

  ## Architecture

  The nutrition system uses a simplified architecture where:
  - **Recipes** contain embedded ingredient names as a PostgreSQL text array
  - **Meals** contain one or more recipes (no direct ingredient associations)
  - **Nutritional values** are manually entered by coaches, not automatically calculated

  ## Embedded Ingredients

  Ingredients are stored as simple text names within recipes using PostgreSQL's
  native text array type. This eliminates the need for separate ingredient tables
  and join tables, simplifying the data model.

  Example recipe with embedded ingredients:
  ```elixir
  %Recipe{
    name: "Grilled Chicken",
    ingredients: ["Chicken Breast", "Olive Oil", "Garlic", "Salt", "Pepper"],
    total_calories: Decimal.new("350"),
    total_protein: Decimal.new("45"),
    servings: 4
  }
  ```

  ## Manual Nutrition Entry

  Nutritional values (calories, protein, carbohydrates, fats, fiber) are manually
  entered by coaches when creating or updating recipes and meals. The system does
  not perform automatic calculations based on ingredients.

  ## Creating Recipes with Ingredients

  To create a recipe with embedded ingredients:

  ```elixir
  # Create a recipe with ingredient names and manual nutrition values
  {:ok, recipe} = Nutrition.create_recipe(business_id, coach_id, %{
    name: "Grilled Chicken Salad",
    description: "Healthy protein-packed salad",
    servings: 2,
    prep_time_minutes: 20,
    instructions: "1. Grill chicken\\n2. Chop vegetables\\n3. Mix together",
    ingredients: [
      "Chicken Breast",
      "Mixed Greens",
      "Cherry Tomatoes",
      "Cucumber",
      "Olive Oil",
      "Lemon Juice"
    ],
    total_calories: Decimal.new("450"),
    total_protein: Decimal.new("52"),
    total_carbohydrates: Decimal.new("15"),
    total_fats: Decimal.new("18"),
    total_fiber: Decimal.new("5")
  })
  ```

  ## Updating Recipe Ingredients

  To update a recipe's ingredients:

  ```elixir
  # Add or remove ingredients by updating the array
  {:ok, updated_recipe} = Nutrition.update_recipe(recipe, coach_id, %{
    ingredients: [
      "Chicken Breast",
      "Mixed Greens",
      "Cherry Tomatoes",
      "Cucumber",
      "Olive Oil",
      "Lemon Juice",
      "Feta Cheese"  # Added new ingredient
    ]
  })
  ```

  ## Creating Meals with Recipes

  Meals contain only recipes (no direct ingredient associations):

  ```elixir
  # Create a meal
  {:ok, meal} = Nutrition.create_meal(business_id, coach_id, %{
    name: "Lunch",
    meal_type: "lunch",
    total_calories: Decimal.new("650"),
    total_protein: Decimal.new("60")
  })

  # Add recipes to the meal
  {:ok, _meal_recipe} = Nutrition.add_recipe_to_meal(
    meal.id,
    recipe.id,
    Decimal.new("1.0")  # Serving multiplier
  )
  ```

  ## Business Context Isolation

  All resources are scoped to business context for data isolation. Coaches can
  only access and modify recipes and meals within their own business.

  ## Validation

  The system validates:
  - Ingredient names are non-empty strings (max 255 characters)
  - Whitespace is trimmed from ingredient names
  - Nutritional values are non-negative decimals
  - Coaches belong to the same business as the resources they're modifying
  """

  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Coaches.Coach

  # ============================================
  # RECIPE MANAGEMENT
  # ============================================

  alias Easy.Nutrition.Recipe

  @doc """
  Creates a recipe within a business context.

  Recipes contain embedded ingredient names as a text array. Nutritional values
  are manually entered and not automatically calculated.

  ## Parameters
    - business_id: The business ID (UUID)
    - coach_id: The coach ID creating the recipe (UUID)
    - attrs: Map of recipe attributes including:
      - name: Recipe name (required, string)
      - description: Recipe description (optional, string)
      - instructions: Preparation instructions (optional, text)
      - servings: Number of servings (optional, integer, default: 1)
      - prep_time_minutes: Preparation time (optional, integer)
      - ingredients: Array of ingredient names (optional, list of strings)
      - total_calories: Manual calorie entry (optional, decimal)
      - total_protein: Manual protein entry in grams (optional, decimal)
      - total_carbohydrates: Manual carbs entry in grams (optional, decimal)
      - total_fats: Manual fats entry in grams (optional, decimal)
      - total_fiber: Manual fiber entry in grams (optional, decimal)

  ## Returns
    - {:ok, recipe} on success
    - {:error, changeset} on validation failure
    - {:error, :unauthorized} if coach doesn't belong to business

  ## Examples

      # Create a recipe with embedded ingredients and manual nutrition values
      iex> create_recipe(business_id, coach_id, %{
      ...>   name: "Grilled Chicken",
      ...>   servings: 4,
      ...>   ingredients: ["Chicken Breast", "Olive Oil", "Garlic", "Salt"],
      ...>   total_calories: Decimal.new("350"),
      ...>   total_protein: Decimal.new("45")
      ...> })
      {:ok, %Recipe{ingredients: ["Chicken Breast", "Olive Oil", "Garlic", "Salt"]}}

      # Create a recipe without ingredients initially
      iex> create_recipe(business_id, coach_id, %{name: "New Recipe", servings: 2})
      {:ok, %Recipe{ingredients: []}}

      # Validation error for empty name
      iex> create_recipe(business_id, coach_id, %{name: ""})
      {:error, %Ecto.Changeset{}}

      # Validation error for invalid ingredient (empty string)
      iex> create_recipe(business_id, coach_id, %{
      ...>   name: "Recipe",
      ...>   ingredients: ["Valid Ingredient", ""]
      ...> })
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
      - :business - Preload business
      - :created_by - Preload coach who created the recipe

  ## Returns
    - Recipe struct or nil if not found

  ## Examples

      iex> get_recipe("123e4567-e89b-12d3-a456-426614174000")
      %Recipe{}

      iex> get_recipe("123e4567-e89b-12d3-a456-426614174000", [:business, :created_by])
      %Recipe{business: %Business{}, created_by: %Coach{}}

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
  Can update embedded ingredients by providing a new array of ingredient names.

  ## Parameters
    - recipe: The recipe struct to update
    - coach_id: The coach ID performing the update
    - attrs: Map of attributes to update (same as create_recipe/3)

  ## Returns
    - {:ok, recipe} on success
    - {:error, changeset} on validation failure
    - {:error, :unauthorized} if coach doesn't belong to the same business as the recipe

  ## Examples

      # Update recipe name
      iex> update_recipe(recipe, coach_id, %{name: "Updated Recipe Name"})
      {:ok, %Recipe{name: "Updated Recipe Name"}}

      # Update ingredients array (replaces entire array)
      iex> update_recipe(recipe, coach_id, %{
      ...>   ingredients: ["New Ingredient 1", "New Ingredient 2", "New Ingredient 3"]
      ...> })
      {:ok, %Recipe{ingredients: ["New Ingredient 1", "New Ingredient 2", "New Ingredient 3"]}}

      # Update nutritional values
      iex> update_recipe(recipe, coach_id, %{
      ...>   total_calories: Decimal.new("400"),
      ...>   total_protein: Decimal.new("50")
      ...> })
      {:ok, %Recipe{total_calories: #Decimal<400>, total_protein: #Decimal<50>}}

      # Validation error for negative servings
      iex> update_recipe(recipe, coach_id, %{servings: -1})
      {:error, %Ecto.Changeset{}}

      # Authorization error
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

  @doc """
  Creates a meal within a business context.

  Meals contain only recipes (no direct ingredient associations). Nutritional
  values are manually entered and not automatically calculated from recipes.

  ## Parameters
    - business_id: The business ID (UUID)
    - coach_id: The coach ID creating the meal (UUID)
    - attrs: Map of meal attributes including:
      - name: Meal name (required, string)
      - description: Meal description (optional, string)
      - meal_type: Type of meal (optional, string: "breakfast", "lunch", "dinner", "snack")
      - notes: Additional notes (optional, text)
      - total_calories: Manual calorie entry (optional, decimal)
      - total_protein: Manual protein entry in grams (optional, decimal)
      - total_carbohydrates: Manual carbs entry in grams (optional, decimal)
      - total_fats: Manual fats entry in grams (optional, decimal)
      - total_fiber: Manual fiber entry in grams (optional, decimal)

  ## Returns
    - {:ok, meal} on success
    - {:error, changeset} on validation failure
    - {:error, :unauthorized} if coach doesn't belong to business

  ## Examples

      # Create a meal with manual nutrition values
      iex> create_meal(business_id, coach_id, %{
      ...>   name: "Breakfast Bowl",
      ...>   meal_type: "breakfast",
      ...>   total_calories: Decimal.new("550"),
      ...>   total_protein: Decimal.new("30")
      ...> })
      {:ok, %Meal{}}

      # Create a meal without nutrition values (can be added later)
      iex> create_meal(business_id, coach_id, %{name: "Lunch", meal_type: "lunch"})
      {:ok, %Meal{}}

      # Validation error
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
      - :recipes - Preload recipes through meal_recipes (includes embedded ingredients)
      - :business - Preload business
      - :created_by - Preload coach who created the meal

  ## Returns
    - Meal struct or nil if not found

  ## Examples

      iex> get_meal("123e4567-e89b-12d3-a456-426614174000")
      %Meal{}

      # Preload recipes to access their embedded ingredients
      iex> get_meal("123e4567-e89b-12d3-a456-426614174000", [:recipes])
      %Meal{recipes: [%Recipe{ingredients: ["Chicken", "Rice", "Vegetables"]}]}

      iex> get_meal("123e4567-e89b-12d3-a456-426614174000", [:meal_recipes, :business])
      %Meal{meal_recipes: [...], business: %Business{}}

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
  Duplicates an existing meal with all its recipes.

  Creates a new meal with:
  - All meal_recipes copied with their servings
  - Recipes include their embedded ingredients automatically
  - " (Copy)" appended to the meal name
  - Same business association
  - Nutritional values are not copied (must be manually entered)

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
      |> Repo.preload([:meal_recipes])

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

            # Copy all meal_recipes with their embedded ingredients
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

            # Return the new meal (nutritional values are manually entered, not calculated)
            new_meal
          end)
        end
    end
  end
end
