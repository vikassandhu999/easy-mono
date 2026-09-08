defmodule Easy.Nutrition.CanonicalSchemaTest do
  alias Easy.Nutrition.DiaryFixtures
  use Easy.DataCase, async: true
  alias Easy.Nutrition.{DiaryDay, Food, Menu}

  describe("canonical Nutrition Programming constraints") do
    test "the database rejects client-plan fields on a template" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_plans", [
          plan_row(coach,
            kind: "template",
            client_id: dump_uuid(client.id),
            start_date: ~D[2026-08-15]
          )
        ])
      end
    end

    test "the database rejects an unknown plan kind" do
      coach = insert(:coach)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_plans", [plan_row(coach, kind: "program")])
      end
    end

    test "the database requires a menu document with its root collections" do
      coach = insert(:coach)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_plans", [plan_row(coach, menu: %{})])
      end
    end

    test "an active client has at most one incomplete Client Plan" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      insert(:plan,
        business: coach.business,
        creator: coach.user,
        client: client,
        kind: :client_plan,
        start_date: nil,
        end_date: nil
      )

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_plans", [
          plan_row(coach,
            kind: "client_plan",
            client_id: dump_uuid(client.id),
            start_date: nil,
            end_date: nil
          )
        ])
      end
    end

    test "unarchived Client Plan Coverage cannot overlap, including an open-ended range" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      insert(:plan,
        business: coach.business,
        creator: coach.user,
        client: client,
        kind: :client_plan,
        start_date: ~D[2026-08-01],
        end_date: ~D[2026-08-31]
      )

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_plans", [
          plan_row(coach,
            kind: "client_plan",
            client_id: dump_uuid(client.id),
            start_date: ~D[2026-08-15],
            end_date: nil
          )
        ])
      end
    end

    test "adjacent non-overlapping Coverage is accepted" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      insert(:plan,
        business: coach.business,
        creator: coach.user,
        client: client,
        kind: :client_plan,
        start_date: ~D[2026-08-01],
        end_date: ~D[2026-08-31]
      )

      {1, _} =
        Repo.insert_all("nutrition_plans", [
          plan_row(coach,
            kind: "client_plan",
            client_id: dump_uuid(client.id),
            start_date: ~D[2026-09-01],
            end_date: nil
          )
        ])
    end
  end

  describe("Library structural foreign keys") do
    test "Recipe Ingredients restrict Food deletion" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach)
      recipe = insert(:recipe, business: coach.business, creator: coach)

      insert(:recipe_ingredient,
        business: coach.business,
        recipe: recipe,
        food: food,
        portion: %{kind: :gram, grams: 100.0}
      )

      assert_raise Ecto.ConstraintError, fn -> Repo.delete!(Repo.get!(Food, food.id)) end
    end

    test "Diary entries retain source identity after Food deletion" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      food =
        insert(:food,
          business: coach.business,
          creator: coach,
          name: "Banana",
          calories_per_100g: 90.0
        )

      today = Date.utc_today()

      client_ctx = %Easy.Ctx{
        business_id: client.business_id,
        user_id: client.user_id,
        client_id: client.id
      }

      assert {:ok, day} =
               DiaryFixtures.save_extra(
                 client_ctx,
                 today,
                 %{meal_slot: :breakfast, food_id: food.id, portion: %{kind: :gram, grams: 100.0}}
               )

      entry = hd(day.slots).rows |> Enum.find(& &1.entry_id)
      Repo.delete!(Repo.get!(Food, food.id))
      kept = DiaryFixtures.stored_entry(client, entry.id)
      assert kept.food_id == food.id
      assert kept.name == "Banana"
    end
  end

  describe "Diary slot storage" do
    test "the database rejects a duplicate slot identity" do
      client = insert(:client)
      date = Date.utc_today()
      Repo.insert_all("nutrition_diary_slots", [diary_slot_row(client, date)])

      error =
        assert_raise Postgrex.Error, fn ->
          Repo.insert_all("nutrition_diary_slots", [diary_slot_row(client, date)])
        end

      assert error.postgres.code == :unique_violation
    end

    test "a slot cannot refer to another client's day" do
      client = insert(:client)
      other = insert(:client, business: client.business)
      date = Date.utc_today()
      slot = diary_slot_row(client, date)
      other_day = diary_slot_row(other, date).nutrition_diary_day_id

      error =
        assert_raise Postgrex.Error, fn ->
          Repo.insert_all("nutrition_diary_slots", [%{slot | nutrition_diary_day_id: other_day}])
        end

      assert error.postgres.constraint == "nutrition_diary_slots_day_identity_fkey"
    end

    for invalid <- [%{}, %{meal_id: nil, options: nil, entries: []}, %{meal_id: nil, options: [], entries: %{}}] do
      @invalid invalid
      test "the database rejects malformed document #{inspect(@invalid)}" do
        client = insert(:client)
        row = diary_slot_row(client, Date.utc_today(), document: @invalid)
        error = assert_raise Postgrex.Error, fn -> Repo.insert_all("nutrition_diary_slots", [row]) end
        assert error.postgres.constraint == "nutrition_diary_slots_document_check"
      end
    end
  end

  defp plan_row(coach, overrides) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          kind: "template",
          name: "Row",
          menu: Menu.format(Menu.empty()),
          revision: 1,
          business_id: dump_uuid(coach.business_id),
          creator_id: dump_uuid(coach.user_id)
        },
        Map.new(overrides)
      )
    )
  end

  defp timestamps(attrs) do
    now = DateTime.utc_now(:second)
    Map.merge(%{inserted_at: now, updated_at: now}, attrs)
  end

  defp diary_slot_row(client, date, overrides \\ []) do
    query = DiaryDay.for_date(client.business_id, client.id, date)
    day = Repo.one(query) || Repo.insert!(%DiaryDay{business_id: client.business_id, client_id: client.id, local_date: date})

    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          document: %{meal_id: nil, options: [], entries: []},
          nutrition_diary_day_id: dump_uuid(day.id),
          local_date: date,
          meal_slot: "breakfast",
          applied_timezone: "Asia/Kolkata",
          has_coverage: false,
          revision: 1,
          business_id: dump_uuid(client.business_id),
          client_id: dump_uuid(client.id)
        },
        Map.new(overrides)
      )
    )
  end

  defp dump_uuid(uuid \\ Ecto.UUID.generate()) do
    Ecto.UUID.dump!(uuid)
  end
end
