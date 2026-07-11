defmodule Easy.Factory do
  use ExMachina.Ecto, repo: Easy.Repo

  alias Easy.Billing.BusinessBilling
  alias Easy.ClientProfiles.ClientProfile
  alias Easy.ClientProfiles.CheckInSchedule
  alias Easy.ClientProfiles.FormAssignment
  alias Easy.ClientProfiles.FormSubmission
  alias Easy.ClientProfiles.FormTemplate
  alias Easy.ClientProfiles.ProfileFieldDefinition
  alias Easy.ClientProfiles.ProfileFieldValue
  alias Easy.Clients.Client
  alias Easy.Fitness.WeightEntry
  alias Easy.Identity.User
  alias Easy.Identity.UserSession
  alias Easy.Nutrition.DayMeal
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.FoodLogEntry
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.MealLog
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.PlanDay
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient
  alias Easy.Nutrition.WeekdayAssignment
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.Training.ScheduleEntry, as: TrainingPlanItem
  alias Easy.Training.TrainingEquipment
  alias Easy.Training.TrainingExercise
  alias Easy.Training.TrainingMuscle
  alias Easy.Training.TrainingPlan
  alias Easy.Training.TrainingSession
  alias Easy.Training.TrainingWorkout, as: Workout
  alias Easy.Training.TrainingWorkoutExercise, as: WorkoutElement

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

  def business_billing_factory do
    %BusinessBilling{
      business: build(:business),
      free_seats: 2,
      paid_seats: 0,
      status: :free
    }
  end

  def coach_factory do
    %Coach{
      first_name: "Test",
      last_name: "Coach",
      email: sequence(:coach_email, &"coach-#{&1}@test.com"),
      status: :active,
      user: build(:user),
      business: build(:business)
    }
  end

  def user_session_factory do
    %UserSession{
      role: :coach,
      refresh_token: sequence(:refresh_token, &"refresh-token-#{&1}"),
      expires_at: DateTime.add(DateTime.utc_now(:second), 86_400, :second),
      user: build(:user)
    }
  end

  # Arity-1 so an overridden `creator:` also becomes the `assigned_coach:` default —
  # ExMachina only merges attrs over the arity-0 return value, which would leave
  # assigned_coach pointing at this factory's own throwaway coach instead of the
  # caller's override.
  def client_factory(attrs) do
    # `business` and `creator` are persisted (not merely built) because each is
    # referenced from two belongs_to paths below (client.business/client.creator.business,
    # and client.creator/client.assigned_coach). An unsaved struct shared across two
    # paths gets cascade-inserted twice by Ecto, tripping the businesses/users/coaches
    # unique constraints.
    business =
      attrs[:business] ||
        insert(:business,
          owner: build(:user, email: sequence(:business_owner_email, &"business-owner-#{&1}@test.com"))
        )

    creator =
      attrs[:creator] ||
        insert(:coach,
          business: business,
          user: build(:user, email: sequence(:coach_user_email, &"coach-user-#{&1}@test.com"))
        )

    %Client{
      email: sequence(:client_email, &"client-#{&1}@test.com"),
      first_name: "Test",
      last_name: "Client",
      phone: "123-456-7890",
      notes: "Test client",
      status: :active,
      user: build(:user, email: sequence(:client_user_email, &"client-user-#{&1}@test.com")),
      business: business,
      creator: creator,
      assigned_coach: creator
    }
    |> merge_attributes(attrs)
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

  def client_profile_factory do
    client = build(:client)

    %ClientProfile{
      business: client.business,
      client: client,
      general: %{},
      nutrition: %{},
      training: %{},
      lifestyle: %{},
      intake_status: :assigned
    }
  end

  def profile_field_definition_factory do
    %ProfileFieldDefinition{
      business: build(:business),
      section: "nutrition",
      label: "Meal prep ability",
      key: sequence(:profile_field_key, &"meal_prep_ability_#{&1}"),
      field_type: "select",
      options: ["low", "medium", "high"],
      filterable: true
    }
  end

  def profile_field_value_factory do
    client = build(:client)
    definition = build(:profile_field_definition, business: client.business)

    %ProfileFieldValue{
      business: client.business,
      client: client,
      profile_field_definition: definition,
      value: %{"value" => "medium"},
      updated_by_type: "coach",
      updated_by_id: client.creator_id
    }
  end

  def form_template_factory do
    %FormTemplate{
      business: build(:business),
      name: sequence(:form_template_name, &"Check-in #{&1}"),
      purpose: "check_in",
      sections: [
        %{
          "title" => "Nutrition",
          "section" => "nutrition",
          "questions" => [
            %{
              "id" => "meal_prep_ability",
              "label" => "Meal prep ability",
              "type" => "select",
              "required" => true,
              "options" => ["low", "medium", "high"],
              "profile_mapping" => %{
                "kind" => "custom_field",
                "field_key" => "meal_prep_ability"
              }
            }
          ]
        }
      ],
      status: "active"
    }
  end

  def check_in_schedule_factory do
    client = build(:client)
    template = build(:form_template, business: client.business)

    %CheckInSchedule{
      business: client.business,
      client: client,
      form_template: template,
      frequency: :weekly,
      next_due_on: Date.utc_today(),
      active: true
    }
  end

  def form_assignment_factory do
    client = build(:client)
    template = build(:form_template, business: client.business)

    %FormAssignment{
      business: client.business,
      client: client,
      form_template: template,
      purpose: "check_in",
      priority: "high",
      status: "assigned"
    }
  end

  def form_submission_factory do
    assignment = build(:form_assignment)

    %FormSubmission{
      business: assignment.business,
      client: assignment.client,
      form_assignment: assignment,
      question_snapshot: assignment.form_template.sections,
      answers: %{"meal_prep_ability" => "high"},
      submitted_by_type: "client",
      submitted_by_id: assignment.client_id,
      submitted_at: DateTime.utc_now(:second)
    }
  end

  def weight_entry_factory do
    client = build(:client)

    %WeightEntry{
      date: ~D[2026-04-22],
      value: Decimal.new("91.40"),
      unit: :kg,
      note: nil,
      client: client,
      business: client.business
    }
  end

  def inquiry_attrs_factory do
    %{
      "first_name" => "Vikas",
      "last_name" => "Sandhu",
      "email" => sequence(:inquiry_email, &"inquiry-#{&1}@test.com"),
      "phone" => "+91 98765 43210"
    }
  end

  def food_factory do
    %Food{
      name: sequence(:food_name, &"Food #{&1}"),
      source: :custom,
      category: "protein",
      calories_per_100g: 200.0,
      protein_g_per_100g: 20.0,
      carbs_g_per_100g: 30.0,
      fat_g_per_100g: 5.0,
      fiber_g_per_100g: 2.0,
      allergens: [],
      dietary_tags: ["high_protein"],
      notes: "Test food",
      serving_sizes: [],
      creator: build(:coach),
      business: build(:business)
    }
  end

  def food_attrs_factory do
    %{
      "name" => sequence(:food_attr_name, &"New Food #{&1}"),
      "source" => "custom",
      "calories_per_100g" => 150.0,
      "protein_g_per_100g" => 10.0,
      "carbs_g_per_100g" => 20.0,
      "fat_g_per_100g" => 3.0,
      "fiber_g_per_100g" => 1.0,
      "serving_sizes" => [
        %{"label" => "1 cup", "unit" => "cup", "weight_g" => 100.0, "amount" => 1.0, "is_default" => true}
      ]
    }
  end

  def recipe_factory do
    %Recipe{
      name: sequence(:recipe_name, &"Recipe #{&1}"),
      description: "Test recipe",
      instructions: "Mix and serve",
      servings_count: 2,
      cooked_weight_g: 400.0,
      allergens: [],
      dietary_tags: [],
      serving_sizes: [],
      recipe_ingredients: [],
      creator: build(:coach),
      business: build(:business)
    }
  end

  def recipe_ingredient_factory do
    %RecipeIngredient{
      food: build(:food),
      amount: 1.0,
      unit: "g",
      weight_g: 50.0,
      position: 0
    }
  end

  def recipe_attrs_factory do
    %{
      "name" => sequence(:recipe_attr_name, &"New Recipe #{&1}"),
      "description" => "New recipe",
      "instructions" => "Cook",
      "servings_count" => 2,
      "cooked_weight_g" => 400.0,
      "serving_sizes" => [
        %{"label" => "1 serving", "unit" => "serving", "weight_g" => 200.0, "amount" => 1.0, "is_default" => true}
      ]
    }
  end

  def plan_factory do
    # `business` is persisted (not merely built) because it's referenced from two
    # belongs_to paths below (plan.business and plan.creator.business) — see
    # client_factory's comment for why an unsaved struct shared across two paths
    # gets cascade-inserted twice, tripping unique constraints.
    business = insert(:business)
    creator = insert(:coach, business: business)

    %Plan{
      name: sequence(:plan_name, &"Plan #{&1}"),
      description: "Weekly plan",
      tags: ["balanced"],
      target_calories: 2000.0,
      target_protein_g: 150.0,
      target_carbs_g: 200.0,
      target_fat_g: 60.0,
      target_fiber_g: 30.0,
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
      "target_calories" => 1800.0,
      "target_protein_g" => 120.0,
      "target_carbs_g" => 180.0,
      "target_fat_g" => 50.0,
      "target_fiber_g" => 25.0,
      "status" => "active"
    }
  end

  def meal_factory do
    plan = build(:plan)

    %Meal{
      name: sequence(:meal_name, &"Meal #{&1}"),
      notes: nil,
      default_meal_slot: "breakfast",
      creator: plan.creator,
      business: plan.business,
      plan: plan
    }
  end

  def meal_attrs_factory do
    %{
      "name" => sequence(:meal_attr_name, &"New Meal #{&1}"),
      "default_meal_slot" => "lunch"
    }
  end

  def plan_day_factory do
    plan = build(:plan)

    %PlanDay{
      name: "Everyday",
      position: sequence(:plan_day_position, & &1),
      business: plan.business,
      plan: plan
    }
  end

  def day_meal_factory do
    day = build(:plan_day)
    meal = build(:meal, plan: day.plan, creator: day.plan.creator)

    %DayMeal{
      meal_slot: "breakfast",
      position: 0,
      business: day.plan.business,
      plan_day: day,
      meal: meal
    }
  end

  def weekday_assignment_factory do
    day = build(:plan_day)

    %WeekdayAssignment{
      day_of_week: "monday",
      business: day.plan.business,
      plan: day.plan,
      plan_day: day
    }
  end

  def meal_item_factory do
    meal = build(:meal)
    food = build(:food, business: meal.plan.business, creator: meal.creator)

    %MealItem{
      weight_g: 100.0,
      amount: 1.0,
      unit: "serving",
      position: 0,
      food: food,
      business: meal.plan.business,
      meal: meal
    }
  end

  def meal_item_attrs_factory do
    %{
      "weight_g" => 100.0,
      "amount" => 1.0,
      "unit" => "serving",
      "position" => 0
    }
  end

  def exercise_factory do
    %TrainingExercise{
      name: sequence(:exercise_name, &"Exercise #{&1}"),
      description: "Exercise description",
      instructions: "Exercise instructions",
      source: "custom",
      tracking_type: "weight_reps",
      mechanics: "compound",
      force: "push",
      images: [],
      business: build(:business)
    }
  end

  def muscle_factory do
    %TrainingMuscle{
      name: sequence(:muscle_name, &"Muscle #{&1}"),
      description: "Primary target"
    }
  end

  def equipment_factory do
    %TrainingEquipment{
      name: sequence(:equipment_name, &"Equipment #{&1}"),
      description: "Gym equipment"
    }
  end

  def exercise_attrs_factory do
    %{
      "name" => sequence(:exercise_attr_name, &"Exercise Attr #{&1}"),
      "description" => "Created via test",
      "instructions" => "Do it with control",
      "source" => "custom",
      "tracking_type" => "weight_reps",
      "mechanics" => "compound",
      "force" => "push",
      "images" => []
    }
  end

  def training_plan_factory do
    business = build(:business)
    creator = build(:coach, business: business)

    %TrainingPlan{
      name: sequence(:training_plan_name, &"Training Plan #{&1}"),
      description: "Weekly strength plan",
      status: :active,
      creator: creator,
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

  def workout_factory do
    training_plan = build(:training_plan)

    %Workout{
      name: sequence(:workout_name, &"Workout #{&1}"),
      notes: "Push day",
      plan: training_plan,
      creator: training_plan.creator,
      business: training_plan.business
    }
  end

  def workout_attrs_factory do
    %{
      "name" => sequence(:workout_attr_name, &"Workout Attr #{&1}"),
      "notes" => "Workout from test"
    }
  end

  def training_plan_item_factory do
    training_plan = build(:training_plan)
    workout = build(:workout, plan: training_plan, business: training_plan.business)
    creator = training_plan.creator

    %TrainingPlanItem{
      day_of_week: "monday",
      plan: training_plan,
      workout: workout,
      business: training_plan.business,
      creator: creator
    }
  end

  def training_plan_item_attrs_factory do
    %{
      "day_of_week" => "monday"
    }
  end

  def workout_element_factory do
    workout = build(:workout)
    exercise = build(:exercise, business: workout.business)

    %WorkoutElement{
      position: 0,
      notes: "Top set",
      workout: workout,
      exercise: exercise,
      business: workout.business,
      planned_sets: []
    }
  end

  def workout_element_attrs_factory do
    %{
      "position" => 0,
      "notes" => "Created via test",
      "planned_sets" => [
        %{
          "set_type" => "working",
          "reps" => "8-12",
          "load_value" => "80",
          "load_unit" => "kg",
          "rpe" => 8,
          "rest_seconds" => 90,
          "duration_seconds" => nil,
          "distance_value" => nil,
          "distance_unit" => nil,
          "notes" => nil
        }
      ]
    }
  end

  def workout_session_factory do
    business = build(:business)
    creator = build(:coach, business: business)
    client = build(:client, business: business, creator: creator)

    %TrainingSession{
      date: Date.utc_today(),
      started_at: DateTime.utc_now() |> DateTime.truncate(:second),
      state: :active,
      notes: "Session note",
      client: client,
      business: business
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

  def conversation_factory do
    client = build(:client)

    %Easy.Chat.Conversation{
      business: client.business,
      client: client
    }
  end

  def chat_message_factory do
    conversation = build(:conversation)

    %Easy.Chat.Message{
      body: sequence(:chat_message_body, &"Message #{&1}"),
      sender_type: :coach,
      sender_id: Ecto.UUID.generate(),
      business: conversation.business,
      conversation: conversation
    }
  end
end
