defmodule Easy.Nutrition.LoggingConcurrencyTest do
  use ExUnit.Case, async: false
  import Easy.Factory
  import Ecto.Query
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Nutrition
  alias Easy.Nutrition.{NutritionLog, NutritionPreset, NutritionSchedule}
  alias Easy.NutritionLogs
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)
    client = insert(:client, timezone: "Etc/UTC")
    food = insert(:food, business: client.business)
    coach = Ctx.new(client.business_id, client.coach.user_id, client.coach_id, false)
    ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
    today = Date.utc_today()
    assert {:ok, %{data: preset}} = Nutrition.create_preset_for_client(coach, client.id, %{type: :food, food_id: food.id, amount: 100, unit: "g"})
    schedule = NutritionSchedule.insert_changeset(client.business_id, client.id, preset.id, %{weekdays_mask: 127, from_date: today}) |> Repo.insert!()

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      Repo.delete_all(CoachingTerm.for_business(client.business_id))
      Repo.delete!(client)
      Repo.delete!(food)
      Repo.delete!(client.coach)
      Repo.delete!(client.business)
      Repo.delete!(client.user)
      Repo.delete!(client.coach.user)
      Repo.delete!(client.business.owner)
    end)

    input = %{logged_on: today, nutrition_schedule_id: schedule.id, scheduled_date: today, food_logs: [%{food_id: food.id, amount: 100, unit: "g"}]}
    %{ctx: ctx, coach: coach, client: client, preset: preset, schedule: schedule, input: input, today: today}
  end

  @tag criticality: 10
  test "simultaneous saves claim one occurrence only", f do
    # WHY: Double taps or requests from two devices must not create duplicate intake.
    results =
      concurrently([
        fn -> NutritionLogs.create_client_nutrition_log(f.ctx, f.input) end,
        fn -> NutritionLogs.create_client_nutrition_log(f.ctx, f.input) end
      ])

    assert Enum.count(results, &match?({:ok, _}, &1)) == 1
    assert Enum.count(results, &(&1 == {:error, :conflict})) == 1
    assert Repo.aggregate(NutritionLog.for_client(f.ctx.business_id, f.client.id), :count) == 1
  end

  @tag criticality: 10
  test "logging and a coach edit share the same client lock", f do
    # WHY: A coach content change must preserve the prescription if logging wins the race.
    [log_result, edit_result] =
      concurrently([
        fn -> NutritionLogs.create_client_nutrition_log(f.ctx, f.input) end,
        fn -> Nutrition.update_preset_for_client(f.coach, f.client.id, f.preset.id, %{amount: 200}) end
      ])

    assert {:ok, log} = log_result
    assert {:ok, %{data: edited}} = edit_result
    assert log.nutrition_preset_id == f.preset.id
    old = Repo.get!(NutritionPreset, f.preset.id)
    assert old.amount == if(edited.id == old.id, do: 200, else: 100)

    if edited.id != old.id do
      assert Repo.get!(NutritionSchedule, f.schedule.id).until_date == f.today
      next = Repo.one!(from(s in NutritionSchedule, where: s.nutrition_preset_id == ^edited.id))
      assert next.from_date == Date.add(f.today, 1)
    end
  end

  defp concurrently(operations) do
    parent = self()

    tasks =
      Enum.map(operations, fn operation ->
        Task.async(fn ->
          Sandbox.checkout(Repo, sandbox: false)
          send(parent, {:ready, self()})

          receive do
            :go -> operation.()
          end
        end)
      end)

    workers =
      Enum.map(tasks, fn _ ->
        receive do
          {:ready, pid} -> pid
        after
          5000 -> flunk("concurrent nutrition writer did not become ready")
        end
      end)

    Enum.each(workers, &send(&1, :go))
    Enum.map(tasks, &Task.await(&1, 5000))
  end
end
