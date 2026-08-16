defmodule Easy.Factory do
  use ExMachina.Ecto, repo: Easy.Repo

  alias Easy.Attachments.Attachment
  alias Easy.Billing.BusinessBilling
  alias Easy.Chat.MessageAttachment
  alias Easy.Clients.Client
  alias Easy.Fitness.WeightEntry
  alias Easy.Forms.CheckInSchedule
  alias Easy.Forms.FormAssignment
  alias Easy.Forms.FormSubmission
  alias Easy.Forms.FormTemplate
  alias Easy.Identity.User
  alias Easy.Identity.UserSession
  alias Easy.LibraryMedia.Media, as: LibraryMedia
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
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.Training.TrainingEquipment
  alias Easy.Training.TrainingExercise
  alias Easy.Training.TrainingMuscle
  alias Easy.Training.TrainingPlan
  alias Easy.Training.TrainingPerformedSet
  alias Easy.Training.TrainingSession
  alias Easy.Training.PrescribedExercise
  alias Easy.Training.TrainingWorkout, as: Workout
  alias Easy.Training.WorkoutSchedule

  def user_factory do
    %User{
      email: sequence(:email, &unique_test_email("user", &1)),
      first_name: "Test",
      last_name: "User"
    }
  end

  def business_factory do
    %Business{
      name: sequence(:business_name, &"Business #{&1}"),
      handle: sequence(:handle, &"biz-#{&1}-#{System.unique_integer([:positive])}"),
      timezone: Easy.LocalCalendar.default_timezone(),
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
      email: sequence(:coach_email, &unique_test_email("coach", &1)),
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
          owner: build(:user, email: sequence(:business_owner_email, &unique_test_email("business-owner", &1)))
        )

    creator =
      attrs[:creator] ||
        insert(:coach,
          business: business,
          user: build(:user, email: sequence(:coach_user_email, &unique_test_email("coach-user", &1)))
        )

    %Client{
      email: sequence(:client_email, &"client-#{&1}@test.com"),
      first_name: "Test",
      last_name: "Client",
      phone: "123-456-7890",
      notes: "Test client",
      status: :active,
      timezone: Easy.LocalCalendar.default_timezone(),
      user: build(:user, email: sequence(:client_user_email, &unique_test_email("client-user", &1))),
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
              "options" => ["low", "medium", "high"]
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

  def library_media_factory do
    %LibraryMedia{
      id: Ecto.UUID.generate(),
      uploaded_by_type: :coach,
      uploaded_by_id: Ecto.UUID.generate(),
      storage_key: sequence(:library_media_storage_key, &"businesses/library-media/media-#{&1}.jpg"),
      content_type: "image/jpeg",
      byte_size: 1_024,
      business: build(:business)
    }
  end

  def attachment_factory do
    client = build(:client)

    %Attachment{
      id: Ecto.UUID.generate(),
      uploaded_by_type: :client,
      uploaded_by_id: Ecto.UUID.generate(),
      storage_key: sequence(:attachment_storage_key, &"test/attachment-#{&1}.jpg"),
      content_type: "image/jpeg",
      byte_size: 1_024,
      duration_ms: nil,
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
      revision: 1,
      creator: build(:coach),
      business: build(:business)
    }
  end

  def food_attrs_factory do
    %{
      "name" => sequence(:food_attr_name, &"New Food #{&1}"),
      "calories_per_100g" => 150.0,
      "protein_g_per_100g" => 10.0,
      "carbs_g_per_100g" => 20.0,
      "fat_g_per_100g" => 3.0,
      "fiber_g_per_100g" => 1.0,
      "sugar_g_per_100g" => 6.0,
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
      revision: 1,
      allergens: [],
      dietary_tags: [],
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
      "cooked_weight_g" => 400.0
    }
  end

  def plan_factory(attrs) do
    attrs = Map.new(attrs)
    {creator, attrs} = Map.pop(attrs, :creator)
    {business, attrs} = Map.pop(attrs, :business)
    {client, attrs} = Map.pop(attrs, :client)
    {kind, attrs} = Map.pop(attrs, :kind)
    {archived_at, attrs} = Map.pop(attrs, :archived_at)
    {status, attrs} = Map.pop(attrs, :status)
    {start_date, attrs} = Map.pop(attrs, :start_date)
    {end_date, attrs} = Map.pop(attrs, :end_date)

    business = business || insert(:business)
    kind = kind || if(client || attrs[:client_id], do: :client_plan, else: :template)
    period? = kind == :client_plan
    archived_at = archived_at || if(status in [:archived, "archived"], do: DateTime.utc_now(:second))

    %Plan{
      kind: kind,
      name: sequence(:plan_name, &"Plan #{&1}"),
      description: "Weekly plan",
      revision: 1,
      archived_at: archived_at,
      target_calories: 2000.0,
      target_protein_g: 150.0,
      target_carbs_g: 200.0,
      target_fat_g: 60.0,
      target_fiber_g: 30.0,
      start_date: if(period?, do: start_date),
      end_date: if(period?, do: end_date),
      creator: unwrap_plan_creator(creator),
      business: business,
      client: client
    }
    |> merge_attributes(attrs)
  end

  defp unwrap_plan_creator(%Coach{user: %User{} = user}), do: user
  defp unwrap_plan_creator(nil), do: build(:user)
  defp unwrap_plan_creator(creator), do: creator

  def plan_attrs_factory do
    %{
      "name" => sequence(:plan_attr_name, &"New Plan #{&1}"),
      "description" => "Plan created via test",
      "target_calories" => 1800.0,
      "target_protein_g" => 120.0,
      "target_carbs_g" => 180.0,
      "target_fat_g" => 50.0,
      "target_fiber_g" => 25.0
    }
  end

  def meal_factory(attrs) do
    attrs = Map.new(attrs)
    {plan, attrs} = Map.pop(attrs, :plan)
    {business, attrs} = Map.pop(attrs, :business)
    {creator, attrs} = Map.pop(attrs, :creator)

    business = business || (plan && plan.business) || insert(:business)
    creator = creator || insert(:coach, business: business)
    plan = plan || build(:plan, business: business, creator: creator)

    %Meal{
      name: sequence(:meal_name, &"Meal #{&1}"),
      notes: nil,
      position: sequence(:meal_position, & &1),
      creator: creator,
      business: business,
      plan: plan
    }
    |> merge_attributes(attrs)
  end

  def plan_day_factory do
    plan = build(:plan)

    %PlanDay{
      name: "Everyday",
      position: sequence(:plan_day_position, & &1),
      weekdays: [],
      business: plan.business,
      plan: plan
    }
  end

  def day_meal_factory do
    meal = build(:meal)
    day = build(:plan_day, plan: meal.plan, business: meal.business)

    %DayMeal{
      meal_slot: "breakfast",
      position: 0,
      business: meal.business,
      plan_day: day,
      meal: meal
    }
  end

  def meal_item_factory(attrs) do
    attrs = Map.new(attrs)
    {meal, attrs} = Map.pop(attrs, :meal)
    {business, attrs} = Map.pop(attrs, :business)
    {plan, attrs} = Map.pop(attrs, :plan)
    {food, attrs} = Map.pop(attrs, :food)
    {recipe, attrs} = Map.pop(attrs, :recipe)
    {portion, attrs} = pop_meal_item_portion(attrs)

    meal = meal || build(:meal)
    plan = plan || meal.plan
    business = business || meal.business
    food = food || unless(recipe, do: build(:food, business: business, creator: meal.creator))

    %MealItem{
      portion_kind: portion.kind,
      weight_g: portion.weight_g,
      amount: portion.amount,
      unit: portion.unit,
      serving_label: portion.serving_label,
      position: 0,
      calories: nil,
      protein: nil,
      carbohydrates: nil,
      fat: nil,
      fiber: nil,
      complete: false,
      food: food,
      recipe: recipe,
      business: business,
      plan: plan,
      meal: meal
    }
    |> merge_attributes(attrs)
  end

  defp pop_meal_item_portion(attrs) do
    {portion_kind, attrs} = Map.pop(attrs, :portion_kind)
    {amount, attrs} = Map.pop(attrs, :amount)
    {unit, attrs} = Map.pop(attrs, :unit)
    {weight_g, attrs} = Map.pop(attrs, :weight_g)
    {serving_label, attrs} = Map.pop(attrs, :serving_label)

    portion =
      if gram_meal_item?(portion_kind, amount, unit) do
        %{kind: :gram, amount: nil, unit: nil, serving_label: nil, weight_g: weight_g || 100.0}
      else
        %{kind: :serving, amount: amount || 1.0, unit: unit || "serving", serving_label: serving_label, weight_g: weight_g}
      end

    {portion, attrs}
  end

  defp gram_meal_item?(:gram, _amount, _unit), do: true
  defp gram_meal_item?(nil, amount, unit) when is_nil(amount) or unit in [nil, "g"], do: true
  defp gram_meal_item?(_kind, _amount, _unit), do: false

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

  def training_plan_factory(attrs) do
    attrs = Map.new(attrs)
    {creator, attrs} = Map.pop(attrs, :creator)
    {business, attrs} = Map.pop(attrs, :business)
    {client, attrs} = Map.pop(attrs, :client)
    {kind, attrs} = Map.pop(attrs, :kind)
    {archived_at, attrs} = Map.pop(attrs, :archived_at)
    {start_date, attrs} = Map.pop(attrs, :start_date)
    {end_date, attrs} = Map.pop(attrs, :end_date)

    business = business || build(:business)
    kind = kind || if(client || attrs[:client_id], do: :client_plan, else: :template)
    period? = kind == :client_plan

    %TrainingPlan{
      kind: kind,
      name: sequence(:training_plan_name, &"Training Plan #{&1}"),
      description: "Weekly strength plan",
      revision: 1,
      archived_at: archived_at,
      start_date: if(period?, do: start_date),
      end_date: if(period?, do: end_date),
      creator: unwrap_training_plan_creator(creator),
      business: business,
      client: client
    }
    |> merge_attributes(attrs)
  end

  defp unwrap_training_plan_creator(%Coach{user: %User{} = user}), do: user
  defp unwrap_training_plan_creator(nil), do: build(:user)
  defp unwrap_training_plan_creator(creator), do: creator

  def training_plan_attrs_factory do
    %{
      "name" => sequence(:training_plan_attr_name, &"Training Plan Attr #{&1}"),
      "description" => "Created via test"
    }
  end

  def workout_factory do
    training_plan = build(:training_plan)

    %Workout{
      name: sequence(:workout_name, &"Workout #{&1}"),
      position: 0,
      plan: training_plan,
      business: training_plan.business
    }
  end

  def prescribed_exercise_factory do
    workout = build(:workout)
    exercise = build(:exercise, business: workout.business)

    %PrescribedExercise{
      position: 0,
      workout: workout,
      exercise: exercise,
      business: workout.business,
      prescribed_sets: []
    }
  end

  def workout_schedule_factory do
    workout = build(:workout)

    %WorkoutSchedule{
      weekday: :monday,
      business: workout.business,
      plan: workout.plan,
      workout: workout
    }
  end

  def workout_session_factory(attrs) do
    attrs = Map.new(attrs)
    business = attrs[:business] || build(:business)
    creator = attrs[:creator] || build(:coach, business: business)
    client = attrs[:client] || build(:client, business: business, creator: creator)
    state = attrs[:state] || :active
    started_at = attrs[:started_at] || DateTime.utc_now(:second)
    closed_at = attrs[:closed_at] || if(state in [:completed, :discarded], do: started_at)

    %TrainingSession{
      kind: attrs[:kind] || :freestyle,
      date: Date.utc_today(),
      started_at: started_at,
      closed_at: closed_at,
      state: state,
      notes: "Session note",
      client: client,
      business: business
    }
    |> merge_attributes(attrs)
  end

  def performed_set_factory do
    session = build(:workout_session)

    %TrainingPerformedSet{
      position: 0,
      exercise_name: "Freestyle exercise",
      set_type: :working,
      session: session,
      business: session.business
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
      meal_log: meal_log,
      business: meal_log.business,
      food: food
    }
  end

  def food_log_entry_attrs_factory do
    %{
      "date" => Date.to_iso8601(Date.utc_today()),
      "meal_slot" => "breakfast",
      "amount" => 100.0,
      "unit" => "g",
      "weight_g" => 100.0
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

  def chat_message_attachment_factory do
    message = build(:chat_message)
    attachment = build(:attachment, business: message.business, client: message.conversation.client)

    %MessageAttachment{
      position: 0,
      business: message.business,
      message: message,
      attachment: attachment
    }
  end

  defp unique_test_email(prefix, n), do: "#{prefix}-#{n}-#{System.unique_integer([:positive])}@test.com"
end
