defmodule Easy.Factory do
  use ExMachina.Ecto, repo: Easy.Repo

  alias Easy.Clients.Client
  alias Easy.Identity.User
  alias Easy.Identity.UserSession
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.PlanItem
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient

  def user_factory do
    %User{
      email: sequence(:email, &"user-#{&1}@test.com"),
      first_name: "Test",
      last_name: "User"
    }
  end

  def business_factory do
    %Business{
      name: sequence(:business_name, &"Business #{&1}"),
      handle: sequence(:handle, &"biz-#{&1}"),
      owner: build(:user)
    }
  end

  def coach_factory do
    %Coach{
      name: "Test Coach",
      user: build(:user),
      business: build(:business)
    }
  end

  def user_session_factory do
    %UserSession{
      role: :coach,
      refresh_token: sequence(:refresh_token, &"refresh-token-#{&1}"),
      expires_at: DateTime.add(DateTime.utc_now(:second), 86400, :second),
      user: build(:user)
    }
  end

  def client_factory do
    business = build(:business)
    creator = build(:coach, business: business)

    %Client{
      email: sequence(:client_email, &"client-#{&1}@test.com"),
      first_name: "Test",
      last_name: "Client",
      phone: "123-456-7890",
      notes: "Test client",
      status: :active,
      user: build(:user),
      business: business,
      creator: creator
    }
  end

  def client_attrs_factory do
    %{
      "email" => sequence(:client_invite_email, &"invite-#{&1}@test.com"),
      "first_name" => "Invited",
      "last_name" => "Client",
      "phone" => "123-555-7890",
      "notes" => "Invited via test"
    }
  end

  def food_factory do
    %Food{
      name: sequence(:food_name, &"Food #{&1}"),
      macros: %{"calories" => 200, "protein" => 20, "carbs" => 30, "fat" => 5},
      source: "custom",
      category: "protein",
      tags: ["healthy"],
      notes: "Test food",
      image_url: nil,
      serving_sizes: [],
      creator: build(:coach),
      business: build(:business)
    }
  end

  def food_attrs_factory do
    %{
      "name" => sequence(:food_attr_name, &"New Food #{&1}"),
      "macros" => %{"calories" => 150, "protein" => 10, "carbs" => 20, "fat" => 3},
      "source" => "custom",
      "category" => "grain",
      "tags" => ["test"],
      "notes" => "Created via test",
      "serving_sizes" => [
        %{"unit" => "cup", "weight_g" => 240.0, "amount" => 1.0}
      ]
    }
  end

  def recipe_factory do
    %Recipe{
      name: sequence(:recipe_name, &"Recipe #{&1}"),
      macros: %{"calories" => 400, "protein" => 30, "carbs" => 40, "fat" => 10},
      source: "custom",
      category: "lunch",
      tags: ["healthy"],
      instructions: "Mix and cook.",
      image_url: nil,
      cooked_weight_g: 500.0,
      service_size_type: :serving_based,
      serving_sizes: [],
      recipe_ingredients: [],
      creator: build(:coach),
      business: build(:business)
    }
  end

  def recipe_ingredient_factory do
    %RecipeIngredient{
      food: build(:food),
      weight_g: 100.0,
      amount: 1.0,
      unit: "cup"
    }
  end

  def recipe_attrs_factory do
    %{
      "name" => sequence(:recipe_attr_name, &"New Recipe #{&1}"),
      "source" => "custom",
      "category" => "dinner",
      "tags" => ["test"],
      "instructions" => "Step 1: Cook. Step 2: Eat.",
      "cooked_weight_g" => 600.0,
      "service_size_type" => "serving_based",
      "serving_sizes" => [
        %{"unit" => "serving", "weight_g" => 200.0, "amount" => 1.0}
      ]
    }
  end

  def plan_factory do
    business = build(:business)
    creator = build(:coach, business: business)

    %Plan{
      name: sequence(:plan_name, &"Plan #{&1}"),
      description: "Weekly plan",
      tags: ["balanced"],
      macros_goal: %{"calories" => 2000, "protein" => 150, "carbs" => 200, "fat" => 60},
      type: :template,
      status: :draft,
      creator: creator,
      business: business
    }
  end

  def plan_attrs_factory do
    %{
      "name" => sequence(:plan_attr_name, &"New Plan #{&1}"),
      "description" => "Plan created via test",
      "tags" => ["test"],
      "macros_goal" => %{"calories" => 1800, "protein" => 120, "carbs" => 180, "fat" => 50},
      "type" => "template",
      "status" => "draft"
    }
  end

  def meal_factory do
    plan = build(:plan)

    %Meal{
      name: sequence(:meal_name, &"Meal #{&1}"),
      macros: %{"calories" => 500, "protein" => 40, "carbs" => 50, "fat" => 15},
      position: 0,
      creator: plan.creator,
      business: plan.business,
      plan: plan
    }
  end

  def meal_attrs_factory do
    %{
      "name" => sequence(:meal_attr_name, &"New Meal #{&1}"),
      "macros" => %{"calories" => 450, "protein" => 35, "carbs" => 45, "fat" => 12},
      "position" => 0
    }
  end

  def plan_item_factory do
    plan = build(:plan)
    meal = build(:meal, plan: plan, creator: plan.creator)

    %PlanItem{
      day: "monday",
      meal_type: "breakfast",
      creator: plan.creator,
      business: plan.business,
      plan: plan,
      meal: meal
    }
  end

  def plan_item_attrs_factory do
    %{
      "day" => "monday",
      "meal_type" => "breakfast"
    }
  end

  def meal_item_factory do
    meal = build(:meal)
    food = build(:food, business: meal.plan.business, creator: meal.creator)

    %MealItem{
      weight_g: 100.0,
      amount: 1.0,
      unit: "cup",
      position: 0,
      food: food,
      business: meal.plan.business,
      meal: meal
    }
  end

  def meal_item_attrs_factory do
    %{
      "weight_g" => 120.0,
      "amount" => 1.0,
      "unit" => "cup",
      "position" => 0
    }
  end
end
