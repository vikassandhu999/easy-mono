defmodule Easy.Factory do
  use ExMachina.Ecto, repo: Easy.Repo

  alias Easy.Clients.Client
  alias Easy.Identity.User
  alias Easy.Identity.UserSession
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.FoodLogEntry
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealLog
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.PlanItem
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient
  alias Easy.Storefront.Offer
  alias Easy.Storefront.StoreProfile
  alias Easy.Storefront.Testimonial
  alias Easy.Training.Exercise
  alias Easy.Training.Equipment
  alias Easy.Training.Muscle
  alias Easy.Training.PlannedWorkout
  alias Easy.Training.TrainingPlan
  alias Easy.Training.WorkoutElement
  alias Easy.Training.WorkoutSession

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

  def inquiry_attrs_factory do
    %{
      "name" => "Vikas Sandhu",
      "email" => sequence(:inquiry_email, &"inquiry-#{&1}@test.com"),
      "phone" => "+91 98765 43210"
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
      status: :active,
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
      "status" => "active"
    }
  end

  def meal_factory do
    plan = build(:plan)

    %Meal{
      name: sequence(:meal_name, &"Meal #{&1}"),
      macros: %{"calories" => 500, "protein" => 40, "carbs" => 50, "fat" => 15},
      creator: plan.creator,
      business: plan.business,
      plan: plan
    }
  end

  def meal_attrs_factory do
    %{
      "name" => sequence(:meal_attr_name, &"New Meal #{&1}"),
      "macros" => %{"calories" => 450, "protein" => 35, "carbs" => 45, "fat" => 12}
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

  def exercise_factory do
    %Exercise{
      name: sequence(:exercise_name, &"Exercise #{&1}"),
      description: "Exercise description",
      instructions: "Exercise instructions",
      mechanics: :compound,
      force: :push,
      images: [],
      business: build(:business)
    }
  end

  def muscle_factory do
    %Muscle{
      name: sequence(:muscle_name, &"Muscle #{&1}"),
      description: "Primary target"
    }
  end

  def equipment_factory do
    %Equipment{
      name: sequence(:equipment_name, &"Equipment #{&1}"),
      description: "Gym equipment"
    }
  end

  def exercise_attrs_factory do
    %{
      "name" => sequence(:exercise_attr_name, &"Exercise Attr #{&1}"),
      "description" => "Created via test",
      "instructions" => "Do it with control",
      "mechanics" => "compound",
      "force" => "push",
      "images" => []
    }
  end

  def training_plan_factory do
    business = build(:business)
    author = build(:coach, business: business)

    %TrainingPlan{
      name: sequence(:training_plan_name, &"Training Plan #{&1}"),
      description: "Weekly strength plan",
      status: :active,
      author: author,
      business: business
    }
  end

  def training_plan_attrs_factory do
    %{
      "name" => sequence(:training_plan_attr_name, &"Training Plan Attr #{&1}"),
      "description" => "Created via test",
      "status" => "active"
    }
  end

  def planned_workout_factory do
    training_plan = build(:training_plan)

    %PlannedWorkout{
      name: sequence(:planned_workout_name, &"Planned Workout #{&1}"),
      notes: "Push day",
      day_number: 1,
      training_plan: training_plan,
      business: training_plan.business
    }
  end

  def planned_workout_attrs_factory do
    %{
      "name" => sequence(:planned_workout_attr_name, &"Planned Workout Attr #{&1}"),
      "notes" => "Workout from test",
      "day_number" => 1
    }
  end

  def workout_element_factory do
    planned_workout = build(:planned_workout)
    exercise = build(:exercise, business: planned_workout.business)

    %WorkoutElement{
      position: 0,
      notes: "Top set",
      planned_workout: planned_workout,
      exercise: exercise,
      business: planned_workout.business,
      planned_sets: []
    }
  end

  def workout_element_attrs_factory do
    %{
      "position" => 0,
      "notes" => "Created via test"
    }
  end

  def workout_session_factory do
    business = build(:business)
    creator = build(:coach, business: business)
    client = build(:client, business: business, creator: creator)

    %WorkoutSession{
      started_at: DateTime.utc_now(),
      state: :active,
      notes: "Session note",
      client: client,
      business: business
    }
  end

  # Storefront factories

  def store_profile_factory do
    %StoreProfile{
      slug: sequence(:slug, &"coach-#{&1}"),
      display_name: sequence(:display_name, &"Coach #{&1}"),
      bio: "Certified personal trainer with 5+ years experience",
      photo_url: "https://example.com/photo.jpg",
      cover_image_url: "https://example.com/cover.jpg",
      social_links: %{
        "instagram" => "https://instagram.com/coach",
        "youtube" => "https://youtube.com/@coach"
      },
      theme_color: "orange",
      is_published: false,
      intake_questions: [
        %{
          "label" => "Current weight?",
          "type" => "number",
          "required" => true
        },
        %{
          "label" => "Goal?",
          "type" => "select",
          "required" => true,
          "options" => ["Fat loss", "Muscle gain", "Recomposition"]
        }
      ],
      headline: "Transform your body in 12 weeks",
      trust_stats: [
        %{"value" => "500+", "label" => "Clients"},
        %{"value" => "6", "label" => "Years experience"}
      ],
      faq_items: [
        %{
          "question" => "How does the coaching work?",
          "answer" => "After you apply, I'll create a custom plan based on your goals."
        }
      ],
      whatsapp_cta_enabled: false,
      whatsapp_cta_message: nil,
      business: build(:business)
    }
  end

  def store_profile_attrs_factory do
    %{
      "slug" => sequence(:profile_attr_slug, &"coach-#{&1}"),
      "display_name" => "My Coaching Page",
      "bio" => "Helping you get fit",
      "theme_color" => "blue",
      "social_links" => %{
        "instagram" => "https://instagram.com/me"
      },
      "intake_questions" => [
        %{
          "label" => "Weight?",
          "type" => "number",
          "required" => true
        }
      ]
    }
  end

  def offer_factory do
    %Offer{
      name: sequence(:offer_name, &"Offer #{&1}"),
      slug: sequence(:offer_slug, &"offer-#{&1}"),
      description: "Comprehensive program for results",
      type: :nutrition_plan,
      duration_text: "8 weeks",
      price: 4999,
      currency: "INR",
      price_display: "₹4,999",
      features: ["Custom meal plan", "Weekly check-ins", "WhatsApp support"],
      is_featured: false,
      status: :active,
      position: 0,
      cta_text: "Get started",
      business: build(:business)
    }
  end

  def offer_attrs_factory do
    %{
      "name" => sequence(:offer_attr_name, &"New Offer #{&1}"),
      "description" => "Great program",
      "type" => "nutrition_plan",
      "duration_text" => "12 weeks",
      "price" => 6999,
      "currency" => "INR",
      "price_display" => "₹6,999",
      "features" => ["Meal plan", "Check-ins"],
      "is_featured" => true,
      "cta_text" => "Join now"
    }
  end

  def testimonial_factory do
    %Testimonial{
      client_name: sequence(:testimonial_name, &"Client #{&1}"),
      client_handle: "@fitness_client",
      quote: "Coach completely changed my approach to food and fitness.",
      rating: 5,
      result_tag: "Lost 15kg",
      program_name: "Fat Loss Program",
      duration_text: "12 weeks",
      before_image_url: "https://example.com/before.jpg",
      after_image_url: "https://example.com/after.jpg",
      before_weight: Decimal.new("95.0"),
      after_weight: Decimal.new("80.0"),
      is_featured: false,
      status: :active,
      position: 0,
      business: build(:business)
    }
  end

  def testimonial_attrs_factory do
    %{
      "client_name" => "Vikas",
      "client_handle" => "@vikas_fit",
      "quote" => "Best decision I ever made.",
      "rating" => 5,
      "result_tag" => "Lost 10kg",
      "program_name" => "Body Recomp",
      "duration_text" => "8 weeks",
      "before_image_url" => "https://example.com/before.jpg",
      "after_image_url" => "https://example.com/after.jpg",
      "before_weight" => "90",
      "after_weight" => "80"
    }
  end

  def meal_log_factory do
    coach = build(:coach)
    client = build(:client, creator: coach, business: coach.business)

    %MealLog{
      date: Date.utc_today(),
      meal_slot: "breakfast",
      planned_snapshot: nil,
      planned_calories: nil,
      logged_calories: 0.0,
      client: client,
      business: coach.business
    }
  end

  def food_log_entry_factory do
    meal_log = build(:meal_log)
    food = build(:food, creator: meal_log.client.creator, business: meal_log.business)

    %FoodLogEntry{
      food_name: "Oats",
      amount: 100.0,
      unit: "g",
      weight_g: 100.0,
      calories: 389.0,
      protein_g: 16.9,
      carbs_g: 66.3,
      fat_g: 6.9,
      source: :planned,
      planned_item_index: 0,
      meal_log: meal_log,
      food: food
    }
  end

  def food_log_entry_attrs_factory do
    %{
      "date" => Date.to_iso8601(Date.utc_today()),
      "meal_slot" => "breakfast",
      "amount" => 100.0,
      "unit" => "g",
      "weight_g" => 100.0,
      "source" => "planned"
    }
  end
end
