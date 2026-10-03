defmodule Easy.Factory do
  use ExMachina.Ecto, repo: Easy.Repo

  alias Easy.Attachments.Attachment
  alias Easy.Billing.BusinessBilling
  alias Easy.Chat.MessageAttachment
  alias Easy.Clients.Client
  alias Easy.Identity.User
  alias Easy.Identity.UserSession
  alias Easy.LibraryMedia.Media, as: LibraryMedia
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Menu
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.Training.PrescribedExercise
  alias Easy.Training.TrainingEquipment
  alias Easy.Training.TrainingExercise
  alias Easy.Training.TrainingMuscle
  alias Easy.Training.TrainingPerformedSet
  alias Easy.Training.TrainingPlan
  alias Easy.Training.TrainingSession
  alias Easy.Training.TrainingWorkout, as: Workout
  alias Easy.Training.WorkoutSchedule

  def user_factory do
    %User{
      email: sequence(:email, &unique_test_email("user", &1)),
      full_name: "Test User"
    }
  end

  def business_factory do
    %Business{
      name: sequence(:business_name, &"Business #{&1}"),
      handle: sequence(:handle, &"biz-#{&1}-#{System.unique_integer([:positive])}"),
      timezone: Easy.LocalCalendar.default_timezone(),
      owner: build(:user),
      billing: %BusinessBilling{}
    }
  end

  def business_billing_factory do
    %BusinessBilling{
      business: build(:business, billing: nil),
      free_seats: 10,
      paid_seats: 0,
      status: :free
    }
  end

  def coach_factory do
    %Coach{
      full_name: "Test Coach",
      email: sequence(:coach_email, &unique_test_email("coach", &1)),
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

  def client_factory(attrs) do
    business = attrs[:business] || insert(:business)
    coach = attrs[:coach] || insert(:coach, business: business)
    user = if Map.has_key?(attrs, :user), do: attrs[:user], else: build(:user)

    %Client{
      email: sequence(:client_email, &"client-#{&1}@test.com"),
      full_name: "Test Client",
      phone: "123-456-7890",
      notes: "Test client",
      user: user,
      business: business,
      coach: coach,
      terms: if(user, do: [build(:coaching_term, starts_on: Date.add(Date.utc_today(), -365))], else: [])
    }
    |> merge_attributes(attrs)
  end

  def coaching_term_factory do
    %Easy.CoachingTerms.CoachingTerm{starts_on: Date.utc_today()}
  end

  def client_attrs_factory do
    %{
      "email" => sequence(:client_invite_email, &"invite-#{&1}@test.com"),
      "full_name" => "Invited Client",
      "phone" => "123-555-7890",
      "notes" => "Invited via test"
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
      portion: %{kind: :gram, grams: 50.0},
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
      menu: Menu.empty(),
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
    client = attrs[:client] || build(:client, business: business, coach: creator)
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

  defp unique_test_email(prefix, n), do: "#{prefix}-#{n}-#{Ecto.UUID.generate()}@test.com"
end
