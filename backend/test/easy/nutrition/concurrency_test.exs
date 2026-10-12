defmodule Easy.Nutrition.ConcurrencyTest do
  use ExUnit.Case, async: false
  import Easy.Factory
  import Ecto.Query
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Nutrition
  alias Easy.Nutrition.{NutritionTargets, TargetSchedule}
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)
    client = insert(:client, timezone: "Etc/UTC")
    ctx = Ctx.new(client.business_id, client.coach.user_id, client.coach_id, false)

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      Repo.delete_all(TargetSchedule.for_client(client.business_id, client.id))
      Repo.delete_all(NutritionTargets.for_client(client.business_id, client.id))
      Repo.delete_all(CoachingTerm.for_business(client.business_id))
      Repo.delete!(client)
      Repo.delete!(client.coach)
      Repo.delete!(client.business)
      Repo.delete!(client.user)
      Repo.delete!(client.coach.user)
      Repo.delete!(client.business.owner)
    end)

    %{client: client, ctx: ctx}
  end

  @tag criticality: 10
  test "simultaneous target assignments leave one applicable complete set", f do
    # WHY: Separate coach requests must not commit overlapping target schedules.
    sets =
      for name <- ["First", "Second"] do
        assert {:ok, %{data: set}} =
                 Nutrition.create_targets_for_client(f.ctx, f.client.id, %{
                   name: name,
                   targets: %{energy_kcal: %{min: 2000}}
                 })

        set
      end

    parent = self()

    tasks =
      Enum.map(sets, fn set ->
        Task.async(fn ->
          Sandbox.checkout(Repo, sandbox: false)
          send(parent, {:ready, self()})

          receive do
            :go -> Nutrition.assign_targets_for_client(f.ctx, f.client.id, 1, %{nutrition_targets_id: set.id})
          end
        end)
      end)

    workers =
      for _ <- tasks do
        receive do
          {:ready, pid} -> pid
        after
          5000 -> flunk("concurrent target writer did not become ready")
        end
      end

    Enum.each(workers, &send(&1, :go))
    results = Enum.map(tasks, &Task.await(&1, 5000))
    assert Enum.all?(results, &match?({:ok, _}, &1))
    assert [row] = TargetSchedule.for_client(f.ctx.business_id, f.client.id) |> Repo.all()
    assert row.weekdays_mask == 1
    assert Repo.get!(NutritionTargets, row.nutrition_targets_id).name in ["First", "Second"]

    assert Repo.aggregate(
             from(s in TargetSchedule, where: s.business_id == ^f.ctx.business_id and s.client_id == ^f.client.id),
             :count
           ) == 1
  end
end
