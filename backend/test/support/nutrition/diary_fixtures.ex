defmodule Easy.Nutrition.DiaryFixtures do
  import Easy.Nutrition.ProgrammingMenuFixtures, only: [uuid: 1]
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.LocalCalendar
  alias Easy.Nutrition.{Diary, DiarySlot, Food, Menu, Plan, Programming}
  alias Easy.Orgs.Coach

  import Easy.Factory

  @spec get_client_nutrition_day(Ctx.t(), Date.t()) ::
          {:ok, Easy.Nutrition.Day.t()} | {:error, Diary.DayAssembler.list_error()}
  def get_client_nutrition_day(%Ctx{} = ctx, %Date{} = date) do
    with {:ok, %{nutrition_days: [day]}} <- Diary.list_client_nutrition_days(ctx, date: date) do
      {:ok, day}
    end
  end

  @spec get_nutrition_day_for_client(Ctx.t(), String.t(), Date.t()) ::
          {:ok, Easy.Nutrition.Day.t()} | {:error, Diary.DayAssembler.list_error()}
  def get_nutrition_day_for_client(%Ctx{} = ctx, client_id, %Date{} = date) do
    with {:ok, %{nutrition_days: [day]}} <-
           Diary.list_nutrition_days_for_client(ctx, client_id, date: date) do
      {:ok, day}
    end
  end

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
      Programming.assign_template_to_client(ctx, client.id, source.id, %{
        "start_date" => Date.to_iso8601(start_date),
        "end_date" => nil
      })

    %{coach: coach, client: client, food: food, plan: plan, today: today}
  end

  @spec live_planned_item_ref(Client.t(), Date.t()) :: String.t()
  def live_planned_item_ref(client, date), do: hd(live_planned_item_refs(client, date))

  @spec live_planned_item_refs(Client.t(), Date.t()) :: [String.t()]
  def live_planned_item_refs(client, date) do
    {:ok, day} = get_client_nutrition_day(client_ctx(client), date)

    day.slots
    |> hd()
    |> Map.fetch!(:options)
    |> hd()
    |> Map.fetch!(:items)
    |> Enum.map(& &1.planned_item_ref)
  end

  @spec extra_attrs(Food.t(), keyword()) :: map()
  def extra_attrs(food, opts \\ []) do
    %{
      meal_slot: Keyword.get(opts, :slot, :breakfast),
      food_id: food.id,
      portion: %{kind: :gram, grams: Keyword.get(opts, :grams, 50.0)}
    }
  end

  @spec slot_draft(map(), boolean()) :: map()
  def slot_draft(slot, include_pending \\ false) do
    %{
      meal_slot: slot.meal_slot,
      meal_id: slot.meal_id,
      expected_revision: slot.revision,
      entries:
        slot.rows
        |> Enum.filter(&(include_pending or not is_nil(&1.entry_id)))
        |> Enum.map(&entry_draft/1)
    }
  end

  @spec entry_draft(map()) :: map()
  def entry_draft(row) do
    row
    |> Map.take([:planned_item_ref, :food_id, :recipe_id, :portion, :notes])
    |> Map.put(:id, row.entry_id || Ecto.UUID.generate())
  end

  @spec save_extra(Ctx.t(), Date.t(), map()) :: tuple()
  def save_extra(ctx, date, attrs) do
    with {:ok, day} <- get_client_nutrition_day(ctx, date) do
      slot = Enum.find(day.slots, &(&1.meal_slot == attrs.meal_slot))

      draft =
        if slot,
          do: slot_draft(slot),
          else: %{meal_slot: attrs.meal_slot, meal_id: nil, expected_revision: 0, entries: []}

      entry =
        Map.merge(
          %{
            id: Ecto.UUID.generate(),
            planned_item_ref: nil,
            food_id: nil,
            recipe_id: nil,
            notes: nil
          },
          Map.delete(attrs, :meal_slot)
        )

      Diary.save_client_nutrition_day(ctx, date, %{
        slots: [%{draft | entries: draft.entries ++ [entry]}]
      })
    end
  end

  @spec save_planned_slot(Ctx.t(), Date.t(), map()) :: tuple()
  def save_planned_slot(ctx, date, attrs) do
    with {:ok, day} <- get_client_nutrition_day(ctx, date) do
      case Enum.find(day.slots, &(&1.meal_slot == attrs.meal_slot)) do
        nil -> {:error, :cannot_start_past_slot}
        slot -> Diary.save_client_nutrition_day(ctx, date, %{slots: [slot_draft(slot, true)]})
      end
    end
  end

  @spec save_option(Ctx.t(), Date.t(), map()) :: tuple()
  def save_option(ctx, date, attrs) do
    with {:ok, day} <- get_client_nutrition_day(ctx, date) do
      case Enum.find(day.slots, &(&1.meal_slot == attrs.meal_slot)) do
        nil ->
          {:error, :not_found}

        slot ->
          Diary.save_client_nutrition_day(ctx, date, %{slots: [Map.merge(slot_draft(slot), attrs)]})
      end
    end
  end

  @spec client_ctx(Client.t()) :: Ctx.t()
  def client_ctx(client) do
    %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
  end

  @spec local_today(Client.t()) :: Date.t()
  def local_today(client) do
    timezone =
      LocalCalendar.applied_timezone(client.timezone, client.business && client.business.timezone)

    LocalCalendar.to_local_date(DateTime.utc_now(), timezone)
  end

  defp breakfast_menu(plan, food) do
    slot_menu(plan, food, [
      %{meal_slot: :breakfast, id: uuid("breakfast"), name: "Breakfast", grams: 50}
    ])
  end

  defp ordered_menu(plan, food) do
    slot_menu(plan, food, [
      %{meal_slot: :post_workout, id: uuid("post"), name: "Post workout", grams: 30},
      %{meal_slot: :breakfast, id: uuid("breakfast"), name: "Breakfast", grams: 50}
    ])
  end

  defp two_option_menu(plan, food) do
    pattern = hd(plan.menu.day_patterns)

    %{
      meals: [
        %{
          id: uuid("a"),
          name: "Breakfast A",
          meal_items: [
            %{id: uuid("a-item"), kind: :food, food_id: food.id, portion: %{kind: :gram, grams: 50}}
          ]
        },
        %{
          id: uuid("b"),
          name: "Breakfast B",
          meal_items: [
            %{id: uuid("b-item"), kind: :food, food_id: food.id, portion: %{kind: :gram, grams: 40}}
          ]
        }
      ],
      day_patterns: [
        %{
          id: pattern.id,
          name: pattern.name,
          slots: [
            %{
              meal_slot: :breakfast,
              meal_ids: [uuid("a"), uuid("b")]
            }
          ]
        }
      ],
      schedule: Map.new(Menu.weekdays(), &{&1, pattern.id})
    }
  end

  defp two_same_food_menu(plan, food) do
    pattern = hd(plan.menu.day_patterns)

    %{
      meals: [
        %{
          id: uuid("breakfast"),
          name: "Breakfast",
          meal_items: [
            %{
              id: uuid("oats-1"),
              kind: :food,
              food_id: food.id,
              portion: %{kind: :gram, grams: 50}
            },
            %{id: uuid("oats-2"), kind: :food, food_id: food.id, portion: %{kind: :gram, grams: 30}}
          ]
        }
      ],
      day_patterns: [
        %{
          id: pattern.id,
          name: pattern.name,
          slots: [
            %{
              meal_slot: :breakfast,
              meal_ids: [uuid("breakfast")]
            }
          ]
        }
      ],
      schedule: Map.new(Menu.weekdays(), &{&1, pattern.id})
    }
  end

  defp slot_menu(plan, food, slots) do
    pattern = hd(plan.menu.day_patterns)

    meals =
      Enum.map(slots, fn slot ->
        %{
          id: slot.id,
          name: slot.name,
          meal_items: [
            %{
              id: uuid("#{slot.id}-item"),
              kind: :food,
              food_id: food.id,
              portion: %{kind: :gram, grams: slot.grams}
            }
          ]
        }
      end)

    options =
      Enum.map(slots, fn slot ->
        %{
          meal_slot: slot.meal_slot,
          meal_ids: [slot.id]
        }
      end)

    %{
      meals: meals,
      day_patterns: [%{id: pattern.id, name: pattern.name, slots: options}],
      schedule: Map.new(Menu.weekdays(), &{&1, pattern.id})
    }
  end

  @spec move_slot_date(Easy.Nutrition.DiarySlot.t(), Date.t()) :: Easy.Nutrition.DiarySlot.t()
  def move_slot_date(slot, date) do
    day = Easy.Repo.get!(Easy.Nutrition.DiaryDay, slot.nutrition_diary_day_id)
    attrs = day |> Map.from_struct() |> Map.drop([:id, :__meta__, :business, :client, :inserted_at, :updated_at]) |> Map.put(:local_date, date)
    shifted = Easy.Repo.insert!(struct!(Easy.Nutrition.DiaryDay, attrs))
    Easy.Repo.update!(Ecto.Changeset.change(slot, local_date: date, nutrition_diary_day_id: shifted.id))
  end

  @spec stored_entries(Client.t()) :: [Easy.Nutrition.DiarySlot.Entry.t()]
  def stored_entries(client) do
    DiarySlot.for_client(client.business_id, client.id)
    |> Easy.Repo.all()
    |> Enum.flat_map(& &1.document.entries)
  end

  @spec stored_entry(Client.t(), String.t()) :: Easy.Nutrition.DiarySlot.Entry.t() | nil
  def stored_entry(client, id), do: Enum.find(stored_entries(client), &(&1.id == id))
end
