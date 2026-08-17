defmodule Easy.Nutrition.DiaryTest do
  use Easy.DataCase, async: true

  alias Easy.LocalCalendar
  alias Easy.Nutrition.{Diary, Programming, WeekSchedule}
  alias Easy.Repo

  describe "get_client_nutrition_day/2" do
    test "returns live Meal Options for an unstarted slot on the client's local day" do
      %{client: client, food: food, plan: plan} = covering_setup()
      today = local_today(client)

      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)

      assert day.date == today
      assert day.plan_id == plan.id
      assert day.write_eligible == true
      assert day.targets.calories == plan.target_calories
      refute Enum.any?(day.slots, fn slot -> Enum.any?(slot.rows, &(&1.status in [:pending, :skipped])) end)

      [slot] = day.slots
      assert slot.meal_slot == :breakfast
      assert slot.rows == []
      [option] = slot.options
      assert option.meal_name == "Breakfast"
      [item] = option.items
      assert item.name == food.name
      assert item.kind == :food
    end

    test "returns a successful Nutrition Day with no live guidance when Coverage is missing" do
      client = insert(:client)
      today = local_today(client)

      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)
      assert day.date == today
      assert day.plan_id == nil
      assert day.targets == %{calories: nil, protein_g: nil, carbs_g: nil, fat_g: nil, fiber_g: nil}
      assert day.slots == []
      assert day.write_eligible == true
    end

    test "does not join mutable Programming for a past local date with no frozen Diary rows" do
      %{client: client, plan: plan} = covering_setup(start_offset: -7)
      past = Date.add(local_today(client), -1)

      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), past)
      assert day.date == past
      assert day.plan_id == nil
      assert day.slots == []
      assert day.write_eligible == true
      assert Repo.get!(Easy.Nutrition.Plan, plan.id).start_date != nil
    end

    test "orders ordinary Meal Slots before the workout group regardless of stored option order" do
      %{client: client} = covering_setup(menu: :ordered)
      today = local_today(client)

      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)
      assert Enum.map(day.slots, & &1.meal_slot) == [:breakfast, :post_workout]
    end

    test "lets a future local date be read as live guidance that is write-ineligible" do
      %{client: client, plan: plan} = covering_setup()
      future = Date.add(local_today(client), 1)

      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), future)
      assert day.plan_id == plan.id
      assert [%{meal_slot: :breakfast, rows: []}] = day.slots
      assert day.write_eligible == false
    end

    test "identifies today from the Client timezone with Business fallback" do
      business = insert(:business, timezone: "Pacific/Kiritimati")
      coach = insert(:coach, business: business)

      client =
        insert(:client,
          business: business,
          creator: coach,
          assigned_coach: coach,
          timezone: "UTC"
        )

      utc_today = LocalCalendar.to_local_date(DateTime.utc_now(), "UTC")
      assert {:ok, [day]} = Diary.list_client_nutrition_days(client_ctx(client), [])
      assert day.date == utc_today

      Repo.update_all(from(c in Easy.Clients.Client, where: c.id == ^client.id), set: [timezone: ""])
      client = Repo.get!(Easy.Clients.Client, client.id) |> Repo.preload(:business)
      kiritimati_today = LocalCalendar.to_local_date(DateTime.utc_now(), "Pacific/Kiritimati")

      assert {:ok, [fallback]} = Diary.list_client_nutrition_days(client_ctx(client), [])
      assert fallback.date == kiritimati_today
    end

    test "does not read leftover meal-log rows as Nutrition Day intake" do
      %{client: client, coach: coach, food: food} = covering_setup()
      today = local_today(client)

      log =
        insert(:meal_log,
          client: client,
          business: coach.business,
          date: today,
          meal_slot: "breakfast"
        )

      insert(:food_log_entry,
        meal_log: log,
        business: coach.business,
        food: food,
        food_name: "Leftover oats"
      )

      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)
      assert [%{rows: []}] = day.slots
    end
  end

  describe "coach and owner reads" do
    test "return the same Nutrition Day as the client" do
      %{client: client, coach: coach, plan: plan} = covering_setup()
      today = local_today(client)
      business = Repo.preload(coach.business, :owner)
      insert(:coach, user: business.owner, business: business)

      assert {:ok, client_day} = Diary.get_client_nutrition_day(client_ctx(client), today)
      assert {:ok, coach_day} = Diary.get_nutrition_day_for_client(trainer_ctx(coach), client.id, today)
      assert {:ok, owner_day} = Diary.get_nutrition_day_for_client(owner_ctx(business), client.id, today)

      assert client_day.plan_id == plan.id
      assert coach_day == client_day
      assert owner_day == client_day
    end

    test "conceals another tenant's client" do
      %{client: client} = covering_setup()
      other = insert(:coach)

      assert {:error, :not_found} =
               Diary.get_nutrition_day_for_client(trainer_ctx(other), client.id, local_today(client))
    end

    test "conceals a client the coach does not coach" do
      %{client: client, coach: coach} = covering_setup()
      peer = insert(:coach, business: coach.business)

      assert {:error, :not_found} =
               Diary.get_nutrition_day_for_client(trainer_ctx(peer), client.id, local_today(client))
    end
  end

  defp covering_setup(opts \\ []) do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
    food = insert(:food, business: coach.business, creator: coach, name: "Oats")
    ctx = trainer_ctx(coach)

    {:ok, template} =
      Programming.create_template(ctx, %{"name" => "Cut", "target_calories" => 2000.0})

    menu =
      case Keyword.get(opts, :menu) do
        :ordered -> ordered_menu(template, food)
        _ -> breakfast_menu(template, food)
      end

    {:ok, source} = Programming.replace_menu(ctx, template.id, 1, menu)
    today = local_today(client)
    start_date = Date.add(today, Keyword.get(opts, :start_offset, 0))

    {:ok, plan} =
      Programming.assign_template_to_client(ctx, client.id, source.id, 2, %{
        "start_date" => Date.to_iso8601(start_date),
        "end_date" => nil
      })

    %{coach: coach, client: client, food: food, plan: plan, today: today}
  end

  defp breakfast_menu(plan, food) do
    slot_menu(plan, food, [
      %{meal_slot: :breakfast, local_ref: "breakfast", name: "Breakfast", grams: 50}
    ])
  end

  defp ordered_menu(plan, food) do
    slot_menu(plan, food, [
      %{meal_slot: :post_workout, local_ref: "post", name: "Post workout", grams: 30},
      %{meal_slot: :breakfast, local_ref: "breakfast", name: "Breakfast", grams: 50}
    ])
  end

  defp slot_menu(plan, food, slots) do
    pattern = hd(plan.day_patterns)

    meals =
      Enum.with_index(slots, fn slot, position ->
        %{
          local_ref: slot.local_ref,
          name: slot.name,
          position: position,
          meal_items: [
            %{
              local_ref: "#{slot.local_ref}-item",
              kind: :food,
              food_id: food.id,
              position: 0,
              portion: %{kind: :gram, grams: slot.grams}
            }
          ]
        }
      end)

    options =
      Enum.map(slots, fn slot ->
        %{
          meal_slot: slot.meal_slot,
          options: [%{local_ref: "#{slot.local_ref}-opt", meal_local_ref: slot.local_ref, position: 0}]
        }
      end)

    %{
      meals: meals,
      day_patterns: [%{id: pattern.id, name: pattern.name, position: 0, slots: options}],
      schedule: Map.new(WeekSchedule.weekdays(), &{&1, pattern.id})
    }
  end

  defp client_ctx(client) do
    %Easy.Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
  end

  defp local_today(client) do
    timezone = LocalCalendar.applied_timezone(client.timezone, client.business && client.business.timezone)
    LocalCalendar.to_local_date(DateTime.utc_now(), timezone)
  end
end
