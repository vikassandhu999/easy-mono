defmodule Easy.Nutrition.DiaryFixtures do
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.LocalCalendar
  alias Easy.Nutrition.{Diary, Food, Plan, Programming, WeekSchedule}
  alias Easy.Orgs.Coach

  import Easy.Factory

  @type covering_result() :: %{
          coach: Coach.t(),
          client: Client.t(),
          food: Food.t(),
          plan: Plan.t(),
          today: Date.t()
        }

  @spec covering_setup(keyword()) :: covering_result()
  def covering_setup(opts \\ []) do
    coach = insert(:coach)

    client =
      insert(:client,
        business: coach.business,
        creator: coach,
        assigned_coach: coach,
        timezone: Keyword.get(opts, :timezone)
      )

    food = insert(:food, business: coach.business, creator: coach, name: "Oats")
    ctx = Easy.DataCase.trainer_ctx(coach)

    {:ok, template} =
      Programming.create_template(ctx, %{"name" => "Cut", "target_calories" => 2000.0})

    menu =
      case Keyword.get(opts, :menu) do
        :ordered -> ordered_menu(template, food)
        :two_options -> two_option_menu(template, food)
        :two_same_food -> two_same_food_menu(template, food)
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

  @spec live_planned_item_ref(Client.t(), Date.t()) :: String.t()
  def live_planned_item_ref(client, date), do: hd(live_planned_item_refs(client, date))

  @spec live_planned_item_refs(Client.t(), Date.t()) :: [String.t()]
  def live_planned_item_refs(client, date) do
    {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), date)

    day.slots
    |> hd()
    |> Map.fetch!(:options)
    |> hd()
    |> Map.fetch!(:items)
    |> Enum.map(& &1.planned_item_ref)
  end

  @spec extra_attrs(Food.t(), keyword()) :: Diary.add_extra_input()
  def extra_attrs(food, opts \\ []) do
    %{
      meal_slot: Keyword.get(opts, :slot, :breakfast),
      food_id: food.id,
      portion: %{kind: :gram, grams: Keyword.get(opts, :grams, 50.0)}
    }
  end

  @spec extra_path(Date.t()) :: String.t()
  def extra_path(date), do: "/v1/client/nutrition-days/#{Date.to_iso8601(date)}/extras"

  @spec extra_payload(Diary.add_extra_input()) :: map()
  def extra_payload(attrs) do
    %{
      meal_slot: attrs.meal_slot,
      food_id: attrs.food_id,
      recipe_id: nil,
      portion: attrs.portion,
      notes: nil
    }
  end

  @spec client_ctx(Client.t()) :: Ctx.t()
  def client_ctx(client) do
    %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
  end

  @spec local_today(Client.t()) :: Date.t()
  def local_today(client) do
    timezone = LocalCalendar.applied_timezone(client.timezone, client.business && client.business.timezone)
    LocalCalendar.to_local_date(DateTime.utc_now(), timezone)
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

  defp two_option_menu(plan, food) do
    pattern = hd(plan.day_patterns)

    %{
      meals: [
        %{
          local_ref: "a",
          name: "Breakfast A",
          position: 0,
          meal_items: [
            %{local_ref: "a-item", kind: :food, food_id: food.id, position: 0, portion: %{kind: :gram, grams: 50}}
          ]
        },
        %{
          local_ref: "b",
          name: "Breakfast B",
          position: 1,
          meal_items: [
            %{local_ref: "b-item", kind: :food, food_id: food.id, position: 0, portion: %{kind: :gram, grams: 40}}
          ]
        }
      ],
      day_patterns: [
        %{
          id: pattern.id,
          name: pattern.name,
          position: 0,
          slots: [
            %{
              meal_slot: :breakfast,
              options: [
                %{local_ref: "opt-a", meal_local_ref: "a", position: 0},
                %{local_ref: "opt-b", meal_local_ref: "b", position: 1}
              ]
            }
          ]
        }
      ],
      schedule: Map.new(WeekSchedule.weekdays(), &{&1, pattern.id})
    }
  end

  defp two_same_food_menu(plan, food) do
    pattern = hd(plan.day_patterns)

    %{
      meals: [
        %{
          local_ref: "breakfast",
          name: "Breakfast",
          position: 0,
          meal_items: [
            %{local_ref: "oats-1", kind: :food, food_id: food.id, position: 0, portion: %{kind: :gram, grams: 50}},
            %{local_ref: "oats-2", kind: :food, food_id: food.id, position: 1, portion: %{kind: :gram, grams: 30}}
          ]
        }
      ],
      day_patterns: [
        %{
          id: pattern.id,
          name: pattern.name,
          position: 0,
          slots: [
            %{meal_slot: :breakfast, options: [%{local_ref: "opt", meal_local_ref: "breakfast", position: 0}]}
          ]
        }
      ],
      schedule: Map.new(WeekSchedule.weekdays(), &{&1, pattern.id})
    }
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
end
