import Easy.Factory

alias Easy.Ctx
alias Easy.Nutrition.Menu
alias Easy.Nutrition.Programming

unless Mix.env() == :test and Easy.Repo.config()[:database] == "easy_test_e2e" do
  raise "E2E seeds require the isolated easy_test_e2e database"
end

fixtures =
  for width <- [375, 1280], scenario <- ~w(build assign corrections conflict history), into: %{} do
    key = "#{scenario}-#{width}"
    owner = insert(:user, email: "coach-#{key}@example.test", email_confirmed_at: DateTime.utc_now(:second))
    business = insert(:business, owner: owner, timezone: "Etc/UTC")
    coach = insert(:coach, business: business, user: owner, email: owner.email)

    user =
      insert(:user,
        email: "client-#{key}@example.test",
        preferred_name: "Client",
        email_confirmed_at: DateTime.utc_now(:second)
      )

    client =
      insert(:client,
        business: business,
        coach: coach,
        user: user,
        email: user.email,
        timezone: "Etc/UTC"
      )

    food = insert(:food, business: business, creator: coach, name: "Oats")
    insert(:food, business: business, creator: coach, name: "Banana", calories_per_100g: 90)
    ctx = Ctx.new(business.id, owner.id, coach.id, true)
    {:ok, template} = Programming.create_template(ctx, %{name: "Everyday plan", target_calories: 2000})
    day = hd(template.menu.day_patterns)
    meal_id = Ecto.UUID.generate()

    menu = %{
      meals: [
        %{
          id: meal_id,
          name: "Breakfast",
          meal_items: [
            %{id: Ecto.UUID.generate(), kind: :food, food_id: food.id, portion: %{kind: :gram, grams: 50}}
          ]
        }
      ],
      day_patterns: [
        %{
          id: day.id,
          name: "Every day",
          slots: [
            %{meal_slot: :breakfast, meal_ids: [meal_id]}
          ]
        }
      ],
      schedule: Map.new(Menu.weekdays(), &{&1, day.id})
    }

    {:ok, template} = Programming.replace_menu(ctx, template.id, template.revision, menu)
    date = Date.utc_today()

    plan =
      if scenario in ~w(corrections history) do
        {:ok, plan} =
          Programming.assign_template_to_client(ctx, client.id, template.id, %{
            start_date: Date.to_iso8601(date),
            end_date: nil
          })

        plan
      else
        template
      end

    {key,
     %{
       coach_email: owner.email,
       client_email: user.email,
       client_id: client.id,
       food_id: food.id,
       plan_id: plan.id,
       date: date
     }}
  end

File.mkdir_p!("../frontend/e2e/.generated")
File.write!("../frontend/e2e/.generated/fixtures.json", Jason.encode!(fixtures))
