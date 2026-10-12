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
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.Plans.Plan, as: TrainingPlan
  alias Easy.Plans.Revision, as: PlanRevision
  alias Easy.Plans.Template
  alias Easy.Training.Content
  alias Easy.Training.TrainingEquipment
  alias Easy.Training.TrainingExercise
  alias Easy.Training.TrainingMuscle
  alias Easy.Training.TrainingPerformedSet
  alias Easy.Training.TrainingSession

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

  def food_factory(attrs) do
    business = attrs[:business] || insert(:business)

    %Food{
      name: sequence(:food_name, &"Food #{&1}"),
      kind: :food,
      basis: :"100g",
      nutrients: %{"energy_kcal" => 200.0, "protein_g" => 20.0},
      servings: [],
      business: business
    }
    |> merge_attributes(attrs)
  end

  def food_attrs_factory do
    %{"name" => sequence(:food_attr_name, &"New food #{&1}"), "kind" => "food", "basis" => "100g", "nutrients" => %{"energy_kcal" => 150.0}}
  end

  def exercise_factory do
    %TrainingExercise{
      name: sequence(:exercise_name, &"Exercise #{&1}"),
      instructions: "Exercise instructions",
      measures: [:reps, :load],
      bodyweight: false,
      mechanics: "compound",
      force: "push",
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
      "instructions" => "Do it with control",
      "measures" => ["reps", "load"],
      "mechanics" => "compound",
      "force" => "push"
    }
  end

  def training_plan_factory(attrs) do
    attrs = Map.new(attrs)
    {business, attrs} = Map.pop(attrs, :business)
    {creator, attrs} = Map.pop(attrs, :creator)
    {client, attrs} = Map.pop(attrs, :client)
    {kind, attrs} = Map.pop(attrs, :kind)
    business = business || build(:business)
    base = %{domain: :training, name: sequence(:training_plan_name, &"Training Plan #{&1}"), business: business}

    if client || attrs[:client_id] || kind == :client_plan do
      client = client || build(:client, business: business)
      inserted = attrs[:inserted_at] || DateTime.utc_now(:second)
      client_for_date = %{client | business: business}

      struct(
        TrainingPlan,
        Map.merge(base, %{
          client: client,
          revisions: [%PlanRevision{domain: :training, number: 1, content: Content.empty()}],
          created_local_date: Client.local_date(client_for_date, inserted)
        })
      )
      |> merge_attributes(attrs)
    else
      struct(
        Template,
        Map.merge(base, %{content: Content.empty(), creator: if(match?(%Coach{}, creator), do: creator, else: nil)})
      )
      |> merge_attributes(Map.drop(attrs, [:start_date, :end_date]))
    end
  end

  def training_plan_attrs_factory do
    %{"name" => sequence(:training_plan_attr_name, &"Training Plan Attr #{&1}"), "content" => Content.empty()}
  end

  def workout_session_factory(attrs) do
    attrs = Map.new(attrs)
    business = attrs[:business] || build(:business)
    creator = attrs[:creator] || build(:coach, business: business)
    client = attrs[:client] || build(:client, business: business, coach: creator)
    state = Map.get(attrs, :state, :active)
    started_at = Map.get(attrs, :started_at, DateTime.utc_now(:second))

    %TrainingSession{
      local_date: session_date(attrs),
      timezone: "Etc/UTC",
      recorded_by_id: client.id || Ecto.UUID.generate(),
      started_at: started_at,
      ended_at: session_end(attrs, state, started_at),
      state: state,
      notes: "Session note",
      client: client,
      business: business
    }
    |> merge_attributes(Map.drop(attrs, [:kind, :date, :closed_at, :creator]))
  end

  defp session_date(attrs), do: attrs[:local_date] || attrs[:date] || Date.utc_today()
  defp session_end(attrs, state, started), do: attrs[:ended_at] || attrs[:closed_at] || closed_time(state, started)
  defp closed_time(state, started) when state in [:completed, :discarded], do: started
  defp closed_time(_state, _started), do: nil

  def performed_set_factory do
    session = build(:workout_session)

    %TrainingPerformedSet{
      position: 0,
      exercise_name: "Freestyle exercise",
      kind: :working,
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
